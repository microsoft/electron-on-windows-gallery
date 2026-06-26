import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageObjectRemover, AIFeatureReadyState } from '../.winapp/bindings/index.js';
import { createReadinessHelpers } from './readiness-helpers.js';

import { loadImageBuffer, loadSoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode, SoftwareBitmap, ImageBuffer } from './shared.js';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RemoveResult {
  width: number;
  height: number;
  stride: number;
  pixels: Uint8Array;
}

function createGray8MaskFile(filePath: string, width: number, height: number, rect: Rect): void {
  const paletteSize = 256 * 4;
  const rowBytes = (width + 3) & ~3;
  const pixelDataSize = rowBytes * height;
  const headerSize = 14 + 40 + paletteSize;
  const fileSize = headerSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize, 0);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(headerSize, 10);

  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(8, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(256, 46);
  buf.writeUInt32LE(256, 50);

  for (let i = 0; i < 256; i++) {
    const off = 54 + i * 4;
    buf[off] = i;
    buf[off + 1] = i;
    buf[off + 2] = i;
    buf[off + 3] = 0;
  }

  const rx = Math.max(0, Math.round(rect.x));
  const ry = Math.max(0, Math.round(rect.y));
  const rw = Math.min(Math.round(rect.width), width - rx);
  const rh = Math.min(Math.round(rect.height), height - ry);
  for (let row = ry; row < ry + rh; row++) {
    for (let col = rx; col < rx + rw; col++) {
      buf[headerSize + row * rowBytes + col] = 255;
    }
  }

  fs.writeFileSync(filePath, buf);
}

export function createObjectRemoverFeature() {
  const inflight = new Set<AbortController>();
  const readiness = createReadinessHelpers(ImageObjectRemover, 'OBJECT_REMOVER');

  return {
    isImageObjectRemoverReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getImageObjectRemoverReadyState: (): number => readiness.getReadyState(),
    ensureImageObjectRemoverReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureImageObjectRemoverReady: (): boolean => readiness.cancelEnsureReady(),

    cancelRemoveObject: (): boolean => {
      if (inflight.size === 0) return false;
      for (const c of inflight) {
        c.abort(new Error('User canceled object removal'));
      }
      return true;
    },

    removeObject: async (imagePath: string, rect: Rect): Promise<RemoveResult | null> => {
      const controller = new AbortController();
      inflight.add(controller);
      const signal = controller.signal;
      let remover: ImageObjectRemover | null = null;
      try {
        remover = await ImageObjectRemover.createAsync(signal);
        const imageBitmap = await loadSoftwareBitmap(imagePath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, signal);
        const imgW = imageBitmap.pixelWidth;
        const imgH = imageBitmap.pixelHeight;

        const maskPath = path.join(os.tmpdir(), `mask_${Date.now()}.bmp`);
        createGray8MaskFile(maskPath, imgW, imgH, rect);
        const maskBgra = await loadSoftwareBitmap(maskPath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, signal);
        const maskGray = SoftwareBitmap.convert(maskBgra, BitmapPixelFormat.Gray8);
        try { fs.unlinkSync(maskPath); } catch (e) {}

        const resultBitmap = remover.removeFromSoftwareBitmap(imageBitmap, maskGray);

        const resultBuffer = ImageBuffer.createForSoftwareBitmap(resultBitmap);
        const w = resultBuffer.pixelWidth;
        const h = resultBuffer.pixelHeight;
        const stride = resultBuffer.rowStride;
        const bufSize = stride * h;
        const pixels = resultBuffer.copyToByteArray(new Uint8Array(bufSize));
        return {
          width: w,
          height: h,
          stride: stride,
          pixels,
        };
      } catch (error) {
        if (signal.aborted) return null;
        const msg = (error as any)?.message || String(error);
        console.error('Error removing object:', msg, error);
        return null;
      } finally {
        if (remover) {
          try { remover.close(); } catch (e) {}
        }
        inflight.delete(controller);
      }
    },
  };
}
