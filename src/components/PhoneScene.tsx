import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { chapters, clamp, STORY } from "../animation/timeline";
import { createPortfolioMotion } from "../animation/portfolioMotion";
import type { PortfolioMotion } from "../animation/portfolioMotion";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

type Props = {
  contentRef: RefObject<HTMLElement | null>;
  onFallback: () => void;
  onProgress: (value: number) => void;
  onReady: () => Promise<void>;
};

function releaseScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const list = Array.isArray(object.material)
      ? object.material
      : [object.material];
    list.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  geometries.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
  textures.forEach((value) => value.dispose());
}

export default function PhoneScene({ contentRef, onFallback, onProgress, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callerRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const content = contentRef.current;
    if (!host || !content) return;
    let cancelled = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: window.devicePixelRatio < 2,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      onFallback();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.4 : 1.7),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentTarget.texture;
    releaseScene(environment);
    environment.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(0.3, 0.8, 0.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd9e9f0, 1.8);
    fill.position.set(-0.5, 0.2, -0.4);
    scene.add(fill, new THREE.HemisphereLight(0xf7fffa, 0x697b73, 1.8));

    let camera: THREE.PerspectiveCamera | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let model: THREE.Group | undefined;
    let screenAnchor: THREE.Object3D | undefined;
    let voiceAnchor: THREE.Object3D | undefined;
    let motion: PortfolioMotion | undefined;
    let canvasWidth = window.innerWidth;
    let canvasHeight = window.innerHeight;
    let canvasShift = 0;
    let baseFov = 30;
    let fittedFov = 30;
    let targetTime = 2;

    let active = 0;
    let atTop = true;
    let previousTimestamp = 0;
    let ringTime = 0;
    let lastRenderedTime = -1;
    let isDirty = true;
    let phasePositions: number[] = [];
    const fadeCaller = callerRef.current
      ? gsap.quickTo(callerRef.current, "opacity", { duration: 0.3, ease: "power2.out" })
      : undefined;
    const screenPosition = new THREE.Vector3();
    const screenEdge = new THREE.Vector3();
    const voicePosition = new THREE.Vector3();
    const status = document.querySelector<HTMLElement>(".connection-label");
    const progress = document.querySelector<HTMLElement>(
      ".progress-track span",
    );

    document.documentElement.classList.add("has-smooth-scroll");
    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 0.85,
      speed: 0.5,
      smoothTouch: false,
      effects: false,
    });
    const followAnchor = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const id = link?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      history.replaceState(null, "", `#${id}`);
      smoother.scrollTo(target, true, "top 15%");
    };
    document.addEventListener("click", followAnchor);
    const header = document.querySelector<HTMLElement>(".header");
    let navSample = smoother.scrollTop();
    let navHidden = false;
    let moveNav: gsap.QuickToFunc | undefined;
    const navContext = gsap.context(() => {
      if (header) {
        gsap.set(header, { yPercent: 0 });
        moveNav = gsap.quickTo(header, "yPercent", {
          duration: 0.35, ease: "power3.out",
        });
      }
    }, header ?? content);
    const showNav = () => {
      navHidden = false;
      moveNav?.(0);
    };
    header?.addEventListener("focusin", showNav);
    function updateNav(scroll: number) {
      if (scroll <= 300) {
        if (navHidden) showNav();
        navSample = scroll;
        return;
      }
      const delta = scroll - navSample;
      // Accumulate a small movement before switching to avoid direction jitter.
      if (Math.abs(delta) < 8) return;
      const hide = delta > 0 && !header?.querySelector(":focus-visible");
      if (hide !== navHidden) {
        navHidden = hide;
        moveNav?.(hide ? -105 : 0);
      }
      navSample = scroll;
    }

    function measure() {
      const viewport = window.innerHeight;
      phasePositions = chapters.map((chapter, i) => {
        const element = document.getElementById(chapter.id);
        if (!element) return 0;
        const top = element.getBoundingClientRect().top + smoother.scrollTop();
        return i === 0 ? 0 : Math.max(0, top - viewport * 0.75);
      });
      phasePositions.push(
        content!.getBoundingClientRect().bottom +
          smoother.scrollTop() -
          viewport,
      );
    }

    function updateScroll() {
      if (!phasePositions.length) return;
      const scroll = smoother.scrollTop();
      updateNav(scroll);
      atTop = scroll < 8;
      let index = 0;
      for (let i = 1; i < chapters.length; i++)
        if (scroll >= phasePositions[i]) index = i;
      active = index;
      const chapter = chapters[index];
      const start = phasePositions[index];
      const end = phasePositions[index + 1];
      const part = clamp((scroll - start) / Math.max(1, end - start));
      targetTime = chapter.start + (chapter.end - chapter.start) * part;
      if (status) status.textContent = chapter.label;
      if (progress)
        progress.style.transform = `scaleX(${clamp(scroll / Math.max(1, phasePositions.at(-1)!))})`;
      document.documentElement.dataset.chapter = chapter.id;
    }

    function resize() {
      const { width, height } = host!.getBoundingClientRect();
      canvasWidth = width;
      canvasHeight = height;
      renderer.setSize(width, height);
      if (camera) {
        camera.aspect = width / height;
        // Preserve the authored horizontal framing on narrow canvases.
        const fit = Math.min(1, camera.aspect / 1.6);
        fittedFov = THREE.MathUtils.radToDeg(
          2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov / 2)) / fit),
        );
        camera.fov = fittedFov;
        camera.updateProjectionMatrix();
      }
      isDirty = true;
      measure();
      updateScroll();
    }

    measure();
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: updateScroll,
      onRefresh: () => {
        measure();
        updateScroll();
      },
    });
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    observer.observe(content);
    const visibilityChanged = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        previousTimestamp = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      onFallback();
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);

    async function load() {
      try {
        const gltf = await new GLTFLoader().loadAsync(
          "/models/portfolio-phone.glb",
          (event) => {
            if (!cancelled) onProgress(event.total > 0 ? event.loaded / event.total * 70 : 35);
          },
        );
        if (cancelled) {
          releaseScene(gltf.scene);
          return;
        }
        model = gltf.scene;
        scene.add(model);
        const authoredCamera = gltf.cameras.find(
          (c) => c instanceof THREE.PerspectiveCamera,
        );
        if (!(authoredCamera instanceof THREE.PerspectiveCamera))
          throw new Error("The model camera is missing.");
        camera = authoredCamera;
        baseFov = camera.fov;
        screenAnchor = model.getObjectByName("Caller_Display");
        voiceAnchor = model.getObjectByName("Info_Origin");
        const clip = THREE.AnimationClip.findByName(
          gltf.animations,
          "Portfolio_Story",
        );
        if (!clip) throw new Error("The portfolio animation is missing.");
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        resize();
        mixer.setTime(atTop ? 0 : targetTime);
        onProgress(75);
        await renderer.compileAsync(scene, camera);
        onProgress(88);
        await document.fonts.ready;
        if (cancelled) return;
        scene.updateMatrixWorld(true);
        if (voiceRef.current) {
          motion = createPortfolioMotion(content!, voiceRef.current, () => {
            if (!voiceAnchor || !camera)
              return { x: canvasWidth * 0.86, y: canvasHeight * 0.2 };
            voiceAnchor.getWorldPosition(voicePosition);
            voicePosition.project(camera);
            return {
              x: (voicePosition.x * 0.5 + 0.5) * canvasWidth + canvasShift,
              y: (-voicePosition.y * 0.5 + 0.5) * canvasHeight,
            };
          });
        }
        onProgress(96);
        setLoaded(true);
        raf = requestAnimationFrame(tick);
        await onReady();
        if (!cancelled) motion?.startOpening();
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to prepare the phone scene.", error);
          onFallback();
        }
      }
    }

    function tick(timestamp: number) {
      raf = 0;
      if (cancelled || document.hidden || !camera || !mixer) return;
      const delta = Math.min(
        0.05,
        previousTimestamp ? (timestamp - previousTimestamp) / 1000 : 0,
      );
      previousTimestamp = timestamp;
      updateScroll();
      let time: number;
      if (atTop) {
        ringTime = (ringTime + delta) % STORY.ringEnd;
        time = ringTime;
      } else {
        ringTime = 0;
        time = Math.min(STORY.end - 0.00001, targetTime);
      }
      if (isDirty || Math.abs(time - lastRenderedTime) > 0.00001) {
        mixer.setTime(time);
        scene.updateMatrixWorld(true);
        const mobile = window.innerWidth <= 760;
        const opening = 1 - clamp((time - 2) / 2);
        const closing = clamp(
          (time - STORY.hangupStart) / (STORY.rest - STORY.hangupStart),
        );
        const shift = mobile ? 0 : 12 * opening + 14 * closing;
        canvasShift = (shift * window.innerWidth) / 100;
        host!.style.transform = `translateX(${shift}vw)`;
        const framing = mobile ? 1 : 1 + 0.23 * Math.max(opening, closing);
        camera.fov = THREE.MathUtils.radToDeg(
          2 *
            Math.atan(
              Math.tan(THREE.MathUtils.degToRad(fittedFov / 2)) * framing,
            ),
        );
        camera.updateProjectionMatrix();
        if (callerRef.current && screenAnchor) {
          screenAnchor.getWorldPosition(screenPosition);
          screenPosition.project(camera);
          screenEdge.set(0.020, 0, 0);
          screenAnchor.localToWorld(screenEdge);
          screenEdge.project(camera);
          const edgeX = (screenEdge.x - screenPosition.x) * canvasWidth * 0.5;
          const edgeY = -(screenEdge.y - screenPosition.y) * canvasHeight * 0.5;
          callerRef.current.style.width = `${Math.hypot(edgeX, edgeY) * 2}px`;
          callerRef.current.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(edgeY, edgeX)}rad)`;
          callerRef.current.style.left = `${(screenPosition.x * 0.5 + 0.5) * 100}%`;
          callerRef.current.style.top = `${(-screenPosition.y * 0.5 + 0.5) * 100}%`;
          fadeCaller?.(active === 1 && time > 3.3 && time <= 5.1 ? 1 : 0);
        }
        renderer.render(scene, camera);
        lastRenderedTime = time;
        isDirty = false;
      }
      motion?.update(time);
      raf = requestAnimationFrame(tick);
    }

    void load();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      trigger.kill();
      header?.removeEventListener("focusin", showNav);
      navContext.revert();
      fadeCaller?.tween.kill();
      motion?.dispose();
      smoother.kill();
      document.removeEventListener("click", followAnchor);
      document.documentElement.classList.remove("has-smooth-scroll");
      document.removeEventListener("visibilitychange", visibilityChanged);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      releaseScene(scene);
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      document.documentElement.removeAttribute("data-chapter");
    };
  }, [contentRef, onFallback, onProgress, onReady]);

  return (
    <>
      <div className={`phone-scene${loaded ? " is-ready" : ""}`} ref={hostRef}>
        {!loaded && (
          <div className="scene-loading" role="status">
            <span className="status-dot" />
            Connecting the call…
          </div>
        )}
      </div>
      <div className="voice-source" ref={voiceRef} aria-hidden="true">
        <span className="voice-orbit" />
        <span className="voice-orbit" />
        <span className="voice-orbit" />
      </div>
    </>
  );
}
