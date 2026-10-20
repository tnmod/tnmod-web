export type RingSoundState = "on" | "muted" | "waiting" | "unavailable";

/** Native looping preserves the recording's ring/pause cadence. */
export function createRingSound(onState: (state: RingSoundState) => void) {
  const audio = new Audio("/audio/office-telephone-ring.wav");
  audio.preload = "none";
  audio.loop = true;
  audio.volume = 0.35;
  const handset = new Audio("/audio/handset-switch.mp3");
  handset.preload = "auto";
  handset.volume = 0.45;
  const disconnect = new Audio("/audio/call-disconnected.mp3");
  disconnect.preload = "auto";
  disconnect.volume = 0.35;
  let lastEnded: boolean | undefined;
  let disconnectGeneration = 0;
  let lastOnHook: boolean | undefined;
  let handsetGeneration = 0;
  let enabled = true;
  try { enabled = localStorage.getItem("portfolio-ring-sound") !== "muted"; } catch { /* Optional storage. */ }
  let ringing = false;
  let disposed = false;
  let pending = false;
  let failed = false;
  let state: RingSoundState = enabled ? "waiting" : "muted";
  const report = (next: RingSoundState) => {
    if (disposed || state === next) return;
    state = next;
    onState(next);
  };
  onState(state);
  const shouldPlay = () => !disposed && !failed && enabled && ringing && !document.hidden;
  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
  };
  const stopHandset = () => {
    handsetGeneration++;
    handset.pause();
    handset.currentTime = 0;
  };
  const playHandset = () => {
    stopHandset();
    if (disposed || !enabled || document.hidden) return;
    const generation = handsetGeneration;
    void handset.play().then(() => {
      if (disposed || !enabled || document.hidden) { stopHandset(); return; }
      if (generation !== handsetGeneration) return;
      report("on");
    }).catch((error: unknown) => {
      if (disposed || generation !== handsetGeneration || !enabled) return;
      if ((error as { name?: string })?.name === "NotAllowedError") report("waiting");
    });
  };
  const stopDisconnect = () => {
    disconnectGeneration++;
    disconnect.pause();
    disconnect.currentTime = 0;
  };
  const playDisconnect = () => {
    stopDisconnect();
    if (disposed || !enabled || document.hidden) return;
    const generation = disconnectGeneration;
    void disconnect.play().then(() => {
      if (disposed || !enabled || document.hidden || !lastEnded) { stopDisconnect(); return; }
      if (generation !== disconnectGeneration) return;
      report("on");
    }).catch((error: unknown) => {
      if (disposed || generation !== disconnectGeneration || !enabled) return;
      if ((error as { name?: string })?.name === "NotAllowedError") report("waiting");
    });
  };
  const visibilityChanged = () => {
    if (document.hidden) {
      lastOnHook = undefined;
      lastEnded = undefined;
      stopHandset();
      stopDisconnect();
    }
    sync();
  };
  const sync = () => {
    if (!shouldPlay()) { stop(); return; }
    if (pending || !audio.paused) return;
    pending = true;
    void audio.play().then(() => {
      pending = false;
      if (!shouldPlay()) stop();
      else report("on");
    }).catch((error: unknown) => {
      pending = false;
      if (disposed) return;
      const name = (error as { name?: string })?.name;
      if (name === "NotAllowedError") { if (enabled) report("waiting"); }
      else if (name === "AbortError") { if (shouldPlay()) sync(); }
      else { failed = true; report("unavailable"); }
    });
  };
  const interact = (event: Event) => {
    // The sound button owns its own action, including muting an active ring.
    if (event.target instanceof Element && event.target.closest("[data-ring-sound]")) return;
    if (event instanceof KeyboardEvent && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
    if (enabled && state === "waiting") sync();
  };
  document.addEventListener("click", interact);
  document.addEventListener("keydown", interact);
  document.addEventListener("visibilitychange", visibilityChanged);
  return {
    update(next: boolean) {
      if (ringing === next || disposed) return;
      ringing = next;
      sync();
    },
    updateHandset(onHook: boolean | null) {
      if (disposed) return;
      if (onHook === null || document.hidden) { lastOnHook = undefined; return; }
      // Seed initial/resumed poses silently. Only a visible hook transition clicks.
      const changed = lastOnHook !== undefined && lastOnHook !== onHook;
      lastOnHook = onHook;
      if (changed) playHandset();
    },
    updateDisconnected(ended: boolean | null) {
      if (disposed) return;
      if (ended === null || document.hidden) {
        lastEnded = undefined;
        stopDisconnect();
        return;
      }
      if (ended === lastEnded) return;
      const justEnded = lastEnded === false && ended;
      lastEnded = ended;
      if (justEnded) playDisconnect();
      else if (!ended) stopDisconnect();
    },
    setEnabled(next: boolean) {
      if (disposed || failed) return;
      enabled = next;
      try { localStorage.setItem("portfolio-ring-sound", next ? "on" : "muted"); } catch { /* Optional storage. */ }
      if (!next) {
        stopHandset();
        stopDisconnect();
        report("muted");
      } else report("on");
      sync();
    },
    dispose() {
      disposed = true;
      document.removeEventListener("click", interact);
      document.removeEventListener("keydown", interact);
      document.removeEventListener("visibilitychange", visibilityChanged);
      stop();
      audio.removeAttribute("src");
      audio.load();
      stopHandset();
      handset.removeAttribute("src");
      handset.load();
      stopDisconnect();
      disconnect.removeAttribute("src");
      disconnect.load();
    },
  };
}
