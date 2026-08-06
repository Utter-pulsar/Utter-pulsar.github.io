(() => {
  const canvases = [...document.querySelectorAll(".brand-orb-canvas")];
  if (canvases.length === 0) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = [];
  const opts = {
    orbitN: 12,
    ghostN: 40,
    ghostR: .9,
    ghostA: .5,
    particles: 3,
    partR: 1.2,
    partRDepth: 1.6,
    rsPow: .6,
    rMin: .3
  };

  let rafId = 0;
  let running = false;

  function hashD(a, b) {
    const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  function makeProj(yaw, tilt, cx, cy, scale) {
    const st = Math.sin(tilt);
    const ct = Math.cos(tilt);
    const sy = Math.sin(yaw);
    const cyw = Math.cos(yaw);

    return (x, y, z) => {
      const x1 = x * cyw + z * sy;
      const z1 = -x * sy + z * cyw;
      const y1 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      return [cx + x1 * scale, cy - y1 * scale, z2];
    };
  }

  function radiusScale(size, pow) {
    return (size / 300) ** pow;
  }

  function paintOrbDots(ctx, dots) {
    dots.sort((a, b) => a.z - b.z);

    dots.forEach((dot) => {
      const alpha = dot.a ?? 1;
      if (alpha < .02) return;

      const white = Math.min(1, Math.max(0, dot.white));
      const g = Math.round((1 - white) * 255);
      ctx.fillStyle = `rgba(${g}, ${g}, ${g}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, Math.max(opts.rMin, dot.r), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Adapted from thinking-orbs' MIT-licensed `working` / `orbits` painter (© 2026 Jakub Antalik).
  function drawBrandOrb(state, now) {
    const { ctx, dots, size, dpr } = state;
    const t = now * .001 * 1.885;
    const cx = size / 2;
    const cy = size / 2;
    const R = (size / 2) * .82;
    const project = makeProj(t * .12, .3, cx, cy, 1);
    const rs = radiusScale(size, opts.rsPow);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    dots.length = 0;

    for (let orb = 0; orb < opts.orbitN; orb += 1) {
      const h1 = hashD(orb, 1.7);
      const h2 = hashD(orb, 5.2);
      const h3 = hashD(orb, 8.9);
      const ro = R * (.45 + .52 * h1);
      const th = h1 * 2 * Math.PI;
      const phi = Math.acos(2 * h2 - 1);
      const nx = Math.sin(phi) * Math.cos(th);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(th);
      let ux = -ny;
      let uy = nx;
      const uz = 0;
      const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy));
      ux /= ul;
      uy /= ul;
      const vx = -nz * uy;
      const vy = nz * ux;
      const vz = nx * uy - ny * ux;
      const speed = (.25 + .55 * h3) * (h3 > .5 ? 1 : -1);

      for (let k = 0; k < opts.ghostN; k += 1) {
        const a = (k / opts.ghostN) * 2 * Math.PI;
        const [px, py, z] = project(
          (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
          (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
          (uz * Math.cos(a) + vz * Math.sin(a)) * ro
        );
        const depth = (z / ro + 1) / 2;

        dots.push({
          x: px,
          y: py,
          z,
          r: opts.ghostR * rs,
          white: .72,
          a: opts.ghostA * (.4 + .6 * depth)
        });
      }

      for (let particle = 0; particle < opts.particles; particle += 1) {
        const a = t * speed + (particle / opts.particles) * 2 * Math.PI + h2 * 6;
        const [px, py, z] = project(
          (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
          (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
          (uz * Math.cos(a) + vz * Math.sin(a)) * ro
        );
        const depth = (z / ro + 1) / 2;

        dots.push({
          x: px,
          y: py,
          z,
          r: (opts.partR + opts.partRDepth * depth) * rs,
          white: .3 - .22 * depth
        });
      }
    }

    paintOrbDots(ctx, dots);
  }

  function resizeState(state) {
    const rect = state.canvas.getBoundingClientRect();
    state.size = Math.max(1, Math.round(Math.min(rect.width || 64, rect.height || 64)));
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.canvas.width = Math.round(state.size * state.dpr);
    state.canvas.height = Math.round(state.size * state.dpr);
    drawBrandOrb(state, reducedMotion.matches ? 600 : performance.now());
  }

  function drawAll(now) {
    states.forEach((state) => drawBrandOrb(state, now));
  }

  function tick() {
    drawAll(performance.now());
    if (running) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function start() {
    if (running || reducedMotion.matches || document.visibilityState === "hidden") return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  canvases.forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      canvas,
      ctx,
      dots: [],
      size: 64,
      dpr: 1
    };

    states.push(state);
    resizeState(state);
  });

  window.addEventListener("resize", () => {
    states.forEach(resizeState);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stop();
    } else {
      start();
    }
  });

  const handleMotionPreferenceChange = () => {
    stop();
    states.forEach(resizeState);
    start();
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);
  } else {
    reducedMotion.addListener(handleMotionPreferenceChange);
  }

  start();
})();
