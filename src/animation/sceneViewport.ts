export const SCENE_ASPECT = 1.6;

/** Fit the Blender composition uniformly; UI and 3D share these coordinates. */
export function sceneViewport(viewportWidth: number, viewportHeight: number) {
  const width = Math.min(viewportWidth, viewportHeight * SCENE_ASPECT);
  const height = width / SCENE_ASPECT;
  return {
    width,
    height,
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
  };
}
