import * as THREE from "three";
import glyphs from "./lcdFont.json";
import { STORY } from "./timeline";
import milestones from "./callMilestones.json";

// Blender frame 127: the receiver has left the hook. Frame 375: it is seated.
export const CALL = { answer: 126 / 24, end: STORY.rest } as const;
export type CallState = "ringing" | "connected" | "ended";

export function callStateAt(time: number): CallState {
  return time < CALL.answer ? "ringing" : time < CALL.end ? "connected" : "ended";
}

export function callDurationAt(time: number): number {
  // Use the same discrete story milestones in Blender and on the web.
  // Rounding avoids floating point errors at exact GLB frame boundaries.
  const frame = Math.floor(time * 24 + 1 + 1e-6);
  return milestones.findLast((milestone) => frame >= milestone.frame)?.seconds ?? 0;
}

export async function createCallDisplay(model: THREE.Object3D) {
  const lcd = model.getObjectByName("LCD_Display");
  if (!(lcd instanceof THREE.Mesh)) throw new Error("The LCD surface is missing.");
  const material = lcd.material as THREE.MeshStandardMaterial;
  const atlas = await new THREE.ImageLoader().loadAsync("/images/lcd/call-states.png");
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 368;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to initialize the LCD display.");
  ctx.imageSmoothingEnabled = false;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false; // Match the glTF LCD UV convention.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const oldTextures = new Set([material.map, material.emissiveMap]);
  material.map = texture;
  // Blender's emission surface can import as MeshBasicMaterial.
  if ("emissiveMap" in material) {
    material.emissiveMap = texture;
    // The LCD is self-lit; its brightness never changes the scene lights,
    // exposure or any material on the phone body.
    material.color.setRGB(0, 0, 0);
    material.emissive.setRGB(1, 1, 1);
    material.emissiveIntensity = 1.6;
  }
  material.needsUpdate = true;
  oldTextures.forEach((old) => old?.dispose());

  let lastKey = "";
  function update(time: number, reducedMotion: boolean) {
    const state = callStateAt(time);
    const seconds = callDurationAt(time);
    const row = state === "ringing"
      ? (reducedMotion || performance.now() % 1000 < 600 ? 0 : 1)
      : state === "connected" ? 2 : 13;
    const key = `${row}:${seconds}`;
    if (key === lastKey) return false;
    lastKey = key;
    ctx!.drawImage(atlas, 0, row * 368, 1024, 368, 0, 0, 1024, 368);
    if (state !== "ringing") {
      // Render the story duration; hangup and reverse scrolling are deterministic.
      ctx!.drawImage(atlas, 560, 281, 220, 23, 560, 247, 220, 56);
      const value = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
      const font = glyphs as Record<string, string[]>;
      ctx!.fillStyle = "rgb(215,232,180)";
      const x = 665 - (value.length * 6 - 1) * 3;
      [...value].forEach((ch, i) => font[ch]?.forEach((line, r) => {
        [...line].forEach((bit, c) => {
          if (bit === "1") ctx!.fillRect(x + (i * 6 + c) * 6, 254 + r * 6, 4, 4);
        });
      }));
    }
    texture.needsUpdate = true;
    return true;
  }
  return { update, dispose: () => texture.dispose() };
}
