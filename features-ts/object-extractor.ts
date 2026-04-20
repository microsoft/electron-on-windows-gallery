import {
  ImageObjectExtractor, ImageObjectExtractorHint, AIFeatureReadyState,
} from '../generated-js/index.js';

import { loadImageBuffer } from './shared.js';

interface PointInput {
  x: number;
  y: number;
}

interface ExtractResult {
  width: number;
  height: number;
  stride: number;
  maskWidth: number;
  maskHeight: number;
  maskPixelFormat: number;
  maskBytes: number[];
  origBytes: number[];
}

export function createObjectExtractorFeature() {
  return {
    isImageObjectExtractorReady: (): boolean => {
      try {
        return ImageObjectExtractor.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageObjectExtractor state:', error);
        return false;
      }
    },

    extractObject: async (imagePath: string, includePoints: PointInput[], excludePoints: PointInput[]): Promise<ExtractResult | null> => {
      let extractor: ImageObjectExtractor | null = null;
      try {
        const imageBuffer = await loadImageBuffer(imagePath);
        extractor = await ImageObjectExtractor.createWithImageBufferAsync(imageBuffer);

        const hint = ImageObjectExtractorHint.createInstance(
          [],
          includePoints.map(p => ({ x: p.x, y: p.y })),
          excludePoints.map(p => ({ x: p.x, y: p.y })),
        );
        const maskBuffer = extractor.getImageBufferObjectMask(hint);

        const maskW = maskBuffer.pixelWidth;
        const maskH = maskBuffer.pixelHeight;
        const maskFormat = maskBuffer.pixelFormat;
        const bytesPerPixel = (maskFormat === 62) ? 1 : 4;
        const maskBufSize = maskW * maskH * bytesPerPixel;
        const maskBytes = maskBuffer.copyToByteArray(new Array(maskBufSize).fill(0));

        const origW = imageBuffer.pixelWidth;
        const origH = imageBuffer.pixelHeight;
        const origStride = imageBuffer.rowStride;
        const origBufSize = origStride * origH;
        const origBytes = imageBuffer.copyToByteArray(new Array(origBufSize).fill(0));

        return {
          width: origW, height: origH, stride: origStride,
          maskWidth: maskW, maskHeight: maskH, maskPixelFormat: maskFormat,
          maskBytes: Array.from(maskBytes),
          origBytes: Array.from(origBytes)
        };
      } catch (error) {
        const msg = (error as any)?.message || String(error);
        console.error('Error extracting object:', msg, error);
        return null;
      } finally {
        if (extractor) {
          try { extractor.close(); } catch (e) {}
        }
      }
    },
  };
}
