import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { STORY, clamp } from "./timeline";

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
  const ease = gsap.parseEase("power3.out");
  let pulse: gsap.core.Timeline;
  let pulseVisibility: gsap.core.Tween;
  let speaking = false;
  const positionVoice = gsap.quickSetter(voice, "css");

  const context = gsap.context(() => {
    root.classList.add("has-motion");

    // One orchestrated opening: masked lines, then the supporting copy.
    const hero = root.querySelector<HTMLElement>("#hero-title");
    if (hero) {
      const label = spokenText(hero);
      splits.push(
        SplitText.create(hero, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          linesClass: "hero-motion-line",
          onSplit(self) {
            hero.setAttribute("aria-label", label);
            return gsap.from(self.lines, {
              yPercent: 115,
              rotation: 2,
              autoAlpha: 0,
              stagger: 0.13,
              duration: 1.3,
              ease: "power4.out",
            });
          },
        }),
      );
    }
    gsap.from(root.querySelectorAll(".hero-description, .round-link"), {
      autoAlpha: 0,
      y: 20,
      stagger: 0.15,
      duration: 0.9,
      delay: 0.35,
      ease: "power3.out",
    });

    function receiverText(selector: string, start: number, end: number) {
      const heading = root.querySelector<HTMLElement>(selector);
      if (!heading) return;
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

    const description = root.querySelector<HTMLElement>(".body-large");
    if (description) {
      splits.push(
        SplitText.create(description, {
          type: "words,lines",
          autoSplit: true,
          wordsClass: "reading-word",
          onSplit(self) {
            return gsap.fromTo(
              self.words,
              { opacity: 0.3 },
              {
                opacity: 1,
                stagger: 0.045,
                ease: "none",
                scrollTrigger: {
                  trigger: description,
                  start: "top 78%",
                  end: "bottom 42%",
                  scrub: true,
                },
              },
            );
          },
        }),
      );
    }

    const experience = root.querySelectorAll(".experience-list > div");
    if (experience.length) {
      gsap.from(experience, {
        x: 65,
        autoAlpha: 0,
        stagger: 0.16,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: root.querySelector(".experience-list"),
          start: "top 83%",
          toggleActions: "play none none reverse",
        },
      });
    }

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
      timeline.from(details, { x: -35, autoAlpha: 0, stagger: 0.1 }, 0.35);
    });

    const closing = root.querySelector<HTMLElement>(".hangup-section p");
    if (closing) {
      gsap.from(closing, {
        autoAlpha: 0,
        scale: 0.94,
        scrollTrigger: {
          trigger: closing,
          start: "top 85%",
          end: "top 45%",
          scrub: true,
        },
      });
    }

    const contact = root.querySelector<HTMLElement>("#contact-title");
    if (contact) {
      const label = spokenText(contact);
      splits.push(
        SplitText.create(contact, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            contact.setAttribute("aria-label", label);
            return gsap.from(self.lines, {
              yPercent: 110,
              stagger: 0.13,
              duration: 1.1,
              ease: "power4.out",
              scrollTrigger: {
                trigger: contact,
                start: "top 86%",
                toggleActions: "play none none reverse",
              },
            });
          },
        }),
      );
    }

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
    update(time: number) {
      const origin = getOrigin();
      let emitting = false;
      for (const [heading, stream] of streams) {
        const bounds = heading.getBoundingClientRect();
        // Share the Blender clock and measure in the live smoothed viewport.
        const progress = clamp(
          (time - stream.start) / (stream.end - stream.start),
        );
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
      context.revert();
      splits.forEach((split) => {
        if (split.isSplit) split.revert();
      });
      streams.clear();
      root.classList.remove("has-motion");
    },
  };
}

export type PortfolioMotion = ReturnType<typeof createPortfolioMotion>;
