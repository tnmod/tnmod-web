import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { STORY, clamp } from "./timeline";
import type { RevealReadiness } from "./scrollPacing";

gsap.registerPlugin(ScrollTrigger, SplitText);

export type VoiceOrigin = { x: number; y: number };

type Word = {
  left: number;
  top: number;
  set: (values: gsap.TweenVars) => void;
};
type Stream = {
  start: number;
  end: number;
  words: Word[];
  progress: number;
  completedAt: number;
};

function spokenText(element: HTMLElement) {
  const copy = element.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll("br")
    .forEach((lineBreak) => lineBreak.replaceWith(" "));
  return copy.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** Desktop-only. The owning React effect reverts this scoped context on unmount. */
export function createPortfolioMotion(
  root: HTMLElement,
  voice: HTMLElement,
  getOrigin: () => VoiceOrigin,
) {
  const streams = new Map<Element, Stream>();
  const splits: SplitText[] = [];
  const removeInteractions: (() => void)[] = [];
  const supporting = new Map<Element, gsap.core.Timeline>();
  const ease = gsap.parseEase("power3.out");
  let pulse: gsap.core.Timeline;
  let pulseVisibility: gsap.core.Tween;
  let speaking = false;
  let opening: gsap.core.Timeline;
  const positionVoice = gsap.quickSetter(voice, "css");
  const closing = root.querySelector<HTMLElement>(".hangup-section p");
  const contactSection = root.querySelector<HTMLElement>("#contact");
  const positionClosing = closing ? gsap.quickSetter(closing, "css") : null;

  const context = gsap.context(() => {
    root.classList.add("has-motion");
    root
      .querySelectorAll<HTMLElement>(".visual-link, .round-link")
      .forEach((link) => {
        const hover = gsap.timeline({ paused: true });
        const visual = link.querySelector(".project-visual");
        const arrow = link.querySelector(".project-open");
        const circle = link.querySelector(".circle-icon");
        if (visual)
          hover.to(visual, { y: -4, duration: 0.45, ease: "power2.out" }, 0);
        if (arrow) hover.to(arrow, { rotation: 45, duration: 0.45 }, 0);
        if (circle) hover.to(circle, { y: 4, duration: 0.35 }, 0);
        const enter = () => {
          hover.play();
        };
        const leave = () => {
          hover.reverse();
        };
        link.addEventListener("pointerenter", enter);
        link.addEventListener("pointerleave", leave);
        link.addEventListener("focus", enter);
        link.addEventListener("blur", leave);
        removeInteractions.push(() => {
          link.removeEventListener("pointerenter", enter);
          link.removeEventListener("pointerleave", leave);
          link.removeEventListener("focus", enter);
          link.removeEventListener("blur", leave);
        });
      });

    root.querySelectorAll<HTMLElement>(
      ".project-link, .all-work, .text-link, .contact-links a, .contact-links button",
    ).forEach((control) => {
      const hover = gsap.timeline({ paused: true, defaults: { duration: 0.28, ease: "power2.out" } })
        .to(control, { y: -3 }, 0);
      const arrow = control.querySelector(".arrow");
      if (arrow) hover.to(arrow, { x: 3, y: -3 }, 0);
      const press = gsap.timeline({ paused: true })
        .to(control, { scale: 0.97, duration: 0.12, ease: "power2.out" });
      const enter = () => { hover.play(); };
      const leave = () => {
        if (!control.matches(":focus-visible")) hover.reverse();
        press.reverse();
      };
      const blur = () => { if (!control.matches(":hover")) hover.reverse(); };
      const down = () => { press.play(); };
      const up = () => { press.reverse(); };
      control.addEventListener("pointerenter", enter);
      control.addEventListener("pointerleave", leave);
      control.addEventListener("focus", enter);
      control.addEventListener("blur", blur);
      control.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      removeInteractions.push(() => {
        control.removeEventListener("pointerenter", enter);
        control.removeEventListener("pointerleave", leave);
        control.removeEventListener("focus", enter);
        control.removeEventListener("blur", blur);
        control.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      });
    });

    // Animate the intact heading: persistent masks and automatic line re-splits
    // can otherwise leave later lines clipped after fonts/layout settle.
    const hero = root.querySelector<HTMLElement>("#hero-title");
    const heroSupport = root.querySelectorAll(".hero-description, .round-link");
    // Set every initial state now, underneath the loader. A paused timeline
    // must not defer hiding later UI until its scheduled tween starts.
    if (hero) gsap.set(hero, { y: 38, autoAlpha: 0 });
    gsap.set(heroSupport, { autoAlpha: 0, y: 20 });
    opening = gsap.timeline({ paused: true });
    if (hero) {
      opening.to(
        hero,
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.1,
          ease: "power3.out",
          clearProps: "transform,opacity,visibility",
        },
      );
    }
    opening.to(
      heroSupport,
      {
        autoAlpha: 1,
        y: 0,
        stagger: 0.15,
        duration: 0.7,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      },
      ">",
    );

    function receiverText(selector: string, start: number, end: number) {
      const heading = root.querySelector<HTMLElement>(selector);
      if (!heading) return;
      const supportSelector =
        selector === "#about-title"
          ? ".left-copy > .section-kicker, .left-copy > .body-large, .left-copy > .experience-list, .left-copy > .skill-line, .left-copy > .text-link"
          : selector === "#work-title"
            ? ".work-heading > p"
            : ".pickup-message > .small-label";
      const support = root.querySelectorAll(supportSelector);
      if (support.length) {
        supporting.set(
          heading,
          gsap
            .timeline({ paused: true })
            .fromTo(
              support,
              // Work descriptions remain readable even if a fast scroll
              // passes the heading before its support timeline plays.
              { autoAlpha: selector === "#work-title" ? 0.25 : 0, y: selector === "#work-title" ? 24 : 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.55,
                stagger: 0.09,
                ease: "power2.out",
                immediateRender: true,
              },
            ),
        );
      }
      const accessibleText = spokenText(heading);
      splits.push(
        SplitText.create(heading, {
          type: "words,lines",
          wordsClass: "receiver-word",
          autoSplit: true,
          aria: "auto",
          onSplit(self) {
            heading.setAttribute("aria-label", accessibleText);
            // Cache offsets inside the heading; its viewport position is
            // sampled each frame so smooth scrolling cannot shift the source.
            const bounds = heading.getBoundingClientRect();
            const stream: Stream = {
              start,
              end,
              progress: 0,
              completedAt: 0,
              words: self.words.map((word) => {
                const rect = word.getBoundingClientRect();
                const set = gsap.quickSetter(word, "css");
                return {
                  left: rect.left - bounds.left + rect.width / 2,
                  top: rect.top - bounds.top + rect.height / 2,
                  set: (values: gsap.TweenVars) => set(values),
                };
              }),
            };
            streams.set(heading, stream);
            gsap.set(self.words, { autoAlpha: 0, scale: 0.04, force3D: true });
            gsap.set(heading, { visibility: "visible" });
          },
        }),
      );
    }

    // The actual projected speaker is the source, not an arbitrary side offset.
    receiverText(".pickup-message p", STORY.liftStart + 0.65, STORY.liftEnd);
    receiverText("#about-title", STORY.liftEnd, STORY.liftEnd + 0.65);

    const transition = root.querySelector<HTMLElement>(".transition-section p");
    if (transition) {
      splits.push(
        SplitText.create(transition, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 110,
              rotation: -2,
              stagger: 0.14,
              ease: "power3.out",
              scrollTrigger: {
                trigger: transition,
                start: "top 83%",
                end: "top 36%",
                scrub: true,
              },
            });
          },
        }),
      );
    }

    receiverText("#work-title", STORY.crossEnd, STORY.crossEnd + 0.18);

    root.querySelectorAll<HTMLElement>(".project").forEach((project) => {
      const visual = project.querySelector(".visual-link");
      const details = project.querySelectorAll(
        ".project-heading, .project-role, .project-description, .project-bottom",
      );
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out", duration: 1 },
        scrollTrigger: {
          trigger: project,
          start: "top 86%",
          end: "top 27%",
          scrub: true,
        },
      });
      if (visual) {
        timeline.fromTo(
          visual,
          { clipPath: "inset(0% 0% 0% 100%)", x: 40 },
          { clipPath: "inset(0% 0% 0% 0%)", x: 0 },
          0,
        );
      }
      // Copy has its own viewport trigger below the image. Playing once with
      // completion on leave prevents fast scrolling from stranding it hidden.
      const copy = gsap.timeline({
        defaults: { duration: 0.65, ease: "power3.out" },
        scrollTrigger: {
          trigger: details[0] ?? project,
          start: "top 94%",
          toggleActions: "play complete complete complete",
          once: true,
          onRefresh(self) {
            if (self.scroll() > self.start) self.animation?.progress(1);
          },
        },
      });
      copy.fromTo(details, { y: 26, autoAlpha: 0.2 },
        { y: 0, autoAlpha: 1, stagger: 0.1 });
      copy.fromTo(project.querySelectorAll(".project-stack span"),
        { y: 10, scale: 0.94 },
        { y: 0, scale: 1, duration: 0.4, stagger: 0.045 }, "<0.25");
    });

    if (closing) {
      gsap.set(closing, { autoAlpha: 0, y: 16 });
    }

    // Contact stays at its final viewport position; PhoneScene fades the whole copy.

    gsap.set(voice, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    pulse = gsap.timeline({ repeat: -1, paused: true }).fromTo(
      voice.querySelectorAll(".voice-orbit"),
      { scale: 0.3, x: 0, opacity: 0.6 },
      {
        scale: 1.3,
        x: -30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.16,
        ease: "power2.out",
      },
    );
    pulseVisibility = gsap.to(voice, {
      autoAlpha: 1,
      duration: 0.2,
      paused: true,
    });
  }, root);

  ScrollTrigger.refresh();

  return {
    startOpening() {
      opening.play();
    },
    getScrollReadiness(): RevealReadiness {
      const complete = (selector: string, beat: number) => {
        const heading = root.querySelector(selector);
        if (!heading) return true;
        const stream = streams.get(heading);
        const support = supporting.get(heading);
        return !!stream && stream.progress >= 1 &&
          (!support || support.progress() >= 0.999) &&
          performance.now() - stream.completedAt >= beat;
      };
      const helloHeading = root.querySelector(".pickup-message p");
      const helloSupport = helloHeading ? supporting.get(helloHeading) : undefined;
      const workHeading = root.querySelector("#work-title");
      const workStream = workHeading ? streams.get(workHeading) : undefined;
      const aboutHeading = root.querySelector("#about-title");
      const aboutStream = aboutHeading ? streams.get(aboutHeading) : undefined;
      return {
        opening: opening.progress() >= 0.999,
        hello: !helloHeading || !!helloSupport && helloSupport.progress() >= 0.999,
        aboutTitle: !aboutHeading || !!aboutStream && aboutStream.progress >= 1,
        about: complete("#about-title", 0),
        workTitle: !workHeading || !!workStream && workStream.progress >= 1,
        work: complete("#work-title", 0),
      };
    },
    update(time: number) {
      if (positionClosing && contactSection) {
        // Share the model clock so the receiver clears the copy before reveal.
        const reveal = clamp((time - STORY.hangupStart - 0.8) / 0.35);
        const exit = clamp(
          (contactSection.getBoundingClientRect().top - window.innerHeight * 0.8) /
            (window.innerHeight * 0.2),
        );
        positionClosing({ autoAlpha: reveal * exit, y: 16 * (1 - reveal) });
      }
      const origin = getOrigin();
      let emitting = false;
      for (const [heading, stream] of streams) {
        const bounds = heading.getBoundingClientRect();
        // Wait until the heading reaches 50% from the viewport top.
        // The Blender clock remains a gate so text cannot precede pickup.
        const storyProgress = clamp(
          (time - stream.start) / (stream.end - stream.start),
        );
        const viewportProgress = clamp(
          (window.innerHeight * 0.5 - bounds.top) / (window.innerHeight * 0.25),
        );
        const progress = Math.min(storyProgress, viewportProgress);
        if (progress >= 1 && stream.progress < 1) stream.completedAt = performance.now();
        if (progress < 1) stream.completedAt = 0;
        stream.progress = progress;
        const support = supporting.get(heading);
        if (progress >= 1) {
          if (
            support?.reversed() ||
            (support?.paused() && support.progress() < 1)
          )
            support.play();
        } else if (support && !support.reversed()) {
          support.reverse();
        }
        if (progress > 0.01 && progress < 0.96) emitting = true;
        const side = origin.x > window.innerWidth / 2 ? 1 : -1;
        const count = stream.words.length;
        stream.words.forEach((word, index) => {
          const part = clamp(
            progress * 1.45 - (index / Math.max(1, count - 1)) * 0.45,
          );
          const travel = 1 - ease(part);
          word.set({
            x: (origin.x - (bounds.left + word.left)) * travel,
            y:
              (origin.y - (bounds.top + word.top)) * travel -
              Math.sin(part * Math.PI) * 45 * travel,
            scale: 0.04 + 0.96 * ease(part),
            rotation: side * 12 * travel,
            autoAlpha: clamp(part * 5),
          });
        });
      }
      if (emitting) {
        positionVoice({
          x: origin.x,
          y: origin.y,
          scaleX: origin.x > window.innerWidth / 2 ? 1 : -1,
        });
      }
      if (emitting !== speaking) {
        speaking = emitting;
        if (speaking) {
          pulse.play();
          pulseVisibility.play();
        } else {
          pulse.pause();
          pulseVisibility.reverse();
        }
      }
    },
    dispose() {
      removeInteractions.forEach((remove) => remove());
      context.revert();
      splits.forEach((split) => {
        if (split.isSplit) split.revert();
      });
      streams.clear();
      supporting.clear();
      root.classList.remove("has-motion");
    },
  };
}

export type PortfolioMotion = ReturnType<typeof createPortfolioMotion>;
