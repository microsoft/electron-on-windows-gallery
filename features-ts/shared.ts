import {
  StorageFile, FileAccessMode, BitmapDecoder,
  IBitmapFrameWithSoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode,
  ImageBuffer, SoftwareBitmap, IClosable,
} from '../generated-js/index.js';

import path from 'path';
import fs from 'fs';
import os from 'os';

export { BitmapPixelFormat, BitmapAlphaMode, SoftwareBitmap, ImageBuffer };

export async function loadImageBuffer(filePath: string): Promise<ImageBuffer> {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  try {
    const decoder = await BitmapDecoder.createAsync(stream);
    const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
    const softwareBitmap = await frame.getSoftwareBitmapConvertedAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
    return ImageBuffer.createForSoftwareBitmap(softwareBitmap);
  } finally {
    try { IClosable.from(stream).close(); } catch (e) {}
  }
}

export async function loadSoftwareBitmap(filePath: string, pixelFormat: BitmapPixelFormat, alphaMode: BitmapAlphaMode): Promise<SoftwareBitmap> {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  try {
    const decoder = await BitmapDecoder.createAsync(stream);
    const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
    return await frame.getSoftwareBitmapConvertedAsync(pixelFormat, alphaMode);
  } finally {
    try { IClosable.from(stream).close(); } catch (e) {}
  }
}

/**
 * Save an ImageBuffer (BGRA8) to a temporary BMP file and return the path.
 */
export function saveBgraToFile(imageBuffer: ImageBuffer): string {
  const w = imageBuffer.pixelWidth;
  const h = imageBuffer.pixelHeight;
  const stride = imageBuffer.rowStride;
  const totalSize = stride * h;

  // Read all pixels (V8 heap is configured to 4GB via --max-old-space-size)
  const pixels = imageBuffer.copyToByteArray(new Array(totalSize).fill(0));

  // Write a 32-bit BMP (top-down, BGRA)
  const headerSize = 14 + 108;
  const bmp = Buffer.alloc(headerSize);
  bmp.write('BM', 0);
  bmp.writeUInt32LE(headerSize + totalSize, 2);
  bmp.writeUInt32LE(headerSize, 10);
  bmp.writeUInt32LE(108, 14);
  bmp.writeInt32LE(w, 18);
  bmp.writeInt32LE(-h, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(32, 28);
  bmp.writeUInt32LE(3, 30);
  bmp.writeUInt32LE(totalSize, 34);
  bmp.writeInt32LE(2835, 38);
  bmp.writeInt32LE(2835, 42);
  bmp.writeUInt32LE(0x00FF0000, 54);
  bmp.writeUInt32LE(0x0000FF00, 58);
  bmp.writeUInt32LE(0x000000FF, 62);
  bmp.writeUInt32LE(0xFF000000, 66);

  const tmpPath = path.join(os.tmpdir(), `scaled_${Date.now()}.bmp`);
  const fd = fs.openSync(tmpPath, 'w');
  fs.writeSync(fd, bmp);
  fs.writeSync(fd, Buffer.from(pixels));
  fs.closeSync(fd);
  return tmpPath;
}
