import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

type Scroller = { scrollTop: () => number };

export function createAnchorNavigation(root: HTMLElement, scroller: Scroller) {
  let tween: gsap.core.Tween | undefined;
  const ease = gsap.parseEase("power2.inOut");
  const cancel = () => {
    tween?.kill();
    tween = undefined;
  };
  const interruptWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && (event.deltaY || event.deltaX)) cancel();
  };
  const interruptKey = (event: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"].includes(event.key)) cancel();
  };
  window.addEventListener("wheel", interruptWheel, { capture: true, passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("pointerdown", cancel);
  window.addEventListener("keydown", interruptKey, true);

  return {
    get active() { return !!tween?.isActive(); },
    cancel,
    to(target: HTMLElement) {
      cancel();
      const from = scroller.scrollTop();
      const top = (element: Element) => element.getBoundingClientRect().top + from;
      let destination = top(target);
      // Land after both the viewport and Blender-clock reveal gates. Section
      // top alone can leave the supporting copy hidden until another scroll.
      const heading = target.querySelector("#about-title, #work-title");
      if (heading) {
        const about = target.id === "about";
        destination = Math.max(destination + window.innerHeight * (about ? 0.03 : 0.02),
          top(heading) - window.innerHeight * (about ? 0.23 : 0.2));
      }
      const max = Math.max(0, root.getBoundingClientRect().height - window.innerHeight);
      const to = Math.min(max, Math.max(0, destination));
      const distance = Math.abs(to - from);
      if (distance < 2) return;
      const duration = Math.min(7, Math.max(1.4, 1.5 + Math.sqrt(distance / window.innerHeight) * 1.35));
      tween = gsap.to(window, {
        scrollTo: { y: to / 0.5, autoKill: true },
        duration,
        ease,
        overwrite: "auto",
        onComplete: () => { tween = undefined; },
        onInterrupt: () => { tween = undefined; },
      });
    },
    dispose() {
      cancel();
      window.removeEventListener("wheel", interruptWheel, true);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", interruptKey, true);
    },
  };
}
