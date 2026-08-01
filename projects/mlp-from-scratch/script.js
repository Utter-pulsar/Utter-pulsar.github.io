const progress = document.getElementById("progress");
const tocLinks = [...document.querySelectorAll(".toc a")];
const sections = tocLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const displayMathSelector = 'mjx-container[jax="CHTML"][display="true"]';
const compactMathLayout = window.matchMedia("(max-width: 620px)");
let mathFitFrame = 0;
let mathResizeObserver;
const observedMathWidths = new WeakMap();

function updateProgress() {
  const scrollTop = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = height <= 0 ? 0 : scrollTop / height;

  if (progress) {
    progress.style.width = `${Math.min(1, Math.max(0, ratio)) * 100}%`;
  }

  let active = sections[0]?.id;
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top < window.innerHeight * .36) {
      active = section.id;
    }
  });

  tocLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${active}`);
  });
}

function getBaseFontPercent(container) {
  const savedValue = Number(container.dataset.baseFontPercent);
  if (Number.isFinite(savedValue) && savedValue > 0) {
    return savedValue;
  }

  const inlineValue = container.style.fontSize.trim();
  let baseFontPercent = inlineValue.endsWith("%")
    ? Number.parseFloat(inlineValue)
    : Number.NaN;

  if (!Number.isFinite(baseFontPercent) || baseFontPercent <= 0) {
    const containerFontSize = Number.parseFloat(getComputedStyle(container).fontSize);
    const parentFontSize = Number.parseFloat(getComputedStyle(container.parentElement).fontSize);
    baseFontPercent = parentFontSize > 0 ? (containerFontSize / parentFontSize) * 100 : 100;
  }

  container.dataset.baseFontPercent = String(baseFontPercent);
  return baseFontPercent;
}

function fitDisplayMath() {
  mathFitFrame = 0;
  const containers = [...document.querySelectorAll(displayMathSelector)];

  containers.forEach((container) => {
    container.style.fontSize = `${getBaseFontPercent(container)}%`;
  });

  containers.forEach((container) => {
    const math = container.querySelector("mjx-math");
    const availableWidth = Math.max(0, container.clientWidth - 2);
    if (!math || availableWidth === 0) {
      return;
    }

    const naturalWidth = Math.max(
      math.getBoundingClientRect().width,
      math.scrollWidth
    );
    const preferredScale = compactMathLayout.matches ? .84 : 1;
    const scale = Math.min(
      preferredScale,
      naturalWidth > 0 ? availableWidth / naturalWidth : 1
    );
    const baseFontPercent = getBaseFontPercent(container);

    container.style.fontSize = `${baseFontPercent * scale}%`;

    const fittedWidth = Math.max(math.getBoundingClientRect().width, math.scrollWidth);
    const correction = fittedWidth > availableWidth + 1 ? availableWidth / fittedWidth : 1;
    const finalScale = Math.min(1, scale * correction);

    container.style.fontSize = `${baseFontPercent * finalScale}%`;
    container.dataset.fitScale = finalScale.toFixed(4);
  });
}

function scheduleMathFit() {
  cancelAnimationFrame(mathFitFrame);
  mathFitFrame = requestAnimationFrame(fitDisplayMath);
}

function observeMathPanels() {
  if (!("ResizeObserver" in window)) {
    scheduleMathFit();
    return;
  }

  if (!mathResizeObserver) {
    mathResizeObserver = new ResizeObserver((entries) => {
      const widthChanged = entries.some((entry) => {
        const previousWidth = observedMathWidths.get(entry.target);
        const nextWidth = entry.contentRect.width;
        observedMathWidths.set(entry.target, nextWidth);
        return previousWidth === undefined || Math.abs(previousWidth - nextWidth) > .5;
      });

      if (widthChanged) {
        scheduleMathFit();
      }
    });
  }

  document.querySelectorAll(".equation-card, .figure-equation").forEach((panel) => {
    mathResizeObserver.observe(panel);
  });

  scheduleMathFit();
}

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", () => {
  updateProgress();
  scheduleMathFit();
}, { passive: true });
window.addEventListener("orientationchange", scheduleMathFit, { passive: true });
window.addEventListener("load", scheduleMathFit, { once: true });
window.addEventListener("mathjax-ready", observeMathPanels);

if (document.fonts?.ready) {
  document.fonts.ready.then(scheduleMathFit);
}

updateProgress();
