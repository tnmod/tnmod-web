import { STORY } from "./timeline";
import milestones from "./callMilestones.json";

export type RevealReadiness = {
  opening: boolean;
  hello: boolean;
  aboutTitle: boolean;
  about: boolean;
  workTitle: boolean;
  work: boolean;
};

export type RevealGate = { start: number; end: number; pending: boolean; lead?: number };

/** Bound queued input against the rendered frame, not the native scroll target.
 * Excess input is discarded: it must not burst through after a reveal finishes.
 */
export function guardScroll(
  from: number, to: number, rendered: number, gates: RevealGate[], lead: number,
) {
  for (const gate of gates) {
    if (!gate.pending || !Number.isFinite(gate.end) ||
      to < gate.start) continue;
    const limit = Math.min(gate.end, Math.max(gate.start, rendered + Math.min(lead, gate.lead ?? lead)));
    to = Math.min(to, Math.max(from, limit));
  }
  return to;
}

type Scroller = { scrollTop: () => number };

/** Hold fast desktop input only while a reveal is unfinished. */
export function createScrollPacing(
  root: HTMLElement,
  scroller: Scroller,
  getReady: () => RevealReadiness,
  getPhases: () => number[],
) {
  const baseSpeed = 0.5; // Match the existing ScrollSmoother speed.
  let bounds = { hello: 0, about: 0, work: 0, projects: 0 };
  function refresh() {
    const scroll = scroller.scrollTop();
    const top = (selector: string) => {
      const element = root.querySelector(selector);
      return element ? element.getBoundingClientRect().top + scroll : Infinity;
    };
    bounds = {
      hello: top(".pickup-message p"),
      about: top("#about-title"),
      work: top("#work-title"),
      projects: top(".projects"),
    };
  }

  function gates(): RevealGate[] {
    const ready = getReady();
    const vh = window.innerHeight;
    const phases = getPhases();
    const pickup = phases[2] ?? Infinity;
    const about = phases[3] ?? Infinity;
    const transition = phases[4] ?? Infinity;
    const work = phases[5] ?? Infinity;
    const hangup = phases[6] ?? Infinity;
    // Match BOTH conditions in portfolioMotion: story time and heading top.
    // Two pixels of clearance let scrub reach exactly 1 before holding.
    const helloEnd = Math.max(about, bounds.hello - vh * 0.25) + 2;
    const aboutEnd = Math.max(
      about + (transition - about) * 0.65 / (STORY.crossStart - STORY.liftEnd),
      bounds.about - vh * 0.25,
    ) + 2;
    const workEnd = Math.max(
      work + (hangup - work) * 0.18 / (STORY.hangupStart - STORY.crossEnd),
      bounds.work - vh * 0.25,
    ) + 2;
    const connected = pickup + (about - pickup) *
      (((milestones[0].frame - 1) / 24 - STORY.liftStart) / (STORY.liftEnd - STORY.liftStart));
    return [
      { start: Math.max(bounds.hello - vh * 0.6, connected + 102), end: helloEnd, pending: !ready.hello },
      // Allow another 100 content pixels of gentle movement while copy reveals.
      { start: bounds.about - vh * 0.5, end: aboutEnd + 100, pending: !ready.about },
      // Do not apply the 30px movement cap during the heading reveal.
      { start: bounds.work - vh * 0.25, end: workEnd, pending: ready.workTitle && !ready.work, lead: 30 },
    ];
  }

  function canScrollInside(target: EventTarget | null, delta: number) {
    for (let element = target instanceof Element ? target : null;
      element && element !== root && element !== document.body; element = element.parentElement) {
      if (element.matches("input, textarea, select, [contenteditable='true'], [role='dialog']")) return true;
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1 &&
        (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1)) return true;
    }
    return false;
  }

  function apply(event: WheelEvent | KeyboardEvent, pixels: number) {
    if (event.defaultPrevented || !event.cancelable ||
      document.documentElement.classList.contains("is-loading") || pixels === 0 ||
      canScrollInside(event.target, pixels)) return;
    const from = window.scrollY * baseSpeed;
    const delta = pixels * baseSpeed;
    const rendered = scroller.scrollTop();
    const target = from + delta;
    const to = delta > 0
      ? guardScroll(from, target, rendered, gates(), Math.max(32, window.innerHeight * 0.12))
      : target;
    // Own the entire wheel gesture, including baseline-speed segments. If its
    // first event scrolls natively, Chrome may deliver non-cancelable momentum
    // events later, making an upcoming reveal gate impossible to enforce.
    event.preventDefault();
    window.scrollTo({ top: to / baseSpeed, behavior: "instant" });
  }

  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    apply(event, event.deltaY * unit);
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
      (event.target instanceof Element && event.target.closest("a, button, input, textarea, select, [contenteditable='true']"))) return;
    const pixels = event.key === "ArrowDown" ? 40 :
      event.key === "PageDown" || event.key === " " ? window.innerHeight * 0.875 : 0;
    if (pixels) apply(event, pixels);
  };
  window.addEventListener("wheel", wheel, { passive: false, capture: true });
  window.addEventListener("keydown", keydown, true);
  refresh();
  return {
    refresh,
    dispose() {
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("keydown", keydown, true);
    },
  };
}
