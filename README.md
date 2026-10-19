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

The 24 fps Blender timeline runs from frame 1 to 399 (16.583333 seconds). At the page top, the 0–2 second ring loops. Each document chapter maps its actual scroll height to a GLB segment, leaving enough reading space for experience and projects. Desktop uses the authored camera animation with a framing adjustment for the opening and closing compositions. Mobile at 760 px and below is a lightweight landing page: no Three.js scene, GLB request, telephone poster, or scroll animation. Animation rendering sleeps while the tab is hidden. Reduced-motion preferences and WebGL failures use a static, readable version; the toolbar allows switching modes manually.

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

The desktop-only scene imports src/animation/portfolioMotion.ts, using the installed GSAP skills' scoped-context cleanup pattern. SplitText produces accessible words and masked lines; ScrollTrigger drives the reveals in both directions. Receiver headings originate from the live, projected Info_Origin GLB node, including the camera's framing offset. Word positions are measured before transforms and interpolation uses GSAP setters. A small voice ripple accompanies active word flight. Hero and closing titles use masked line reveals; projects use directional image wipes and staggered details. The animation context and split markup are reverted when switching to mobile or simple view. Mobile never mounts this controller.

