import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import type { PaceZone } from "./scrollPacing";

gsap.registerPlugin(ScrollToPlugin);

/** Distance-weighted GSAP easing gives reveal zones more of the journey. */
export function navigationRoute(from: number, to: number, zones: PaceZone[]) {
  const direction = to >= from ? 1 : -1;
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const points = [...new Set([low, high, ...zones.flatMap((zone) => [zone.start, zone.end])
    .filter((point) => point > low && point < high)])].sort((a, b) => a - b);
  const spans = points.slice(1).map((end, index) => {
    const start = points[index];
    const middle = (start + end) / 2;
    const rate = zones.reduce((value, zone) => middle >= zone.start && middle < zone.end
      ? Math.min(value, zone.rate) : value, 1);
    return { start, end, cost: (end - start) / Math.sqrt(rate) };
  });
  if (direction < 0) spans.reverse();
  const cost = spans.reduce((sum, span) => sum + span.cost, 0);
  return (progress: number) => {
    if (!cost || progress <= 0) return from;
    if (progress >= 1) return to;
    let remaining = progress * cost;
    for (const span of spans) {
      if (remaining <= span.cost) {
        const part = remaining / span.cost;
        return direction > 0 ? span.start + (span.end - span.start) * part
          : span.end - (span.end - span.start) * part;
      }
      remaining -= span.cost;
    }
    return to;
  };
}

type Scroller = { scrollTop: () => number };

export function createAnchorNavigation(root: HTMLElement, scroller: Scroller, getZones: () => PaceZone[]) {
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
      // Keep routes stable while travelling: reveal completion may change the
      // live wheel zones, but must never warp an anchor tween in mid-flight.
      const route = navigationRoute(from, to, getZones());
      const duration = Math.min(7, Math.max(1.4, 1.5 + Math.sqrt(distance / window.innerHeight) * 1.35));
      tween = gsap.to(window, {
        scrollTo: { y: to / 0.5, autoKill: true },
        duration,
        ease: (progress: number) => (route(ease(progress)) - from) / (to - from),
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
