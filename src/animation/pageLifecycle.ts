/** Background tab throttling must not consume the scene's loading budget. */
export function visibleTimeout(callback: () => void, delay: number) {
  let remaining = delay;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const pause = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  };
  const update = () => {
    pause();
    if (disposed || document.hidden) return;
    startedAt = performance.now();
    timer = setTimeout(() => {
      timer = undefined;
      dispose();
      callback();
    }, remaining);
  };
  const dispose = () => {
    disposed = true;
    pause();
    document.removeEventListener("visibilitychange", update);
  };
  document.addEventListener("visibilitychange", update);
  update();
  return dispose;
}

/** Own one frame chain, starting only after asynchronous scene preparation. */
export function visibleFrameLoop(frame: (timestamp: number) => void, resume: () => void) {
  let ready = false;
  let disposed = false;
  let raf: number | undefined;
  const schedule = () => {
    if (!disposed && ready && !document.hidden && raf === undefined) {
      raf = requestAnimationFrame(tick);
    }
  };
  const tick = (timestamp: number) => {
    raf = undefined;
    if (disposed || !ready || document.hidden) return;
    frame(timestamp);
    schedule();
  };
  const update = () => {
    if (raf !== undefined) cancelAnimationFrame(raf);
    raf = undefined;
    if (disposed || !ready || document.hidden) return;
    resume();
    schedule();
  };
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pageshow", update);
  return {
    start() {
      if (ready || disposed) return;
      ready = true;
      update();
    },
    dispose() {
      disposed = true;
      if (raf !== undefined) cancelAnimationFrame(raf);
      raf = undefined;
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pageshow", update);
    },
  };
}
