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

// Build a progress callback that streams `{id, kind:'progress', value}`
// messages back to the parent. Methods that opt in (see dispatch entries
// for ensure*Ready) receive this as their last argument.
function makeProgressCallback(id) {
  return (value) => {
    try {
      process.parentPort.postMessage({ id, kind: 'progress', value });
    } catch (e) {}
  };
}

const dispatch = {
  isImageScalerReady: () => scaler.isImageScalerReady(),
  getImageScalerReadyState: () => scaler.getImageScalerReadyState(),
  ensureImageScalerReady: (id) => scaler.ensureImageScalerReady(makeProgressCallback(id)),
  cancelEnsureImageScalerReady: () => scaler.cancelEnsureImageScalerReady(),
  scaleImage: (imagePath, w, h) => scaler.scaleImage(imagePath, w, h),
  cancelScaleImage: () => scaler.cancelScaleImage(),

  isImageObjectExtractorReady: () => extractor.isImageObjectExtractorReady(),
  getImageObjectExtractorReadyState: () => extractor.getImageObjectExtractorReadyState(),
  ensureImageObjectExtractorReady: (id) => extractor.ensureImageObjectExtractorReady(makeProgressCallback(id)),
  cancelEnsureImageObjectExtractorReady: () => extractor.cancelEnsureImageObjectExtractorReady(),
  extractObject: (imagePath, inc, exc) => extractor.extractObject(imagePath, inc, exc),
  cancelExtractObject: () => extractor.cancelExtractObject(),

  isImageObjectRemoverReady: () => remover.isImageObjectRemoverReady(),
  getImageObjectRemoverReadyState: () => remover.getImageObjectRemoverReadyState(),
  ensureImageObjectRemoverReady: (id) => remover.ensureImageObjectRemoverReady(makeProgressCallback(id)),
  cancelEnsureImageObjectRemoverReady: () => remover.cancelEnsureImageObjectRemoverReady(),
  removeObject: (imagePath, rect) => remover.removeObject(imagePath, rect),
  cancelRemoveObject: () => remover.cancelRemoveObject(),
};

// Methods that need the request id (so they can stream progress) are
// listed here; the worker injects `id` as the first argument.
const NEEDS_ID = new Set([
  'ensureImageScalerReady',
  'ensureImageObjectExtractorReady',
  'ensureImageObjectRemoverReady',
]);

process.parentPort.on('message', async (e) => {
  const { id, method, args } = e.data ?? {};
  const fn = dispatch[method];
  if (!fn) {
    process.parentPort.postMessage({ id, ok: false, error: `Unknown method: ${method}` });
    return;
  }
  try {
    const callArgs = NEEDS_ID.has(method) ? [id, ...(args ?? [])] : (args ?? []);
    const result = await fn(...callArgs);
    process.parentPort.postMessage({ id, ok: true, result });
  } catch (err) {
    process.parentPort.postMessage({
      id,
      ok: false,
      error: err && (err.stack || err.message) ? String(err.stack || err.message) : String(err),
    });
  }
});
