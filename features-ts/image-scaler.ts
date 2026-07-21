import {
  ImageScaler, AIFeatureReadyState,
} from '#winapp/bindings';
import { createReadinessHelpers } from './readiness-helpers.js';

import { loadImageBuffer } from './shared.js';
import { saveBgraToFile } from './shared.js';

interface ScaleResult {
  width: number;
  height: number;
  filePath: string;
}

export function createImageScalerFeature() {
  const inflight = new Set<AbortController>();
  const readiness = createReadinessHelpers(ImageScaler, 'IMAGE_SCALER');

  return {
    isImageScalerReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getImageScalerReadyState: (): number => readiness.getReadyState(),
    ensureImageScalerReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureImageScalerReady: (): boolean => readiness.cancelEnsureReady(),

    cancelScaleImage: (): boolean => {
      if (inflight.size === 0) return false;
      for (const c of inflight) {
        c.abort(new Error('User canceled image scaling'));
      }
      return true;
    },

    scaleImage: async (imagePath: string, targetWidth: number, targetHeight: number): Promise<ScaleResult | null> => {
      const controller = new AbortController();
      inflight.add(controller);
      const signal = controller.signal;
      let scaler: ImageScaler | null = null;
      try {
        scaler = await ImageScaler.createAsync(signal);
        const imageBuffer = await loadImageBuffer(imagePath, signal);
        const scaledBuffer = scaler.scaleImageBuffer(imageBuffer, targetWidth, targetHeight);
        const width = scaledBuffer.pixelWidth;
        const height = scaledBuffer.pixelHeight;
        const filePath = saveBgraToFile(scaledBuffer);
        return { width, height, filePath };
      } catch (error) {
        if (signal.aborted) return null;
        const msg = (error as any)?.message || String(error);
        console.error('Error scaling image:', msg, error);
        return null;
      } finally {
        if (scaler) {
          try { scaler.close(); } catch (e) {}
        }
        inflight.delete(controller);
      }
    },
  };
}
