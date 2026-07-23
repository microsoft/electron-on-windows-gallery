import {
  ImageObjectExtractor, ImageObjectExtractorHint, AIFeatureReadyState,
} from '#winapp/bindings';
import { createReadinessHelpers } from './readiness-helpers.js';

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
  maskBytes: Uint8Array;
  origBytes: Uint8Array;
}

export function createObjectExtractorFeature() {
  const inflight = new Set<AbortController>();
  const readiness = createReadinessHelpers(ImageObjectExtractor, 'OBJECT_EXTRACTOR');

  return {
    isImageObjectExtractorReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getImageObjectExtractorReadyState: (): number => readiness.getReadyState(),
    ensureImageObjectExtractorReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureImageObjectExtractorReady: (): boolean => readiness.cancelEnsureReady(),

    cancelExtractObject: (): boolean => {
      if (inflight.size === 0) return false;
      for (const c of inflight) {
        c.abort(new Error('User canceled object extraction'));
      }
      return true;
    },

    extractObject: async (imagePath: string, includePoints: PointInput[], excludePoints: PointInput[]): Promise<ExtractResult | null> => {
      const controller = new AbortController();
      inflight.add(controller);
      const signal = controller.signal;
      let extractor: ImageObjectExtractor | null = null;
      try {
        const imageBuffer = await loadImageBuffer(imagePath, signal);
        extractor = await ImageObjectExtractor.createWithImageBufferAsync(imageBuffer, signal);

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
        const maskBytes = maskBuffer.copyToByteArray(new Uint8Array(maskBufSize));

        const origW = imageBuffer.pixelWidth;
        const origH = imageBuffer.pixelHeight;
        const origStride = imageBuffer.rowStride;
        const origBufSize = origStride * origH;
        const origBytes = imageBuffer.copyToByteArray(new Uint8Array(origBufSize));

        return {
          width: origW, height: origH, stride: origStride,
          maskWidth: maskW, maskHeight: maskH, maskPixelFormat: maskFormat,
          maskBytes,
          origBytes,
        };
      } catch (error) {
        if (signal.aborted) return null;
        const msg = (error as any)?.message || String(error);
        console.error('Error extracting object:', msg, error);
        return null;
      } finally {
        if (extractor) {
          try { extractor.close(); } catch (e) {}
        }
        inflight.delete(controller);
      }
    },
  };
}
