import gsap from "gsap";

// Fictional boot assets for the portfolio's loading sequence.
const bootFiles = [
  { at: 0, file: "/boot/session.manifest.json" },
  { at: 8, file: "/scene/gxp1405.body.meshbin" },
  { at: 19, file: "/scene/receiver.geometry.bin" },
  { at: 30, file: "/scene/handset_cord.rig.bin" },
  { at: 41, file: "/materials/graphite_surface.ktx2" },
  { at: 53, file: "/display/lcd_call_states.atlas" },
  { at: 64, file: "/motion/receiver_pickup.anim" },
  { at: 74, file: "/camera/conversation.track.json" },
  { at: 83, file: "/content/project_connections.index" },
  { at: 91, file: "/motion/interface_reveal.timeline" },
  { at: 97, file: "/runtime/portfolio.entry.js" },
  { at: 100, file: "/runtime/session.ready" },
];

/** One GSAP clock owns the displayed number, bar and unlock panel. */
export function createLoadingMotion(panel: HTMLElement) {
  const number = panel.querySelector<HTMLElement>(".loader-number")!;
  const bar = panel.querySelector<HTMLElement>(".loader-track > span")!;
  const caption = panel.querySelector<HTMLElement>(".loader-caption")!;
  let previousFile = "";
  const state = { value: 0 };
  const setBar = gsap.quickSetter(bar, "scaleX");
  let actual = 0;
  let target = 0;
  let ready = false;
  let pending: gsap.core.Tween | undefined;
  let travel: gsap.core.Tween | undefined;
  let exit: gsap.core.Timeline | undefined;
  let completion: Promise<void> | undefined;
  const render = () => {
    number.textContent = String(Math.floor(state.value));
    setBar(state.value / 100);
    const current = bootFiles.findLast((entry) => state.value >= entry.at) ?? bootFiles[0];
    if (current.file !== previousFile) {
      caption.textContent = `${state.value >= 100 ? "Ready" : "Loading"} ${current.file}`;
      previousFile = current.file;
    }
  };
  const context = gsap.context(() => {
    gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(panel, { yPercent: 0 });
  }, panel);
  const advance = () => {
    if (ready) return;
    // Vary milestones, not each animation frame: GSAP interpolates continuously.
    target = Math.min(96, Math.max(target, actual) + gsap.utils.random(1, 4));
    travel?.kill();
    travel = gsap.to(state, {
      value: target,
      duration: gsap.utils.random(0.9, 1.4),
      ease: "power1.inOut",
      onUpdate: render,
    });
    pending = gsap.delayedCall(gsap.utils.random(1, 1.5), advance);
  };
  advance();
  return {
    report(value: number) {
      actual = Math.max(actual, Math.min(96, value));
    },
    finish(prepareReveal?: () => void) {
      if (completion) return completion;
      ready = true;
      pending?.kill();
      travel?.kill();
      completion = new Promise<void>((resolve) => {
        exit = gsap.timeline({ onComplete: resolve });
        exit
          .to(state, {
            value: 100,
            duration: Math.max(0.85, (100 - state.value) / 55),
            ease: "power2.inOut",
            onUpdate: render,
            onComplete: () => {
              number.textContent = "100";
              // Position the scene and settle layout while the loader still
              // fully covers it, before the panel starts moving away.
              prepareReveal?.();
            },
          })
          .to(
            panel,
            {
              yPercent: -100,
              duration: 1.1,
              ease: "power4.inOut",
            },
            ">+=0.22",
          );
      });
      return completion;
    },
    dispose() {
      pending?.kill();
      travel?.kill();
      exit?.kill();
      context.revert();
    },
  };
}
export type LoadingMotion = ReturnType<typeof createLoadingMotion>;
