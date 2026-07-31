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
