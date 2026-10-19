// GLB time = (Blender frame - 1) / 24.
export const STORY = {
  ringEnd: 2,
  zoomEnd: 4,
  liftStart: 5,
  liftEnd: 170 / 24,
  crossStart: 242 / 24,
  crossEnd: 290 / 24,
  hangupStart: 314 / 24,
  lowerStart: 350 / 24,
  rest: 374 / 24,
  end: 398 / 24,
} as const;

export const chapters = [
  { id: "home", start: 2, end: 2, label: "Incoming call" },
  { id: "caller", start: 2, end: 5, label: "Connecting" },
  { id: "pickup", start: 5, end: STORY.liftEnd, label: "Picking up" },
  {
    id: "about",
    start: STORY.liftEnd,
    end: STORY.crossStart,
    label: "On the line",
  },
  {
    id: "transition",
    start: STORY.crossStart,
    end: STORY.crossEnd,
    label: "A different perspective",
  },
  {
    id: "work",
    start: STORY.crossEnd,
    end: STORY.hangupStart,
    label: "Selected work",
  },
  {
    id: "hangup",
    start: STORY.hangupStart,
    end: STORY.rest,
    label: "Until the next call",
  },
  { id: "contact", start: STORY.rest, end: STORY.end, label: "Stay in touch" },
] as const;

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
