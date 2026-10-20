import gsap from "gsap";

/** Viewport-fixed closing composition; scroll only controls entry and exit. */
export function createClosingMotion(root: HTMLElement) {
  const copy = root.querySelector<HTMLElement>(":scope > .contact-copy");
  const footer = root.querySelector<HTMLElement>(":scope > .contact-copy > .footer");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let reveal: gsap.core.Timeline;
  const context = gsap.context(() => {
    reveal = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    if (copy) {
      reveal.fromTo(copy, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, 0);
      reveal.fromTo(Array.from(copy.children).filter(child => child !== footer && !child.classList.contains("sr-only")),
        { opacity: 0, filter: reducedMotion.matches ? "blur(0px)" : "blur(8px)" },
        { opacity: 1, filter: "blur(0px)", duration: 0.85, stagger: 0.12 }, 0.05);
    }
    if (footer) {
      reveal.fromTo(footer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.5);
      const rule = footer.querySelector(".closing-footer-rule");
      if (rule) reveal.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.9 }, 0.5);
      reveal.fromTo(Array.from(footer.children).filter(child => child !== rule),
        { autoAlpha: 0, y: reducedMotion.matches ? 0 : 12 },
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 }, 0.65);
    }
  }, root);
  for (const element of [copy, footer]) if (element) element.inert = true;

  return {
    setVisible(next: boolean) {
      if (next === visible) return;
      visible = next;
      for (const element of [copy, footer]) if (element) element.inert = !next;
      // Reduced motion keeps the staggered fade, without blur or travel.
      if (next) reveal.timeScale(1).play(0);
      else reveal.timeScale(2).reverse();
    },
    dispose() {
      context.revert();
      for (const element of [copy, footer]) if (element) element.inert = false;
    },
  };
}
