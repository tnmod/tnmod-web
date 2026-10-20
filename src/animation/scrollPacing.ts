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

export type PaceZone = { start: number; end: number; rate: number };
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

/** Integrate input across boundaries so a fast wheel cannot jump a slow beat. */
export function paceScroll(from: number, delta: number, zones: PaceZone[]) {
  if (delta <= 0) return from + delta;
  let position = from;
  let remaining = delta;
  const boundaries = [...new Set(zones.flatMap((zone) => [zone.start, zone.end]))]
    .filter((point) => point > from).sort((a, b) => a - b);
  for (const boundary of [...boundaries, Infinity]) {
    const rate = zones.reduce((value, zone) =>
      position >= zone.start && position < zone.end ? Math.min(value, zone.rate) : value, 1);
    const cost = (boundary - position) / rate;
    if (remaining <= cost) return position + remaining * rate;
    position = boundary;
    remaining -= cost;
  }
  return position;
}

type Scroller = { scrollTop: () => number };

/** Desktop input pacing. Native scrolling still drives ScrollSmoother. */
export function createScrollPacing(
  root: HTMLElement,
  scroller: Scroller,
  getReady: () => RevealReadiness,
  getPhases: () => number[],
) {
  const baseSpeed = 0.5; // Match the existing ScrollSmoother speed.
  const extendedBeats = {
    about: { phase: "before" as "before" | "active" | "tail" | "done", end: null as number | null },
    work: { phase: "before" as "before" | "active" | "tail" | "done", end: null as number | null },
  };
  function updateBeats(ready = getReady()) {
    const scroll = scroller.scrollTop();
    for (const name of ["about", "work"] as const) {
      const beat = extendedBeats[name];
      const titleReady = ready[name === "about" ? "aboutTitle" : "workTitle"];
      const start = bounds[name] - window.innerHeight * 0.25;
      if (!titleReady && scroll < start) {
        beat.phase = "before";
        beat.end = null;
        continue;
      }
      if (beat.phase === "before" && titleReady) beat.phase = "active";
      if (beat.phase === "active" && ready[name]) {
        // Stable layout distance: waiting without scrolling cannot collapse
        // the 20% tail to zero. Keep its start at the completed reveal.
        const phases = getPhases();
        const index = name === "about" ? 3 : 5;
        const duration = name === "about" ? 0.65 : 0.18;
        const chapterDuration = name === "about"
          ? STORY.crossStart - STORY.liftEnd : STORY.hangupStart - STORY.crossEnd;
        const storySpan = ((phases[index + 1] ?? 0) - (phases[index] ?? 0)) * duration / chapterDuration;
        const revealSpan = Math.max(window.innerHeight * 0.25, storySpan);
        const fullEnd = Math.max(scroll, start) + revealSpan * 0.2;
        // Selected connections keeps its start and only 70% of its old span.
        beat.end = name === "work" ? start + (fullEnd - start) * 0.7 : fullEnd;
        beat.phase = "tail";
      }
      if (beat.phase === "tail" && scroll >= beat.end!) beat.phase = "done";
      if (beat.phase === "done" && scroll < beat.end!) beat.phase = "tail";
    }
  }
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

  function zones(): PaceZone[] {
    const ready = getReady();
    updateBeats(ready);
    const vh = window.innerHeight;
    const phases = getPhases();
    const pickup = phases[2] ?? Infinity;
    const about = phases[3] ?? Infinity;
    const transition = phases[4] ?? Infinity;
    const connected = pickup + (about - pickup) *
      (((milestones[0].frame - 1) / 24 - STORY.liftStart) / (STORY.liftEnd - STORY.liftStart));
    return [
      // Frame 127 must be visible before any pickup slowdown. Two content
      // pixels clear the exact frame boundary; the allowance is 100px after it.
      { start: connected + 2, end: connected + 102, rate: 0.65 },
      { start: Math.max(bounds.hello - vh * 0.6, connected + 102), end: bounds.about - vh * 0.6, rate: ready.hello ? 1 : 0.25 },
      // Keep the heading-completion start and extend the old end downward 20%.
      { start: bounds.about - vh * 0.25, end: extendedBeats.about.end ?? Infinity, rate: extendedBeats.about.phase === "active" || extendedBeats.about.phase === "tail" ? 0.1 : 1 },
      { start: transition, end: bounds.work - vh * 0.6, rate: 0.8 },
      // The title itself scrolls normally. Only its supporting-copy reveal
      // activates the slow beat, with the same 20% extension after the copy.
      { start: bounds.work - vh * 0.25, end: extendedBeats.work.end ?? Infinity, rate: extendedBeats.work.phase === "active" || extendedBeats.work.phase === "tail" ? 0.1 : 1 },
    ].filter((zone) => Number.isFinite(zone.start) && zone.end > zone.start);
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
      // Do not hold before the LCD switches. Limit fast input only from
      // ANSWER/CONNECTED through the following 100 content pixels.
      { start: connected + 2, end: connected + 102, pending: scroller.scrollTop() < connected + 101 },
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
    const activeZones = zones();
    // The native target can already be beyond a zone while the visible scene
    // is still inside it. Apply that visible zone's rate to new input too.
    const visibleRate = activeZones.reduce((rate, zone) =>
      rendered >= zone.start && rendered < zone.end ? Math.min(rate, zone.rate) : rate, 1);
    const paced = delta > 0
      ? Math.min(paceScroll(from, delta, activeZones), from + delta * visibleRate)
      : from + delta;
    const to = delta > 0
      ? guardScroll(from, paced, rendered, gates(), Math.max(32, window.innerHeight * 0.12))
      : paced;
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
    update: () => updateBeats(),
    getZones: zones,
    dispose() {
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("keydown", keydown, true);
    },
  };
}
