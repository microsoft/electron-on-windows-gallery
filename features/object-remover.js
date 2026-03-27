import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageObjectRemover, AIFeatureReadyState } from '../generated-js/index.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DynWinRtArray } = require('dynwinrt-js');

import { loadImageBuffer, loadSoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode, SoftwareBitmap, ImageBuffer } from './shared.js';

function createGray8MaskFile(filePath, width, height, rect) {
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
  return {
    isImageObjectRemoverReady: () => {
      try {
        return ImageObjectRemover.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageObjectRemover state:', error);
        return false;
      }
    },

    removeObject: async (imagePath, rect) => {
      let remover = null;
      try {
        remover = await ImageObjectRemover.createAsync();
        const imageBitmap = await loadSoftwareBitmap(imagePath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
        const imgW = imageBitmap.pixelWidth;
        const imgH = imageBitmap.pixelHeight;

        const maskPath = path.join(os.tmpdir(), `mask_${Date.now()}.bmp`);
        createGray8MaskFile(maskPath, imgW, imgH, rect);
        const maskBgra = await loadSoftwareBitmap(maskPath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
        const maskGray = SoftwareBitmap.convert(maskBgra, BitmapPixelFormat.Gray8);
        try { fs.unlinkSync(maskPath); } catch (e) {}

        const resultBitmap = remover.removeFromSoftwareBitmap(imageBitmap, maskGray);

        const resultBuffer = ImageBuffer.createForSoftwareBitmap(resultBitmap);
        const w = resultBuffer.pixelWidth;
        const h = resultBuffer.pixelHeight;
        const stride = resultBuffer.rowStride;
        const bufSize = stride * h;
        const fillBuf = DynWinRtArray.fromU8Values(Array(bufSize).fill(0));
        const pixels = resultBuffer.copyToByteArray(fillBuf);
        return {
          width: w,
          height: h,
          stride: stride,
          pixels: Array.from(pixels)
        };
      } catch (error) {
        console.error('Error removing object:', error);
        return null;
      } finally {
        if (remover) {
          try { remover.close(); } catch (e) {}
        }
      }
    },
  };
}
