import {
  StorageFile, FileAccessMode, BitmapDecoder,
  IBitmapFrameWithSoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode,
  ImageBuffer, SoftwareBitmap, IClosable,
} from '#winapp/bindings';

import path from 'path';
import fs from 'fs';
import os from 'os';

export { BitmapPixelFormat, BitmapAlphaMode, SoftwareBitmap, ImageBuffer };

export async function loadImageBuffer(filePath: string, signal?: AbortSignal): Promise<ImageBuffer> {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath, signal);
  const stream = await storageFile.openAsync(FileAccessMode.Read, signal);
  try {
    const decoder = await BitmapDecoder.createAsync(stream, signal);
    const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
    const softwareBitmap = await frame.getSoftwareBitmapConvertedAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, signal);
    return ImageBuffer.createForSoftwareBitmap(softwareBitmap);
  } finally {
    try { IClosable.from(stream).close(); } catch (e) {}
  }
}

export async function loadSoftwareBitmap(filePath: string, pixelFormat: BitmapPixelFormat, alphaMode: BitmapAlphaMode, signal?: AbortSignal): Promise<SoftwareBitmap> {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath, signal);
  const stream = await storageFile.openAsync(FileAccessMode.Read, signal);
  try {
    const decoder = await BitmapDecoder.createAsync(stream, signal);
    const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
    return await frame.getSoftwareBitmapConvertedAsync(pixelFormat, alphaMode, signal);
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

  // Read all pixels into a Uint8Array (~1 byte/elem, vs ~8 bytes/elem for
  // a JS Array<number>). copyToByteArray returns a Node Buffer view.
  const pixels = imageBuffer.copyToByteArray(new Uint8Array(totalSize));

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
