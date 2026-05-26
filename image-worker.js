// Utility process that hosts the three image AI features whose WinRT
// implementations (ImageScaler.scaleImageBuffer,
// ImageObjectExtractor.getImageBufferObjectMask,
// ImageObjectRemover.removeFromSoftwareBitmap) are synchronous and block the
// calling thread for several seconds. Running them here keeps both the
// Electron main (browser) process and the renderer fully responsive: the
// browser process keeps pumping Windows messages so input, focus, and IPC
// flow without delay, while heavy WinRT compute happens in this isolated OS
// child process.

import { createImageScalerFeature } from './dist/image-scaler.js';
import { createObjectExtractorFeature } from './dist/object-extractor.js';
import { createObjectRemoverFeature } from './dist/object-remover.js';

const scaler = createImageScalerFeature();
const extractor = createObjectExtractorFeature();
const remover = createObjectRemoverFeature();

const dispatch = {
  isImageScalerReady: () => scaler.isImageScalerReady(),
  scaleImage: (imagePath, w, h) => scaler.scaleImage(imagePath, w, h),
  cancelScaleImage: () => scaler.cancelScaleImage(),

  isImageObjectExtractorReady: () => extractor.isImageObjectExtractorReady(),
  extractObject: (imagePath, inc, exc) => extractor.extractObject(imagePath, inc, exc),
  cancelExtractObject: () => extractor.cancelExtractObject(),

  isImageObjectRemoverReady: () => remover.isImageObjectRemoverReady(),
  removeObject: (imagePath, rect) => remover.removeObject(imagePath, rect),
  cancelRemoveObject: () => remover.cancelRemoveObject(),
};

process.parentPort.on('message', async (e) => {
  const { id, method, args } = e.data ?? {};
  const fn = dispatch[method];
  if (!fn) {
    process.parentPort.postMessage({ id, ok: false, error: `Unknown method: ${method}` });
    return;
  }
  try {
    const result = await fn(...(args ?? []));
    process.parentPort.postMessage({ id, ok: true, result });
  } catch (err) {
    process.parentPort.postMessage({
      id,
      ok: false,
      error: err && (err.stack || err.message) ? String(err.stack || err.message) : String(err),
    });
  }
});
