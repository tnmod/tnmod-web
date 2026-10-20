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

The 24 fps Blender timeline runs from frame 1 to 399 (16.583333 seconds). At the page top, the 0–2 second ring loops. Each document chapter maps its actual scroll height to a GLB segment, leaving enough reading space for experience and projects. Desktop (above 760 px) uses the 3D experience by default, with the authored camera animation and framing adjustments for the opening and closing compositions. Mobile at 760 px and below is always a static, lightweight landing page: no Three.js scene, GLB request, telephone poster, or scroll animation. Animation rendering sleeps while the tab is hidden. Desktop falls back to readable static content if WebGL fails or scene preparation exceeds 20 seconds of visible-tab time. Switching away pauses this budget; returning refreshes the layout and resumes one render loop once the scene is ready. There is no manual Simple view switch, and the system reduced-motion preference does not switch desktop out of 3D mode.

The header provides About, Work and Contact links, with a collapsible menu on mobile. Section controls scroll without changing the URL or adding browser history entries; desktop navigation synchronizes the scene with the selected section.

Desktop section navigation use GSAP ScrollToPlugin with distance-based duration (1.4–7 seconds) and easing weighted toward the reveal zones. About and Work land beyond their heading reveal gates so supporting copy appears without an extra wheel movement. The header remains available during the journey; a new link replaces the current route, and wheel, touch, pointer or navigation-key input interrupts it. Reloading starts at the top; section navigation does not create URL fragments.

The LCD follows the handset: the incoming label and ring icon blink until pickup begins at frame 121, pickup switches to CONNECTED, and seating the receiver at frame 375 shows CALL ENDED. Duration jumps through story milestones (00:00 → 00:48 → 01:15 → 02:35 → … → 05:42), then freezes at 05:42. These shared values live in `src/animation/callMilestones.json`; pausing, reverse scrolling and section navigation always retain the matching duration. Reduced motion keeps the incoming label steady. The shared LCD atlas lives in `public/images/lcd/`. The LCD appears at emission strength 1.6, while Blender illumination and reflection rays retain the original 0.8 strength so the brighter screen does not brighten the casing. Web brightness is confined to the LCD material.

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

Desktop scrolling uses one baseline speed through every section. Wheel and PageDown/Space/ArrowDown input is capped against the rendered position only while a required reveal is unfinished; excess fast input is discarded instead of queued. Once the animation completes, the cap releases immediately. There are no section speed multipliers, post-reveal slow tails, or distance-weighted navigation routes. Reverse scrolling, nested scroll areas and mobile retain their existing behavior.

Fast downward input also has a rendered-position guard: near pickup, Hello, Interfaces and Selected connections, the native target can lead the visible scene by at most 12vh (minimum 32px). Supporting-copy gates hold at reachable completion positions until their real animation readiness releases them. Heading completion positions account for both viewport placement and the phone story clock. Excess wheel input is discarded instead of queued, preventing a burst after release. Ordinary small wheel input retains the rates above; the title approach guard only limits input that runs ahead of the visible animation.

The desktop-only scene imports src/animation/portfolioMotion.ts, using scoped-context cleanup. SplitText produces accessible words and masked lines; ScrollTrigger drives the reveals in both directions. Receiver headings originate from the live, projected Info_Origin GLB node, including the camera's framing offset. Word positions are measured before transforms and interpolation uses GSAP setters. A small voice ripple accompanies active word flight. The hero and contact titles use intact-heading reveals to keep every line readable; projects use directional image wipes and staggered details. The animation context and split markup are reverted when switching to mobile or when a scene failure triggers the static fallback. Mobile never mounts this controller.




## Night mode experiment

The header theme button switches between day and night without reloading the 3D scene or resetting scroll. Night mode is the default for this experiment; the selection is remembered locally. A script in the document head applies the palette before first paint. Mobile retains the static layout with the same theme control.

Night lighting uses a dim cool environment and a small green light that follows the LCD surface. A restrained bloom pass keeps the backlight visible while preserving pixel text contrast; its additive blend preserves canvas transparency. At hangup the halo and local spill dim. Day mode uses the original lighting and skips postprocessing. The original GLB is shared by both modes.

## Ringtone

Desktop uses the supplied Mixkit recording (`mixkit-office-telephone-ring-1350.wav`), copied unchanged to `public/audio/office-telephone-ring.wav`. It loops at 35% volume while the revealed phone is ringing, stops at pickup, and pauses whenever the tab is hidden. Returning to the ringing scene restarts the recording. Mobile and the static fallback do not play it.

The sound control appears at the lower right and remembers a mute preference. When autoplay is blocked, Enable sound or another page interaction retries playback; a rejected play promise never blocks the scene or loader.

The supplied `picking-up-desk-office-phone-3-www.mp3` is copied unchanged to `public/audio/handset-switch.mp3`. A one-shot mechanical click plays at hook transitions (pickup at frame 121, seating at frame 375), including reverse scrolling. Initial poses and returning from a hidden tab seed the hook state silently; no past click is queued. The same sound button mutes both recordings and hidden tabs stop both immediately.

The supplied `hang-up-call.mp3` is copied unchanged to `public/audio/call-disconnected.mp3`. The disconnect beeps play once upon entering CALL ENDED at frame 375. Holding the scroll position does not repeat them; reversing out of the ended state, muting or hiding the tab stops playback. Initial/resumed ended poses do not replay a past disconnect.

At CALL ENDED the LCD turns red and pulses between bright and dim at a 1.5-second interval, driven by wall time so it continues at stationary scroll. The message and frozen 05:42 duration remain readable in both phases. Reduced motion keeps a steady red screen. The nearby light follows the same red palette and pulse; reversing into the connected state restores green.

The closing camera is authored in Blender (`portfolio-story-v22-contact-brand-alignment.blend`) and exported into the GLB's `Portfolio_Story` clip. Its baked position and rotation ease into a perpendicular view of the LCD with level edges and an additional 40% dolly magnification. Closing framing shows the complete handset head and top of the phone, with the lower keypad cropped. The camera places the GRANDSTREAM branding level with the first Contact heading line in the shared 16:10 stage. The web renderer plays these camera tracks directly; it does not override the closing camera orientation or zoom. Mobile keeps its static layout.

## Responsive composition

Desktop rendering fits the authored 16:10 camera into a centered, uniformly scaled stage instead of stretching the canvas to each viewport aspect. `sceneViewport.ts` calculates this rectangle; the scene and Contact copy use the same width, height and offsets. Horizontal scene placement is relative to the stage, and projected voice origins include its viewport offsets. Closing camera orientation and zoom remain authored in Blender.

Contact heading size, spacing and position scale with that stage. The Contact copy is fixed outside the smooth-scrolling content as the footer appears. This avoids viewport-dependent drift between CSS text and the GLB camera. Window resizing preserves the current story chapter and progress, cancels stale navigation destinations and refreshes the shared stage. Mobile/static layouts retain their existing flow.

The desktop Contact copy is rendered outside smooth-content and fixed to the viewport, so its heading, email and links stay beside the phone through the footer without scroll compensation. The whole block fades in without a vertical title animation.

The footer credits are nested under the Contact links, within the same copy block, rather than rendered as a bottom bar. A scoped GSAP closing timeline fades and sharpens the Contact copy, draws the footer divider and staggers its controls into view. Entry starts when Contact reaches 45% of the viewport, so the reveal remains visible as the phone settles. Re-entering restarts the animation. Reversing out hides the composition; reduced motion retains staggered opacity fades while removing blur and vertical travel. Mobile/static keeps the complete Contact block in normal document flow.
