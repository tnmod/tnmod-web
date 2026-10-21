import { PerspectiveCamera, Vector3 } from 'three';
import framing from './phoneCameraFraming.json';

/** Web close-ups are applied after the full-phone camera animation from Blender. */
export function createPhoneCameraFraming() {
  const offset = new Vector3();
  const nextOffset = new Vector3();
  const appliedOffset = new Vector3();
  let framedCamera: PerspectiveCamera | undefined;
  return {
    // Undo before mixer.setTime: unchanged tracks can skip writing on redraws.
    reset() {
      if (framedCamera) framedCamera.position.sub(appliedOffset);
      framedCamera = undefined;
    },
    apply(camera: PerspectiveCamera, time: number, amount = 1) {
      const sample = Math.max(0, Math.min(framing.offsets.length - 1, time * framing.fps - framing.firstFrame));
      const index = Math.floor(sample);
      offset.fromArray(framing.offsets[index]);
      nextOffset.fromArray(framing.offsets[Math.min(index + 1, framing.offsets.length - 1)]);
      offset.lerp(nextOffset, sample - index).multiplyScalar(amount);
      appliedOffset.copy(offset).applyQuaternion(camera.quaternion);
      camera.position.add(appliedOffset);
      framedCamera = camera;
    },
  };
}
