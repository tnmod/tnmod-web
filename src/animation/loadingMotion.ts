import gsap from "gsap";

/** One GSAP clock owns the displayed number, bar and unlock panel. */
export function createLoadingMotion(panel: HTMLElement) {
  const number = panel.querySelector<HTMLElement>(".loader-number")!;
  const bar = panel.querySelector<HTMLElement>(".loader-track > span")!;
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
    finish() {
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
