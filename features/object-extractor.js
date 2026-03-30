import {
  ImageObjectExtractor, ImageObjectExtractorHint, AIFeatureReadyState,
  IVector_RectInt32, IVector_PointInt32, packPointInt32,
} from '../generated-js/index.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DynWinRtArray } = require('dynwinrt-js');

import { loadImageBuffer } from './shared.js';

export function createObjectExtractorFeature() {
  return {
    isImageObjectExtractorReady: () => {
      try {
        return ImageObjectExtractor.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageObjectExtractor state:', error);
        return false;
      }
    },

    extractObject: async (imagePath, includePoints, excludePoints) => {
      let extractor = null;
      try {
        const imageBuffer = await loadImageBuffer(imagePath);
        extractor = await ImageObjectExtractor.createWithImageBufferAsync(imageBuffer);

        const packPoints = (pts) => (pts || []).map(p => packPointInt32(p).toValue());

        const rectsVector = IVector_RectInt32.create([]);
        const includeVector = IVector_PointInt32.create(packPoints(includePoints));
        const excludeVector = IVector_PointInt32.create(packPoints(excludePoints));

        const hint = ImageObjectExtractorHint.createInstance(rectsVector, includeVector, excludeVector);
        const maskBuffer = extractor.getImageBufferObjectMask(hint);

        const maskW = maskBuffer.pixelWidth;
        const maskH = maskBuffer.pixelHeight;
        const maskFormat = maskBuffer.pixelFormat;
        const bytesPerPixel = (maskFormat === 62) ? 1 : 4;
        const maskBufSize = maskW * maskH * bytesPerPixel;
        const maskBytes = maskBuffer.copyToByteArray(DynWinRtArray.fromU8Values(Array(maskBufSize).fill(0)));

        const origW = imageBuffer.pixelWidth;
        const origH = imageBuffer.pixelHeight;
        const origStride = imageBuffer.rowStride;
        const origBufSize = origStride * origH;
        const origBytes = imageBuffer.copyToByteArray(DynWinRtArray.fromU8Values(Array(origBufSize).fill(0)));

        return {
          width: origW, height: origH, stride: origStride,
          maskWidth: maskW, maskHeight: maskH, maskPixelFormat: maskFormat,
          maskBytes: Array.from(maskBytes),
          origBytes: Array.from(origBytes)
        };
      } catch (error) {
        console.error('Error extracting object:', error);
        return null;
      } finally {
        if (extractor) {
          try { extractor.close(); } catch (e) {}
        }
      }
    },
  };
}
