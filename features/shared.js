import {
  StorageFile, FileAccessMode, BitmapDecoder,
  IBitmapFrameWithSoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode,
  ImageBuffer, SoftwareBitmap,
} from '../generated-js/index.js';

export { BitmapPixelFormat, BitmapAlphaMode, SoftwareBitmap, ImageBuffer };

export async function loadImageBuffer(filePath) {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  const decoder = await BitmapDecoder.createAsync(stream);
  const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
  const softwareBitmap = await frame.getSoftwareBitmapConvertedAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
  return ImageBuffer.createForSoftwareBitmap(softwareBitmap);
}

export async function loadSoftwareBitmap(filePath, pixelFormat, alphaMode) {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  const decoder = await BitmapDecoder.createAsync(stream);
  const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
  return await frame.getSoftwareBitmapConvertedAsync(pixelFormat, alphaMode);
}
