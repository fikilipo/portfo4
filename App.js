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
    if (el.dataset.glitching === "1") return;
    el.dataset.glitching = "1";
    /* Случай 1: элемент разбит на span-буквы (заголовок) — глитчим каждую. */
    const spans = el.querySelectorAll(".glitch-title__ch");
    if (spans.length) {
      spans.forEach((s) => { if (!s.dataset.ch) s.dataset.ch = s.textContent; });
      const tick = () => {
        if (el.dataset.glitching !== "1") return;
        spans.forEach((s) => {
          const c = s.dataset.ch;
          if (c === " " || s.classList.contains("is-gone")) return;
          s.textContent = Math.random() < 0.35
            ? GLITCH_CHARS[randInt(0, GLITCH_CHARS.length - 1)]
            : c;
        });
        el._t = setTimeout(tick, 55);
      };
      tick();
      return;
    }
    /* Случай 2: обычный текст. */
    if (!el.dataset.text) el.dataset.text = el.textContent;
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
    const spans = el.querySelectorAll(".glitch-title__ch");
    if (spans.length) {
      spans.forEach((s) => { if (s.dataset.ch) s.textContent = s.dataset.ch; });
      return;
    }
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
     ГЛАЗА — настоящая CSS-3D-сфера.
     Каждый глаз вращается в глазнице: orbit -> rotateY/X -> translateZ(R).
     ========================================================= */
  const eyesRoot = $("#eyes");

  /**
   * Управляет одним 3D-глазом. Цель — угол поворота (yaw/pitch)
   * к курсору. Текущие углы догоняют цель с лагом (lerp).
   * Изредка — «сбой»: глаз крутится не туда.
   */
  class Eye3D {
    constructor(opts) {
      this.root  = opts.root;              // .eye3d
      this.globe = this.root.querySelector(".eye3d__globe");
      this.orbit = this.root.querySelector(".eye3d__orbit");
      this.lerp  = opts.lerp;              // 0..1
      this.maxDeg = opts.maxDeg;           // максимальный поворот в градусах
      this.glitchChance = opts.glitchChance;
      this.tYaw = 0; this.tPitch = 0;      // целевые углы
      this.yaw  = 0; this.pitch  = 0;      // текущие
      this.glitchYaw = 0; this.glitchPitch = 0;
      this.glitchUntil = 0;
      this.rect = null;
      this.measure();
    }
    measure() {
      if (!this.globe) return;
      this.rect = this.globe.getBoundingClientRect();
    }
    lookAt(cx, cy) {
      if (!this.rect) this.measure();
      if (!this.rect) return;
      const ex = this.rect.left + this.rect.width  / 2;
      const ey = this.rect.top  + this.rect.height / 2;
      const dx = cx - ex, dy = cy - ey;
      const d  = Math.hypot(dx, dy) || 1;
      /* k: насколько близко курсор, тем меньше поворот (≈0 на самом глазу, 1 далеко) */
      const k  = Math.min(1, d / 360);
      this.tYaw   =  (dx / d) * this.maxDeg * k;
      this.tPitch = -(dy / d) * this.maxDeg * k;
    }
    maybeGlitch() {
      const now = performance.now();
      if (now < this.glitchUntil) return;
      if (Math.random() < this.glitchChance) {
        this.glitchYaw   = randInt(-this.maxDeg, this.maxDeg);
        this.glitchPitch = randInt(-this.maxDeg, this.maxDeg);
        this.glitchUntil = now + randInt(90, 220);
        this.root.classList.add("is-glitching");
        setTimeout(() => this.root.classList.remove("is-glitching"), 240);
      } else {
        this.glitchYaw = 0;
        this.glitchPitch = 0;
      }
    }
    tick() {
      this.yaw   += (this.tYaw   - this.yaw)   * this.lerp;
      this.pitch += (this.tPitch - this.pitch) * this.lerp;
      const y = this.yaw   + this.glitchYaw;
      const p = this.pitch + this.glitchPitch;
      if (this.orbit) {
        this.orbit.style.transform =
          `translate(-50%, -50%) rotateY(${y.toFixed(2)}deg) rotateX(${p.toFixed(2)}deg)`;
      }
    }
    blink() {
      this.root.classList.add("is-blinking");
      setTimeout(() => this.root.classList.remove("is-blinking"), 240);
    }
  }

  let eyes = [];
  if (eyesRoot) {
    const redEye = new Eye3D({
      root: eyesRoot.querySelector(".eye3d--red"),
      lerp: 0.25,             // резкий, дёрганый
      maxDeg: 42,
      glitchChance: 0.035,
    });
    const whiteEye = new Eye3D({
      root: eyesRoot.querySelector(".eye3d--white"),
      lerp: 0.08,             // плавный, «задумчивый»
      maxDeg: 38,
      glitchChance: 0.018,
    });
    eyes = [redEye, whiteEye].filter(e => e.root);

    const onResize = () => eyes.forEach((e) => e.measure());
    addEventListener("resize", onResize);
    addEventListener("scroll", onResize, { passive: true });

    let lastSpeed = 0, lx = 0, ly = 0, lt = 0;
    document.addEventListener("mousemove", (e) => {
      const now = performance.now();
      const dt  = Math.max(1, now - lt);
      lastSpeed = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;
      lx = e.clientX; ly = e.clientY; lt = now;
      eyes.forEach((eye) => eye.lookAt(e.clientX, e.clientY));
    }, { passive: true });

    /* на тач-устройствах — глаза сами «бродят» */
    if (matchMedia("(pointer: coarse)").matches) {
      const wander = () => {
        const fx = randInt(0, innerWidth), fy = randInt(0, innerHeight);
        eyes.forEach((eye) => eye.lookAt(fx, fy));
        setTimeout(wander, randInt(900, 2200));
      };
      wander();
    }

    /* редкие совместные моргания */
    const blinkLoop = () => {
      eyes.forEach((eye) => eye.blink());
      setTimeout(blinkLoop, randInt(3500, 7500));
    };
    setTimeout(blinkLoop, 4000);

    /* основной цикл */
    function loop() {
      eyes.forEach((eye) => { eye.maybeGlitch(); eye.tick(); });
      if (lastSpeed > 2.4) {
        eyes.forEach((eye) => {
          eye.glitchYaw   = randInt(-eye.maxDeg, eye.maxDeg);
          eye.glitchPitch = randInt(-eye.maxDeg, eye.maxDeg);
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
      /* подтверждение действия на сайте — вместо нативного alert.
         Chyron (строка субтитров) в стиле ТЦЦ, с нарастающим давлением. */
      const lines = [
        "ПОПАДАНИЕ // ДВЕРЬ НИКУДА НЕ ВЕДЁТ.",
        "ВТОРОЙ РАЗ // КЕЙН УЖЕ ОБЕРНУЛСЯ.",
        "ТРЕТИЙ // ТЫ ЕЩЁ ДУМАЕШЬ, ЧТО ИГРАЕШЬ.",
        "ЧЕТВЁРТЫЙ // ПОДВАЛ СЛЫШИТ ТЕБЯ.",
        "ПЯТЫЙ // РУКА УЖЕ НА РЫЧАГЕ ABSTRACTION.",
        "ПОСЛЕДНИЙ КАДР // ABSTRACTED.",
      ];
      const msg = lines[Math.min(hits - 1, lines.length - 1)];
      chyron(msg);
      /* конфетти из точки клика — приятная «награда» за попадание */
      spawnConfetti(e.clientX, e.clientY, 18 + hits * 4);
      /* «штамп» поверх кнопки: CAUGHT x<hits> — подтверждение на месте */
      stampCaught(exitBtn, hits);

      if (hits >= 6) {
        setPhase("broken", 60_000);
        exitBtn.classList.add("is-broken");
      } else {
        setPhase("running", 600);
      }
    });
  }

  /* =========================================================
     CHYRON — in-page подпись вместо alert()
     ========================================================= */
  const chyronEl  = $("#chyron");
  const chyronTxt = $("#chyronText");
  let chyronTimer = 0, chyronInt = 0;
  function chyron(text, hold = 2600) {
    if (!chyronEl || !chyronTxt) return;
    clearTimeout(chyronTimer); clearInterval(chyronInt);
    chyronTxt.textContent = "";
    chyronEl.classList.add("is-on");
    chyronEl.setAttribute("aria-hidden", "false");
    /* эффект печатающейся машинки */
    let i = 0;
    chyronInt = setInterval(() => {
      chyronTxt.textContent += text.charAt(i++);
      if (i >= text.length) clearInterval(chyronInt);
    }, 28);
    chyronTimer = setTimeout(() => {
      chyronEl.classList.remove("is-on");
      chyronEl.setAttribute("aria-hidden", "true");
    }, hold + text.length * 30);
  }

  /* =========================================================
     КОНФЕТТИ — красно-белые полоски из точки клика
     ========================================================= */
  const fxLayer = $("#fx");
  const CONFETTO_KINDS = ["", "confetto--white", "confetto--yellow", "confetto--stripe"];
  function spawnConfetti(x, y, count = 20) {
    if (!fxLayer || reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const c = document.createElement("span");
      c.className = "confetto " + CONFETTO_KINDS[randInt(0, CONFETTO_KINDS.length - 1)];
      c.style.left = x + "px";
      c.style.top  = y + "px";
      c.style.setProperty("--dx",  (randInt(-220, 220)) + "px");
      c.style.setProperty("--dy",  (randInt( 120, 320)) + "px");
      c.style.setProperty("--rot", (randInt(-720, 720)) + "deg");
      c.style.animationDuration = (900 + Math.random() * 900) + "ms";
      fxLayer.appendChild(c);
      setTimeout(() => c.remove(), 2000);
    }
  }

  /* «штамп» поверх кнопки — видимое подтверждение действия */
  function stampCaught(btn, n) {
    if (!btn) return;
    const stamp = document.createElement("span");
    stamp.textContent = `CAUGHT ×${n}`;
    Object.assign(stamp.style, {
      position: "fixed",
      left: (btn.getBoundingClientRect().left + btn.offsetWidth / 2) + "px",
      top:  (btn.getBoundingClientRect().top  - 12) + "px",
      transform: "translate(-50%, -100%) rotate(-8deg)",
      color: "#fff",
      background: "#ff1f3d",
      border: "2px solid #000",
      boxShadow: "4px 4px 0 #000",
      padding: "4px 10px",
      font: '700 14px "VT323", monospace',
      letterSpacing: ".1em",
      pointerEvents: "none",
      zIndex: 120,
      opacity: "1",
      transition: "transform .6s ease, opacity .6s ease",
    });
    document.body.appendChild(stamp);
    requestAnimationFrame(() => {
      stamp.style.transform = "translate(-50%, -160%) rotate(-8deg) scale(1.15)";
      stamp.style.opacity = "0";
    });
    setTimeout(() => stamp.remove(), 700);
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
      "button, a, .card, .glitch-title, .eye3d, [data-glitchable]"
    );
    if (t) fireGlobalGlitch();
  });

  /* =========================================================
     СЛЕД КУРСОРА — розовые огоньки за мышью
     ========================================================= */
  if (fxLayer && !reduceMotion) {
    let lastTrail = 0;
    document.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastTrail < 45) return;
      lastTrail = now;
      const dot = document.createElement("span");
      dot.className = "cursor-trail";
      dot.style.left = (e.clientX - 5) + "px";
      dot.style.top  = (e.clientY - 5) + "px";
      /* цвет зависит от «коррупции» — от неоново-розового к кровавому */
      const hue = 320 - corruption.level * 20;
      dot.style.background = `radial-gradient(circle, hsl(${hue} 100% 60%), transparent 70%)`;
      fxLayer.appendChild(dot);
      setTimeout(() => dot.remove(), 600);
    }, { passive: true });
  }

  /* =========================================================
     КЛИК ПО ЗАГОЛОВКУ — буквы отваливаются и падают
     ========================================================= */
  if (titleEl) {
    /* разбить заголовок на span-ы по буквам, чтобы можно было кликать */
    const originalTitle = (titleEl.dataset.text || titleEl.textContent).trim();
    titleEl.dataset.text = originalTitle;
    titleEl.textContent = "";
    originalTitle.split("").forEach((ch) => {
      const span = document.createElement("span");
      span.className = "glitch-title__ch";
      span.textContent = ch;
      if (ch !== " ") span.style.cursor = "pointer";
      titleEl.appendChild(span);
    });
    titleEl.addEventListener("click", (e) => {
      const span = e.target.closest(".glitch-title__ch");
      if (!span) return;
      const ch = span.dataset.ch || span.textContent;
      if (!ch.trim() || span.classList.contains("is-gone")) return;
      const r = span.getBoundingClientRect();
      const drop = document.createElement("span");
      drop.className = "letter-drop";
      drop.textContent = ch;
      drop.style.left = r.left + "px";
      drop.style.top  = r.top  + "px";
      drop.style.fontSize = getComputedStyle(titleEl).fontSize;
      drop.style.setProperty("--dx",  randInt(-40, 40) + "px");
      drop.style.setProperty("--rot", randInt(-720, 720) + "deg");
      document.body.appendChild(drop);
      span.classList.add("is-gone");
      span.style.visibility = "hidden";
      setTimeout(() => drop.remove(), 1700);
      /* буква возвращается сама через ~3с — сайт «восстанавливает» себя */
      setTimeout(() => { span.style.visibility = ""; span.classList.remove("is-gone"); }, 3000);
      spawnConfetti(r.left + r.width / 2, r.top + r.height / 2, 10);
    });
  }

  /* =========================================================
     ПАСХАЛКА: набери "pomni" на клавиатуре — появится мини-Помни
     ========================================================= */
  const pomniPet    = $("#pomniPet");
  const pomniBubble = $("#pomniBubble");
  const POMNI_PHRASES = [
    "Добро пожаловать в цирк!",
    "Ты здесь уже был?",
    "Кейн тебя видит.",
    "Лестница НЕ ведёт наверх.",
    "Не смотри в красный глаз…",
    "Я не настоящая.",
  ];
  let typed = "";
  addEventListener("keydown", (e) => {
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    if (typed.endsWith("pomni") && pomniPet) {
      showPomniPet();
    }
  });
  let pomniTimer = 0;
  function showPomniPet() {
    if (!pomniPet) return;
    clearTimeout(pomniTimer);
    pomniPet.style.left = randInt(20, innerWidth  - 140) + "px";
    pomniPet.style.top  = randInt(80, innerHeight - 180) + "px";
    if (pomniBubble) {
      pomniBubble.textContent = POMNI_PHRASES[randInt(0, POMNI_PHRASES.length - 1)];
    }
    pomniPet.classList.add("is-on");
    pomniPet.setAttribute("aria-hidden", "false");
    chyron("// POMNI ONLINE //", 1800);
    pomniTimer = setTimeout(() => {
      pomniPet.classList.remove("is-on");
      pomniPet.setAttribute("aria-hidden", "true");
    }, 4500);
  }

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
