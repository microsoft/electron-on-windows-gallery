import {
  ImageScaler, AIFeatureReadyState,
} from '../generated-js/index.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DynWinRtArray } = require('dynwinrt-js');

import { loadImageBuffer } from './shared.js';

export function createImageScalerFeature() {
  return {
    isImageScalerReady: () => {
      try {
        return ImageScaler.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageScaler state:', error);
        return false;
      }
    },

    scaleImage: async (imagePath, targetWidth, targetHeight) => {
      let scaler = null;
      try {
        scaler = await ImageScaler.createAsync();
        const imageBuffer = await loadImageBuffer(imagePath);
        const scaledBuffer = scaler.scaleImageBuffer(imageBuffer, targetWidth, targetHeight);
        const width = scaledBuffer.pixelWidth;
        const height = scaledBuffer.pixelHeight;
        const stride = scaledBuffer.rowStride;
        const bufSize = stride * height;
        const fillBuf = DynWinRtArray.fromU8Values(Array(bufSize).fill(0));
        const pixels = scaledBuffer.copyToByteArray(fillBuf);
        return { width, height, stride, pixels: Array.from(pixels) };
      } catch (error) {
        console.error('Error scaling image:', error);
        return null;
      } finally {
        if (scaler) {
          try { scaler.close(); } catch (e) {}
        }
      }
    },
  };
}
