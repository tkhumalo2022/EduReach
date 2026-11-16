/* Progressive enhancement for the EduReach hero.
   Native pointer-driven spotlight; no React runtime or external CDN. */
(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (reduceMotion.matches) return;

  hero.classList.add("hero-motion-ready");

  // The static backdrop is fully usable on touch devices and without JavaScript.
  if (!finePointer.matches) return;

  let pointer = null;
  let frame = 0;

  function render() {
    frame = 0;
    if (!pointer) return;
    const bounds = hero.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const x = Math.max(0, Math.min(bounds.width, pointer.x - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, pointer.y - bounds.top));
    hero.style.setProperty("--spot-x", x + "px");
    hero.style.setProperty("--spot-y", y + "px");
  }

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = window.requestAnimationFrame(render);
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    pointer = null;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    hero.style.removeProperty("--spot-x");
    hero.style.removeProperty("--spot-y");
  });
})();
