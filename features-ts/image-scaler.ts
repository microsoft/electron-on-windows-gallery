import {
  ImageScaler, AIFeatureReadyState,
} from '../generated-js/index.js';

import { loadImageBuffer } from './shared.js';
import { saveBgraToFile } from './shared.js';

interface ScaleResult {
  width: number;
  height: number;
  filePath: string;
}

export function createImageScalerFeature() {
  return {
    isImageScalerReady: (): boolean => {
      try {
        return ImageScaler.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageScaler state:', error);
        return false;
      }
    },

    scaleImage: async (imagePath: string, targetWidth: number, targetHeight: number): Promise<ScaleResult | null> => {
      let scaler: ImageScaler | null = null;
      try {
        scaler = await ImageScaler.createAsync();
        const imageBuffer = await loadImageBuffer(imagePath);
        const scaledBuffer = scaler.scaleImageBuffer(imageBuffer, targetWidth, targetHeight);
        const width = scaledBuffer.pixelWidth;
        const height = scaledBuffer.pixelHeight;
        const filePath = saveBgraToFile(scaledBuffer);
        return { width, height, filePath };
      } catch (error) {
        const msg = (error as any)?.message || String(error);
        console.error('Error scaling image:', msg, error);
        return null;
      } finally {
        if (scaler) {
          try { scaler.close(); } catch (e) {}
        }
      }
    },
  };
}
