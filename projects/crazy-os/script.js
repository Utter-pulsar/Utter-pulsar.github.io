const progress = document.getElementById("progress");
const tocLinks = [...document.querySelectorAll(".toc a")];
const sections = tocLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

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

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

const videos = [...document.querySelectorAll("video")];
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const minimumVisibleRatio = .35;
const videoStates = new Map();

function canVideoPlay(video) {
  const state = videoStates.get(video);
  return Boolean(state?.isMeaningfullyVisible) && !document.hidden;
}

function pauseVideo(video) {
  const state = videoStates.get(video);
  if (state) {
    state.playRequest += 1;
  }
  video.pause();
}

function requestVideoPlayback(video) {
  const state = videoStates.get(video);
  if (!state || !canVideoPlay(video) || reduceMotionQuery.matches) {
    pauseVideo(video);
    return;
  }

  if (state.autoplayBlocked) {
    video.controls = true;
    return;
  }

  if (!state.loadRequested) {
    state.loadRequested = true;
    video.preload = "metadata";
    video.load();
  }

  if (!video.paused && !video.ended) {
    return;
  }

  const playRequest = ++state.playRequest;
  const playResult = video.play();

  if (!playResult || typeof playResult.then !== "function") {
    return;
  }

  playResult.then(() => {
    if (playRequest !== state.playRequest || !canVideoPlay(video) || reduceMotionQuery.matches) {
      video.pause();
      return;
    }
    video.controls = false;
  }).catch(() => {
    if (playRequest === state.playRequest && canVideoPlay(video)) {
      state.autoplayBlocked = true;
      video.controls = true;
    }
  });
}

function syncVideo(video) {
  if (reduceMotionQuery.matches) {
    video.controls = true;
    pauseVideo(video);
    return;
  }

  if (canVideoPlay(video)) {
    requestVideoPlayback(video);
  } else {
    pauseVideo(video);
  }
}

function setVideoVisibility(video, isMeaningfullyVisible) {
  const state = videoStates.get(video);
  if (!state || state.isMeaningfullyVisible === isMeaningfullyVisible) {
    return;
  }

  state.isMeaningfullyVisible = isMeaningfullyVisible;
  syncVideo(video);
}

videos.forEach((video) => {
  video.autoplay = false;
  video.removeAttribute("autoplay");
  video.defaultMuted = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.pause();

  videoStates.set(video, {
    autoplayBlocked: false,
    isMeaningfullyVisible: false,
    loadRequested: false,
    playRequest: 0
  });

  video.addEventListener("play", () => {
    if (!canVideoPlay(video)) {
      video.pause();
    }
  });
});

if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      setVideoVisibility(
        entry.target,
        entry.isIntersecting && entry.intersectionRatio >= minimumVisibleRatio
      );
    });
  }, {
    threshold: [0, minimumVisibleRatio, 1]
  });

  videos.forEach((video) => videoObserver.observe(video));
} else {
  let fallbackFrame = 0;

  function updateFallbackVisibility() {
    fallbackFrame = 0;

    videos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const videoArea = rect.width * rect.height;
      const visibleRatio = videoArea > 0 ? (visibleWidth * visibleHeight) / videoArea : 0;

      setVideoVisibility(video, visibleRatio >= minimumVisibleRatio);
    });
  }

  function scheduleFallbackVisibilityUpdate() {
    if (!fallbackFrame) {
      fallbackFrame = window.requestAnimationFrame(updateFallbackVisibility);
    }
  }

  window.addEventListener("scroll", scheduleFallbackVisibilityUpdate, { passive: true });
  window.addEventListener("resize", scheduleFallbackVisibilityUpdate);
  updateFallbackVisibility();
}

document.addEventListener("visibilitychange", () => {
  videos.forEach(syncVideo);
});

function handleMotionPreferenceChange() {
  videos.forEach((video) => {
    if (!reduceMotionQuery.matches && !videoStates.get(video)?.autoplayBlocked) {
      video.controls = false;
    }
    syncVideo(video);
  });
}

if (typeof reduceMotionQuery.addEventListener === "function") {
  reduceMotionQuery.addEventListener("change", handleMotionPreferenceChange);
} else {
  reduceMotionQuery.addListener(handleMotionPreferenceChange);
}

if (reduceMotionQuery.matches) {
  videos.forEach((video) => {
    video.controls = true;
  });
}
