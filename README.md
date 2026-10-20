# Phú Tín — portfolio

An English portfolio built around an animated desk telephone. Vite, React, TypeScript, Three.js and GSAP. Content comes from the supplied CV and public GitHub repositories.

## Run locally

```sh
corepack enable
yarn install
yarn dev
```

```sh
yarn build
yarn lint
yarn preview
```

## Content

- `src/content/portfolio.ts`: contact links and selected projects.
- `src/App.tsx`: introduction, experience and page copy.
- `src/animation/timeline.ts`: exact GLB timestamps and scroll chapters.
- `src/components/PhoneScene.tsx`: rendering, responsive camera framing and animation scrubbing.
- `public/models/portfolio-phone.glb`: Blender V11, with the `Portfolio_Story` clip and authored camera.
- `public/documents/nguyen-phu-tin-cv.pdf`: original CV, Vietnamese.
- `public/images/stockpc-dashboard.png`: screenshot from the public StockPC repository.

The booking illustration is an original visual treatment, not a screenshot of the live booking website. Repository details were checked on 19 October 2026. Employment details follow the supplied CV.

## Animation

The 24 fps Blender timeline runs from frame 1 to 399 (16.583333 seconds). At the page top, the 0–2 second ring loops. Each document chapter maps its actual scroll height to a GLB segment, leaving enough reading space for experience and projects. Desktop (above 760 px) uses the 3D experience by default, with the authored camera animation and framing adjustments for the opening and closing compositions. Mobile at 760 px and below is always a static, lightweight landing page: no Three.js scene, GLB request, telephone poster, or scroll animation. Animation rendering sleeps while the tab is hidden. Desktop falls back to readable static content if WebGL fails or scene preparation exceeds 20 seconds. There is no manual Simple view switch, and the system reduced-motion preference does not switch desktop out of 3D mode.

The header provides About, Work and Contact links, with a collapsible menu on mobile. Direct section links survive reloads; desktop navigation synchronizes the scene with the selected section and supports browser Back/Forward.

Desktop anchor clicks use GSAP ScrollToPlugin with distance-based duration (1.4–7 seconds) and easing weighted toward the reveal zones. About and Work land beyond their heading reveal gates so supporting copy appears without an extra wheel movement. The header remains available during the journey; a new link replaces the current route, and wheel, touch, pointer or navigation-key input interrupts it. Reloading direct links and browser history retain their immediate positioning.

The LCD follows the handset: the incoming label and ring icon blink until frame 127, pickup switches to CONNECTED, and seating the receiver at frame 375 shows CALL ENDED. Duration jumps through story milestones (00:00 → 00:48 → 01:15 → 02:35 → … → 05:42), then freezes at 05:42. These shared values live in `src/animation/callMilestones.json`; pausing, reverse scrolling and direct navigation always retain the matching duration. Reduced motion keeps the incoming label steady. The shared LCD atlas lives in `public/images/lcd/`. The LCD appears at emission strength 1.6, while Blender illumination and reflection rays retain the original 0.8 strength so the brighter screen does not brighten the casing. Web brightness is confined to the LCD material.

## Deploy to a 1 GB VPS

Build on your own machine or CI, then copy the contents of `dist/` to Nginx's site directory. There is no Node server required in production. Set your domain and TLS configuration on the server.

Example Nginx location blocks:

```nginx
root /var/www/tnmod-web;
index index.html;

location / {
    try_files $uri $uri/ /index.html;
}
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
location ~* \.(glb|png|pdf|svg)$ {
    expires 7d;
    try_files $uri =404;
}
```

The GLB remains the original lossless asset. Compressing its textures further is optional and should preserve material appearance and the baked animation. Before a public launch, add your final domain and absolute social-preview image URL to `index.html`.

## Desktop text choreography

Desktop scroll pacing uses native wheel and PageDown/Space/ArrowDown input before ScrollSmoother. Incoming call has no slowdown or hold. Pickup slows by 35% only after frame 127 (LCD ANSWER/CONNECTED), with two pixels of frame-boundary clearance and a following 100 content-pixel allowance. Hello slows only until its On the other end label is fully revealed, then immediately returns to baseline. Interfaces itself scrolls at baseline speed; once its heading is fully revealed, scrolling slows by 90% only until all biography, experience, skills and supporting-link animations finish, then keeps the same slow rate for an extra downward distance equal to 20% of its layout-based reveal span before returning to baseline. The start is unchanged. The transition retains its lighter pacing. Selected connections itself scrolls normally; only after its title finishes does a 90% slowdown accompany the two supporting paragraphs, extending 20% of its layout-based reveal span below the old endpoint after both are fully visible, with its start unchanged. Project images and the closing sections retain the previous speed. Reverse scrolling, navigation links, scrollbar dragging, Home/End, browser zoom, nested scroll areas and mobile remain freely navigable. `src/animation/scrollPacing.ts` integrates input across zone boundaries.

Fast downward input also has a rendered-position guard: near pickup, Hello, Interfaces and Selected connections, the native target can lead the visible scene by at most 12vh (minimum 32px). Supporting-copy gates hold at reachable completion positions until their real animation readiness releases them. Heading completion positions account for both viewport placement and the phone story clock. Excess wheel input is discarded instead of queued, preventing a burst after release. Ordinary small wheel input retains the rates above; the title approach guard only limits input that runs ahead of the visible animation.

The desktop-only scene imports src/animation/portfolioMotion.ts, using scoped-context cleanup. SplitText produces accessible words and masked lines; ScrollTrigger drives the reveals in both directions. Receiver headings originate from the live, projected Info_Origin GLB node, including the camera's framing offset. Word positions are measured before transforms and interpolation uses GSAP setters. A small voice ripple accompanies active word flight. The hero and contact titles use intact-heading reveals to keep every line readable; projects use directional image wipes and staggered details. The animation context and split markup are reverted when switching to mobile or when a scene failure triggers the static fallback. Mobile never mounts this controller.


Scroll pacing tracks before/active/tail/done states for Interfaces and Selected connections. Tail length is 20% of the larger of the 25vh heading reveal distance and its story-clock reveal distance, independent of wheel activity while supporting copy animates. Pending gates no longer release merely because the native target passed their endpoint; new input also uses the rate of the rendered scene when it lags behind the target. There is no per-frame native-scroll correction. Interfaces retains its extra 100px allowance while supporting copy appears.


## Night mode experiment

The header theme button switches between day and night without reloading the 3D scene or resetting scroll. Night mode is the default for this experiment; the selection is remembered locally. A script in the document head applies the palette before first paint. Mobile retains the static layout with the same theme control.

Night lighting uses a dim cool environment and a small green light that follows the LCD surface. A restrained bloom pass keeps the backlight visible while preserving pixel text contrast; its additive blend preserves canvas transparency. At hangup the halo and local spill dim. Day mode uses the original lighting and skips postprocessing. The original GLB is shared by both modes.
