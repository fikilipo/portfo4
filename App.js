/* =========================================================
   THE AMAZING DIGITAL CIRCUS — IMMERSION SITE
   App.js  —  vanilla JS

   Что внутри:
     - GlitchTitle  : подмена символов на hover + амбиент
     - Eyes         : два независимых глаза, лаговое слежение,
                      рассинхрон, периодические дёрганья
     - ExitButton   : умная кнопка — фейки, паузы, ловится на
                      скорости, при 6 попаданиях ломает сайт
     - Corruption   : общий уровень «деградации» 0..6,
                      управляет CSS через data-corruption
     - GlobalGlitch : мигающий CRT-сбой на клик по интерактиву
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- утилиты ---------------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const body = document.body;

  /* =========================================================
     CORRUPTION — общий «уровень развала» 0..6
     ========================================================= */
  const corruption = {
    level: 0,
    fillEl: $("#corruptionFill"),
    valEl:  $("#corruptionVal"),
    set(v) {
      this.level = clamp(v, 0, 6);
      body.dataset.corruption = String(this.level);
      const pct = (this.level / 6) * 100;
      if (this.fillEl) this.fillEl.style.inset = `0 ${100 - pct}% 0 0`;
      if (this.valEl)  this.valEl.textContent = String(this.level * 16).padStart(2, "0");
      if (this.level >= 6) triggerAbstraction();
    },
    bump(by = 1) { this.set(this.level + by); },
  };

  /* Медленная фоновая «деградация»: за ~3 минуты доходит до 4 уровня.
     5 и 6 — только за клики по кнопке. */
  let timeStart = performance.now();
  setInterval(() => {
    if (corruption.level >= 4) return;
    const minutes = (performance.now() - timeStart) / 60000;
    const target = Math.min(4, Math.floor(minutes / 0.7));
    if (target > corruption.level) corruption.set(target);
  }, 4000);

  /* =========================================================
     ABSTRACTION (финальная поломка)
     ========================================================= */
  const abstractionEl = $("#abstraction");
  let abstracted = false;
  function triggerAbstraction() {
    if (abstracted || !abstractionEl) return;
    abstracted = true;
    /* небольшой лаг перед взрывом — будто система "думает" */
    setTimeout(() => {
      abstractionEl.classList.add("is-on");
      body.classList.add("is-broken");
      const exit = $("#exitButton");
      if (exit) exit.classList.add("is-broken");
      /* через 12 секунд снимаем оверлей, но "сломанное" состояние остаётся:
         все [data-glitchable] навсегда переведены в глитч-режим. */
      setTimeout(() => {
        abstractionEl.classList.remove("is-on");
        $$("[data-glitchable]").forEach((el) => startGlitch(el));
      }, 12000);
    }, 400);
  }

  /* =========================================================
     GLITCH-TEXT (заголовок + любые [data-glitchable])
     ========================================================= */
  const GLITCH_CHARS = "!@#$%^&*<>?/\\|{}[]█▓▒░◆◇★☆♥♦♣♠ЖЗЯЪЫЬΞΩΨλΣ¤ABCD";

  /* кэшируем оригиналы заранее, чтобы не «зашить» искажения */
  $$("[data-glitchable]").forEach((el) => {
    if (!el.dataset.text) el.dataset.text = el.textContent;
  });

  function startGlitch(el) {
    if (!el.dataset.text) el.dataset.text = el.textContent;
    if (el.dataset.glitching === "1") return;
    el.dataset.glitching = "1";
    const original = el.dataset.text;
    const tick = () => {
      if (el.dataset.glitching !== "1") return;
      const out = original.split("").map((c) => {
        if (c === " " || c === "\n") return c;
        return Math.random() < 0.35
          ? GLITCH_CHARS[randInt(0, GLITCH_CHARS.length - 1)]
          : c;
      }).join("");
      el.textContent = out;
      el._t = setTimeout(tick, 55);
    };
    tick();
  }
  function stopGlitch(el) {
    el.dataset.glitching = "0";
    if (el._t) clearTimeout(el._t);
    if (el.dataset.text) el.textContent = el.dataset.text;
  }

  $$("[data-glitchable]").forEach((el) => {
    el.addEventListener("mouseenter", () => startGlitch(el));
    el.addEventListener("mouseleave", () => stopGlitch(el));
  });

  const titleEl = $("#glitchTitle");
  if (titleEl && !reduceMotion) {
    /* "амбиентный" сбой — раз в 6..11 сек */
    const ambient = () => {
      startGlitch(titleEl);
      setTimeout(() => stopGlitch(titleEl), 380);
      setTimeout(ambient, randInt(6000, 11000));
    };
    setTimeout(ambient, 4000);
  }

  /* =========================================================
     ГЛАЗА — синий + красный. У каждого свой "лаг" и поведение.
     ========================================================= */
  const eyesRoot = $("#eyes");

  /**
   * Управляет одним глазом. Цель зрачка — позиция курсора,
   * текущая позиция приближается с задержкой (lerp).
   * Плюс случайный микро-«сбой» — зрачок прыгает не туда.
   */
  class Eye {
    constructor(opts) {
      this.root   = opts.root;             // .eye
      this.svg    = this.root.querySelector(".eye__svg");
      this.iris   = this.root.querySelector(".eye__iris");
      this.lerp   = opts.lerp;             // 0..1, выше = резче
      this.maxR   = opts.maxR;             // макс. сдвиг зрачка (svg-units)
      this.glitchChance = opts.glitchChance;
      this.tx = 0; this.ty = 0;            // целевой сдвиг
      this.x  = 0; this.y  = 0;            // текущий сдвиг
      this.glitchOffset = { x: 0, y: 0 };
      this.glitchUntil  = 0;
      this.rect = null;
      this.scale = 1;
      this.measure();
    }
    measure() {
      if (!this.svg) return;
      this.rect  = this.svg.getBoundingClientRect();
      this.scale = this.rect.width / 220;  // viewBox 220
    }
    lookAt(cx, cy) {
      if (!this.rect) this.measure();
      if (!this.rect) return;
      /* центр глаза в координатах окна (центр sclera 110,110) */
      const ex = this.rect.left + 110 * this.scale;
      const ey = this.rect.top  + 110 * this.scale;
      const dx = cx - ex, dy = cy - ey;
      const d  = Math.hypot(dx, dy) || 1;
      const k  = Math.min(1, d / 320);
      this.tx = (dx / d) * this.maxR * k;
      this.ty = (dy / d) * this.maxR * k;
    }
    maybeGlitch() {
      const now = performance.now();
      if (now < this.glitchUntil) return;
      if (Math.random() < this.glitchChance) {
        /* вспышка-промах: зрачок улетает в случайную сторону */
        this.glitchOffset.x = randInt(-this.maxR, this.maxR);
        this.glitchOffset.y = randInt(-this.maxR, this.maxR);
        this.glitchUntil = now + randInt(80, 200);
        this.root.classList.add("is-glitching");
        setTimeout(() => this.root.classList.remove("is-glitching"), 220);
      } else {
        this.glitchOffset.x = 0;
        this.glitchOffset.y = 0;
      }
    }
    tick() {
      /* лаговое приближение */
      this.x += (this.tx - this.x) * this.lerp;
      this.y += (this.ty - this.y) * this.lerp;
      const ox = this.x + this.glitchOffset.x;
      const oy = this.y + this.glitchOffset.y;
      if (this.iris) {
        this.iris.setAttribute(
          "transform",
          `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`
        );
      }
    }
  }

  let eyes = [];
  if (eyesRoot) {
    const blueEye = new Eye({
      root: eyesRoot.querySelector(".eye--blue"),
      lerp: 0.06,            // плавный, "задумчивый"
      maxR: 22,
      glitchChance: 0.015,
    });
    const redEye = new Eye({
      root: eyesRoot.querySelector(".eye--red"),
      lerp: 0.22,            // резкий, дёрганый
      maxR: 26,
      glitchChance: 0.035,
    });
    eyes = [blueEye, redEye];

    const onResize = () => eyes.forEach((e) => e.measure());
    addEventListener("resize", onResize);
    addEventListener("scroll", onResize, { passive: true });

    /* основной курсорный канал */
    let lastSpeed = 0, lx = 0, ly = 0, lt = 0;
    document.addEventListener("mousemove", (e) => {
      const now = performance.now();
      const dt  = Math.max(1, now - lt);
      const sp  = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;
      lx = e.clientX; ly = e.clientY; lt = now; lastSpeed = sp;
      eyes.forEach((eye) => eye.lookAt(e.clientX, e.clientY));
    }, { passive: true });

    /* на тач-устройствах глаза «бродят» сами */
    if (matchMedia("(pointer: coarse)").matches) {
      const wander = () => {
        const fx = randInt(0, innerWidth), fy = randInt(0, innerHeight);
        eyes.forEach((eye) => eye.lookAt(fx, fy));
        setTimeout(wander, randInt(900, 2200));
      };
      wander();
    }

    /* основной цикл анимации глаз */
    function loop() {
      eyes.forEach((eye) => { eye.maybeGlitch(); eye.tick(); });
      /* при быстром движении — оба глаза «вздрагивают» */
      if (lastSpeed > 2.4) {
        eyes.forEach((eye) => {
          eye.glitchOffset.x = randInt(-eye.maxR, eye.maxR);
          eye.glitchOffset.y = randInt(-eye.maxR, eye.maxR);
          eye.glitchUntil = performance.now() + 180;
          eye.root.classList.add("is-glitching");
          setTimeout(() => eye.root.classList.remove("is-glitching"), 200);
        });
        lastSpeed = 0;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* =========================================================
     EXIT BUTTON — «умная» убегающая кнопка
     ========================================================= */
  const exitBtn = $("#exitButton");
  const hitsEl  = $("#exitHits");
  let hits = 0;
  /* phase: idle | running | paused | fake | broken */
  let phase = "idle";
  let phaseUntil = 0;

  /* «Умное» поведение: периодически кнопка решает что делать.
     - paused : замирает и пульсирует ~250..600мс. Можно поймать.
     - fake   : подсвечивается красным, но при попытке клика
                в последний момент уходит.
     - running: убегает на mouseover как раньше.
   */
  function setPhase(next, ms) {
    phase = next;
    phaseUntil = performance.now() + ms;
    exitBtn.classList.toggle("is-paused", next === "paused");
    exitBtn.classList.toggle("is-fake",   next === "fake");
  }

  function teleport(extraDodge = 0) {
    if (!exitBtn) return;
    const pad = 24;
    const w = exitBtn.offsetWidth, h = exitBtn.offsetHeight;
    const maxX = clamp(innerWidth  - w - pad, pad, innerWidth);
    const maxY = clamp(innerHeight - h - pad, pad, innerHeight);
    const x = randInt(pad, maxX), y = randInt(pad, maxY);
    exitBtn.classList.add("is-fleeing");
    exitBtn.style.left = x + "px";
    exitBtn.style.top  = y + "px";
    if (extraDodge && !reduceMotion) {
      exitBtn.style.transition = "top .12s linear, left .12s linear, transform .15s";
      setTimeout(() => exitBtn.style.transition = "", 200);
    }
  }

  function decidePhase() {
    if (!exitBtn || phase === "broken") return;
    const now = performance.now();
    if (now < phaseUntil) return;
    /* вероятности зависят от уровня коррупции */
    const lvl = corruption.level;
    const r = Math.random();
    if (r < 0.18 + lvl * .03) {
      /* кратковременная пауза — окно «можно поймать» */
      setPhase("paused", randInt(280, 650));
    } else if (r < 0.32 + lvl * .04) {
      setPhase("fake", randInt(500, 1100));
    } else {
      setPhase("running", randInt(800, 1800));
    }
  }
  if (exitBtn) {
    setInterval(decidePhase, 200);

    exitBtn.addEventListener("mouseover", () => {
      if (phase === "broken") return;
      if (phase === "paused") return; /* можно навестись и кликнуть */
      teleport(phase === "fake");
    });

    /* если курсор слишком близко в running — продолжать убегать */
    document.addEventListener("mousemove", (e) => {
      if (!exitBtn.classList.contains("is-fleeing")) return;
      if (phase !== "running") return;
      const r = exitBtn.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < 80) teleport();
    });

    /* fake-фаза: при попытке клика — в последний миг ускользает */
    exitBtn.addEventListener("mousedown", (e) => {
      if (phase === "fake") {
        e.preventDefault();
        teleport(true);
        setPhase("running", 800);
      }
    });

    exitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (phase === "broken") return;
      hits = clamp(hits + 1, 0, 6);
      if (hitsEl) hitsEl.textContent = String(hits);
      /* каждый успешный клик усиливает деградацию */
      corruption.bump(1);
      fireGlobalGlitch();
      shakeStage();
      /* алерты — нарастающее давление */
      const lines = [
        "ОТСЮДА НЕТ ВЫХОДА.",
        "ТЫ ПРОСТО ЗРИТЕЛЬ.",
        "КЕЙН ВИДЕЛ ТЕБЯ.",
        "ПОДВАЛ ЗАПОМНИЛ ТВОЁ ИМЯ.",
        "ТЫ ВЫЧИСЛЕН. ПРОДОЛЖАЙ.",
        "ПОСЛЕДНИЙ КАДР…",
      ];
      const msg = lines[Math.min(hits - 1, lines.length - 1)];
      /* setTimeout, чтобы не блокировать визуальный эффект */
      setTimeout(() => alert(msg), 60);

      if (hits >= 6) {
        setPhase("broken", 60_000);
        exitBtn.classList.add("is-broken");
      } else {
        setPhase("running", 600);
      }
    });
  }

  /* =========================================================
     GLOBAL GLITCH (клик по любому интерактиву)
     ========================================================= */
  const ggLayer = $("#globalGlitch");
  function fireGlobalGlitch() {
    if (!ggLayer || reduceMotion) return;
    ggLayer.classList.add("is-firing");
    clearTimeout(ggLayer._t);
    ggLayer._t = setTimeout(() => ggLayer.classList.remove("is-firing"), 700);
  }
  function shakeStage() {
    document.querySelector(".stage")?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-8px, 4px)" },
        { transform: "translate( 9px,-3px)" },
        { transform: "translate(-4px, 2px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 280, easing: "steps(5)" }
    );
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest(
      "button, a, .card, .glitch-title, .eye, [data-glitchable]"
    );
    if (t) fireGlobalGlitch();
  });

  /* =========================================================
     БОНУСЫ
     ========================================================= */

  /* «эфирное время» — счётчик в hero */
  const airTime = $("#airTime");
  if (airTime) {
    setInterval(() => {
      const s = Math.floor((performance.now() - timeStart) / 1000);
      const m = Math.floor(s / 60), ss = s % 60;
      airTime.textContent = `${m}:${String(ss).padStart(2, "0")}`;
    }, 1000);
  }

  /* счётчик «зрителей»: медленно растёт + дёргается */
  const viewersEl = $("#viewers");
  if (viewersEl) {
    let v = 1;
    setInterval(() => {
      v += randInt(0, 3);
      if (Math.random() < .15) v -= randInt(1, 4);
      v = Math.max(1, v);
      viewersEl.textContent = String(v);
    }, 2400);
  }

  /* build id — небольшая мистика */
  const buildEl = $("#buildId");
  if (buildEl) {
    buildEl.textContent =
      `${randInt(0,9)}.${randInt(0,9)}.${String(randInt(0,99)).padStart(2,"0")}`;
  }

  /* долгое бездействие — система «вспоминает о тебе» */
  let idle;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      fireGlobalGlitch();
      if (titleEl) {
        startGlitch(titleEl);
        setTimeout(() => stopGlitch(titleEl), 600);
      }
    }, 12000);
  };
  ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
    addEventListener(ev, resetIdle, { passive: true })
  );
  resetIdle();

  /* На карточках — лёгкий 3D-tilt по курсору */
  $$(".card").forEach((card) => {
    const frame = card.querySelector(".card__frame");
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - .5;
      const y = (e.clientY - r.top)  / r.height - .5;
      card.style.transform =
        `translateY(-6px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
      if (frame) frame.style.transform = `translateZ(20px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      if (frame) frame.style.transform = "";
    });
  });

  /* консольное «приветствие» — пасхалка для тех, кто откроет devtools */
  try {
    /* eslint-disable no-console */
    console.log(
      "%c WELCOME TO THE AMAZING DIGITAL CIRCUS ",
      "background:#ff1f3d;color:#fff;font-size:14px;padding:6px 10px;font-weight:700;"
    );
    console.log(
      "%c // отсюда не выходят. но можно посмотреть.",
      "color:#8aff2b;font-family:monospace;"
    );
    /* eslint-enable */
  } catch {}
})();
