/* =========================================================
   THE AMAZING DIGITAL CIRCUS — IMMERSION SITE
   App.js — чистый Vanilla JS. Никаких библиотек.

   Содержит:
     1. Глитч-заголовок: подмена символов на hover
     2. Кейн: глаза следят за курсором + "ломаются" при рывке
     3. Убегающая кнопка ВЫХОД: телепорт на mouseover, alert
     4. Глобальный сбой при клике на интерактивный элемент
     5. Утилиты (clamp, randInt, debounce-аналоги)
   ========================================================= */
(() => {
  "use strict";

  /* ---------- 0. УТИЛИТЫ ---------- */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* Уважение к prefers-reduced-motion */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     1. ГЛИТЧ-ЗАГОЛОВОК
     При наведении — подменяем буквы случайными "глитч-символами"
     каждые ~50мс, при уходе курсора — восстанавливаем оригинал.
     ========================================================= */
  const GLITCH_CHARS = "!@#$%^&*<>?/\\|{}[]█▓▒░◆◇★☆♥♦♣♠ЖЗЯЪЫЬΞΩΨλΣ¤";
  const titleEl = document.getElementById("glitchTitle");

  const startTextGlitch = (el) => {
    /* Кэшируем оригинал ОДИН РАЗ — иначе после нескольких циклов
       мы будем "восстанавливать" уже искажённый текст. */
    if (el.dataset.text == null || el.dataset.text === "") {
      el.dataset.text = el.textContent;
    }
    const original = el.dataset.text;
    if (el.dataset.glitching === "1") return;
    el.dataset.glitching = "1";

    let frame = 0;
    const tick = () => {
      if (el.dataset.glitching !== "1") return;
      // Чем дольше держится hover, тем "хаотичнее" подмена
      frame++;
      const chars = original.split("");
      const noisy = chars.map((c) => {
        if (c === " ") return " ";
        // подменяем ~35% символов на каждом кадре
        if (Math.random() < 0.35) {
          return GLITCH_CHARS[randInt(0, GLITCH_CHARS.length - 1)];
        }
        return c;
      });
      el.textContent = noisy.join("");
      el._glitchTimer = setTimeout(tick, 55);
    };
    tick();
  };

  const stopTextGlitch = (el) => {
    el.dataset.glitching = "0";
    if (el._glitchTimer) clearTimeout(el._glitchTimer);
    if (el.dataset.text != null && el.dataset.text !== "") {
      el.textContent = el.dataset.text;
    }
  };

  /* Заранее закэшируем оригинальный текст у всех glitchable элементов,
     чтобы мы могли надёжно восстановить его, даже если timer переживёт mouseleave. */
  $$("[data-glitchable]").forEach((el) => {
    if (el.dataset.text == null || el.dataset.text === "") {
      el.dataset.text = el.textContent;
    }
  });

  if (titleEl && !reduceMotion) {
    titleEl.addEventListener("mouseenter", () => startTextGlitch(titleEl));
    titleEl.addEventListener("mouseleave", () => stopTextGlitch(titleEl));
    /* Также периодически "сбойнём" сам по себе раз в 6–10 сек */
    const ambient = () => {
      startTextGlitch(titleEl);
      setTimeout(() => stopTextGlitch(titleEl), 380);
      setTimeout(ambient, randInt(6000, 11000));
    };
    setTimeout(ambient, 4000);
  }

  /* Подобный glitch для остальных подписей по hover */
  $$("[data-glitchable]").forEach((el) => {
    if (el === titleEl) return;
    el.addEventListener("mouseenter", () => startTextGlitch(el));
    el.addEventListener("mouseleave", () => stopTextGlitch(el));
  });

  /* =========================================================
     2. КЕЙН СЛЕДИТ ЗА КУРСОРОМ
     Глаза — два <g> внутри SVG; зрачки сдвигаем translate
     относительно центра глаза, исходя из вектора курсор→центр.
     При резком рывке — добавляем класс .is-broken на 700мс.
     ========================================================= */
  const caine    = document.getElementById("caine");
  const eyeL     = document.getElementById("caineEyeL");
  const eyeR     = document.getElementById("caineEyeR");
  const pupilL   = eyeL && eyeL.querySelector(".caine__pupil");
  const pupilR   = eyeR && eyeR.querySelector(".caine__pupil");
  const shineL   = eyeL && eyeL.querySelector(".caine__shine");
  const shineR   = eyeR && eyeR.querySelector(".caine__shine");

  const PUPIL_RADIUS = 18; // макс. сдвиг зрачка внутри глаза, в локальных SVG-единицах

  /* Кэшируем геометрию SVG, обновляем на resize/scroll */
  let caineRect = null;
  let svgScale  = 1;
  const measure = () => {
    if (!caine) return;
    const svg = caine.querySelector(".caine__svg");
    if (!svg) return;
    caineRect = svg.getBoundingClientRect();
    // viewBox 600 — единая система; отношение px → svg-units
    svgScale = caineRect.width / 600;
  };
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("scroll", measure, { passive: true });

  /* Скорость движения курсора — для эффекта "сломанных глаз" */
  let lastX = 0, lastY = 0, lastT = 0;
  let breakTimer = null;

  const onMove = (e) => {
    if (!caineRect) measure();
    if (!caineRect || !pupilL || !pupilR) return;

    const cx = e.clientX;
    const cy = e.clientY;

    /* --- скорость курсора (px/мс) --- */
    const now = performance.now();
    const dt  = Math.max(1, now - lastT);
    const dx  = cx - lastX;
    const dy  = cy - lastY;
    const speed = Math.hypot(dx, dy) / dt; // ~0..3+ при резких рывках
    lastX = cx; lastY = cy; lastT = now;

    if (speed > 2.2 && !reduceMotion) {
      caine.classList.add("is-broken");
      if (breakTimer) clearTimeout(breakTimer);
      breakTimer = setTimeout(() => caine.classList.remove("is-broken"), 700);
    }

    /* --- куда смотрят глаза --- */
    const computeOffset = (eyeCenterPxX, eyeCenterPxY) => {
      const vx = cx - eyeCenterPxX;
      const vy = cy - eyeCenterPxY;
      const dist = Math.hypot(vx, vy) || 1;
      const k = Math.min(1, dist / 300); // дальше курсор — тем сильнее (но с потолком)
      const ox = (vx / dist) * PUPIL_RADIUS * k;
      const oy = (vy / dist) * PUPIL_RADIUS * k;
      return { ox, oy };
    };

    /* Центры глаз в координатах окна:
       SVG viewBox: левый глаз translate(210,250), правый (390,250). */
    const leftCenter  = {
      x: caineRect.left + 210 * svgScale,
      y: caineRect.top  + 250 * svgScale,
    };
    const rightCenter = {
      x: caineRect.left + 390 * svgScale,
      y: caineRect.top  + 250 * svgScale,
    };

    const L = computeOffset(leftCenter.x,  leftCenter.y);
    const R = computeOffset(rightCenter.x, rightCenter.y);

    pupilL.setAttribute("transform", `translate(${L.ox.toFixed(2)} ${L.oy.toFixed(2)})`);
    pupilR.setAttribute("transform", `translate(${R.ox.toFixed(2)} ${R.oy.toFixed(2)})`);
    /* Блик чуть отстаёт, имитируя стекло */
    if (shineL) shineL.setAttribute("transform", `translate(${(L.ox * .6).toFixed(2)} ${(L.oy * .6).toFixed(2)})`);
    if (shineR) shineR.setAttribute("transform", `translate(${(R.ox * .6).toFixed(2)} ${(R.oy * .6).toFixed(2)})`);
  };

  if (caine && pupilL && pupilR) {
    document.addEventListener("mousemove", onMove, { passive: true });
    /* На тачах курсора нет — фиксируем взгляд в случайные точки */
    if (window.matchMedia("(pointer: coarse)").matches) {
      const wander = () => {
        const fakeX = randInt(0, window.innerWidth);
        const fakeY = randInt(0, window.innerHeight);
        onMove({ clientX: fakeX, clientY: fakeY });
        setTimeout(wander, randInt(900, 2200));
      };
      wander();
    }
  }

  /* =========================================================
     3. УБЕГАЮЩАЯ КНОПКА «ВЫХОД»
     На mouseover (или приближение курсора) — перепрыгивает в
     случайную точку. На click — alert.
     ========================================================= */
  const exitBtn = document.getElementById("exitButton");
  let fleeCount = 0;

  const teleportExit = () => {
    if (!exitBtn) return;
    const pad = 24;
    const w   = exitBtn.offsetWidth;
    const h   = exitBtn.offsetHeight;

    // Безопасные диапазоны, чтобы кнопка не уезжала за экран
    const maxX = clamp(window.innerWidth  - w - pad, pad, window.innerWidth);
    const maxY = clamp(window.innerHeight - h - pad, pad, window.innerHeight);

    const x = randInt(pad, maxX);
    const y = randInt(pad, maxY);

    exitBtn.classList.add("is-fleeing");
    exitBtn.style.left = x + "px";
    exitBtn.style.top  = y + "px";

    fleeCount++;
    if (fleeCount > 6) exitBtn.classList.add("is-panicked");
  };

  if (exitBtn) {
    exitBtn.addEventListener("mouseover", teleportExit);
    /* Дополнительный "телепорт", когда курсор просто близко (не доводим до hover) */
    document.addEventListener("mousemove", (e) => {
      if (!exitBtn.classList.contains("is-fleeing")) return; // пока не убегала — не паникуем заранее
      const r = exitBtn.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < 90) teleportExit();
    });

    exitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      alert("ОТСЮДА НЕТ ВЫХОДА!");
    });

    /* Поддержка клавиатуры — Tab + Enter работают; никаких сюрпризов */
    exitBtn.addEventListener("focus", () => {
      // Не убегаем при focus (доступность), но визуально подсвечиваем
      exitBtn.classList.add("is-panicked");
    });
    exitBtn.addEventListener("blur", () => exitBtn.classList.remove("is-panicked"));
  }

  /* =========================================================
     4. ГЛОБАЛЬНЫЙ СБОЙ ПРИ КЛИКЕ
     Любой клик по интерактивному элементу — на 0.7с включаем
     CRT-шум и RGB-сдвиг (через .is-firing).
     ========================================================= */
  const glitchLayer = document.getElementById("globalGlitch");

  const fireGlobalGlitch = () => {
    if (!glitchLayer || reduceMotion) return;
    glitchLayer.classList.add("is-firing");
    clearTimeout(glitchLayer._t);
    glitchLayer._t = setTimeout(() => glitchLayer.classList.remove("is-firing"), 700);
  };

  const interactiveSelector = "button, a, .card, .glitch-title, .caine, [data-glitchable]";
  document.addEventListener("click", (e) => {
    const t = e.target.closest(interactiveSelector);
    if (t) fireGlobalGlitch();
  });

  /* =========================================================
     5. МЕЛОЧИ
     ========================================================= */
  /* Build id — небольшая мистика */
  const buildEl = document.getElementById("buildId");
  if (buildEl) {
    const id = `${randInt(0, 9)}.${randInt(0, 9)}.${randInt(0, 99)
      .toString()
      .padStart(2, "0")}`;
    buildEl.textContent = id;
  }

  /* Если пользователь долго ничего не делает — однократно "сбойнём" сами,
     чтобы напомнить, что система нестабильна. */
  let idle;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      fireGlobalGlitch();
      if (titleEl) {
        startTextGlitch(titleEl);
        setTimeout(() => stopTextGlitch(titleEl), 600);
      }
    }, 12000);
  };
  ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
    window.addEventListener(ev, resetIdle, { passive: true })
  );
  resetIdle();
})();
