const stage = document.getElementById("imaginationStage");
const canvas = document.getElementById("particleCanvas");
const projectsMenu = document.querySelector(".projects-menu");
const projectsTrigger = document.querySelector(".nav-trigger");

if (stage) {
  window.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (event.clientX - cx) / window.innerWidth;
    const dy = (event.clientY - cy) / window.innerHeight;

    stage.style.transform = `rotateX(${dy * -2.2}deg) rotateY(${dx * 3.2}deg) translate3d(${dx * 5}px, ${dy * 4}px, 0)`;
  });

  window.addEventListener("pointerleave", () => {
    stage.style.transform = "";
  });
}

if (canvas) {
  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles = Array.from({ length: 72 }, (_, index) => {
    const band = index / 71;
    return {
      seed: index * 43.17,
      band,
      x: 0,
      y: 0,
      size: index % 9 === 0 ? 1.65 : index % 4 === 0 ? 1.25 : .9,
      phase: index * .37,
      speed: .18 + (index % 7) * .018,
      tone: index % 11 === 0 ? "warm" : index % 5 === 0 ? "violet" : "blue"
    };
  });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointerX = 0;
  let pointerY = 0;
  let rafId = 0;

  const colors = {
    blue: [168, 216, 255],
    violet: [183, 165, 255],
    warm: [255, 179, 92]
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawParticle(x, y, radius, alpha, tone) {
    const [r, g, b] = colors[tone];
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 5.5);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(.32, `rgba(${r}, ${g}, ${b}, ${alpha * .22})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(alpha * 1.2, .9)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(.45, radius * .58), 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(now) {
    const t = now * .001;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    const cx = width / 2;
    const cy = height / 2;
    const breath = .5 + .5 * Math.sin(t * .72);
    const spreadX = width * (.16 + breath * .16);
    const spreadY = height * (.08 + breath * .09);
    const tilt = Math.sin(t * .28) * .08;

    particles.forEach((p, index) => {
      const angle = p.seed + t * p.speed;
      const lane = (p.band - .5) * 2;
      const wave = Math.sin(t * (.44 + p.band * .22) + p.phase);
      const noise = Math.cos(t * (.31 + (index % 5) * .03) + p.seed);
      const drift = Math.sin(angle) * spreadX * .32;
      const x = cx + lane * spreadX + drift + pointerX * (12 + index % 5) + Math.cos(angle * .7) * 8;
      const y = cy + (lane * tilt + wave * .42 + noise * .16) * spreadY + pointerY * (8 + index % 4);
      const edge = Math.max(0, 1 - Math.abs(lane) * .62);
      const alpha = (.12 + breath * .16 + edge * .22) * (.72 + .28 * Math.sin(t + p.phase));

      p.x = x;
      p.y = y;
      drawParticle(x, y, p.size, alpha, p.tone);
    });

    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i += 3) {
      for (let j = i + 3; j < Math.min(particles.length, i + 15); j += 4) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < width * .16) {
          const alpha = (1 - dist / (width * .16)) * .11;
          ctx.strokeStyle = `rgba(168, 216, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalCompositeOperation = "source-over";

    if (!reducedMotion.matches) {
      rafId = requestAnimationFrame(draw);
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointerX += ((event.clientX / window.innerWidth) - .5 - pointerX) * .08;
    pointerY += ((event.clientY / window.innerHeight) - .5 - pointerY) * .08;
  });

  resize();
  draw(0);

  if (!reducedMotion.matches) {
    rafId = requestAnimationFrame(draw);
  }

  reducedMotion.addEventListener("change", () => {
    cancelAnimationFrame(rafId);
    resize();
    draw(0);
    if (!reducedMotion.matches) {
      rafId = requestAnimationFrame(draw);
    }
  });
}

if (projectsMenu && projectsTrigger) {
  const syncExpanded = () => {
    const isOpen = projectsMenu.matches(":hover") || projectsMenu.matches(":focus-within");
    projectsTrigger.setAttribute("aria-expanded", String(isOpen));
  };

  ["mouseenter", "mouseleave", "focusin", "focusout"].forEach((eventName) => {
    projectsMenu.addEventListener(eventName, () => window.setTimeout(syncExpanded, 0));
  });
}
