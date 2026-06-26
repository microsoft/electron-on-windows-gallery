import { contextBridge, ipcRenderer, webUtils } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Global error handlers for preload context
process.on('uncaughtException', (error) => {
  console.error('Preload uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Preload unhandled rejection:', reason);
});

// Load environment variables from .env file in development
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available in production, that's fine
}

// Get LAF token - from env in dev, or placeholder gets replaced in CI build
const LAF_TOKEN = process.env.LAF_TOKEN || '__LAF_TOKEN__';

import myAddon from './myAddon/index.js';

// --- AI feature modules ---
import { createTextGenerationFeature } from './dist/text-generation.js';
import { createImageDescriptionFeature } from './dist/image-description.js';
import { createOcrFeature } from './dist/ocr.js';
import { createTextSummarizationFeature } from './dist/text-summarization.js';
import { createTextRewriteFeature } from './dist/text-rewrite.js';
import { createTextToTableFeature } from './dist/text-to-table.js';
// Image scaler / object extractor / object remover are intentionally NOT
// imported here. They run in a utility process (see image-worker.js)
// because their core WinRT methods are synchronous and would otherwise
// block the renderer for several seconds. The renderer reaches them via
// IPC forwarded by main.js.

// --- Context bridges ---

contextBridge.exposeInMainWorld('winSdk', {
  showNotification: (title, body) => {
    myAddon.showNotification(title, body);
  },
  showBadgeNotification: (showBadge) => {
    myAddon.showBadgeNotification(showBadge);
  },
  copyToClipboard: (text) => {
    myAddon.copyToClipboard(text);
  },
  openNewFile: () => {
    return ipcRenderer.invoke('open-file-dialog');
  }
});

contextBridge.exposeInMainWorld('electronUtils', {
  getAppPath: () => {
    return ipcRenderer.invoke('get-app-path');
  },
  getOcrImagePath: () => {
    return ipcRenderer.invoke('get-ocr-image-path');
  },
  getImgDescriptionImagePath: () => {
    return ipcRenderer.invoke('get-img-description-image-path');
  },
  getSampleImagePath: (name) => {
    return ipcRenderer.invoke('get-sample-image-path', name);
  },
  onWindowFocusChanged: (callback) => {
    ipcRenderer.on('window-focus-changed', (event, isFocused) => callback(isFocused));
  },
  getPathForFile: (file) => {
    return webUtils.getPathForFile(file);
  },
  getPathForClipboardBlob: async (blob) => {
    const arrayBuf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    // blob.type is renderer-controlled. Allowlist the extension to image
    // types so a compromised renderer can't drop arbitrary-extension files
    // (e.g. .bat, .lnk) into the temp directory.
    const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);
    const raw = (blob.type.split('/')[1] || '').toLowerCase();
    const ext = ALLOWED_EXTS.has(raw) ? raw : 'png';
    const tmpPath = path.join(os.tmpdir(), `clipboard_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, Buffer.from(uint8));
    return tmpPath;
  },
  // Caller must guarantee `uint8Array` contains PNG-encoded bytes; the
  // extension is hard-coded here and is not derived from the input.
  saveTempImage: (uint8Array) => {
    const tmpPath = path.join(os.tmpdir(), `eraser_result_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, Buffer.from(uint8Array));
    return tmpPath;
  }
});

// Subscribe an `onProgress` callback to a per-call ipc channel for the
// duration of the worker invocation; auto-clean afterwards.
function invokeWithProgress(invokeChannel, progressChannel, onProgress) {
  const listener = (_e, value) => {
    try { onProgress && onProgress(value); } catch (err) {}
  };
  ipcRenderer.on(progressChannel, listener);
  return ipcRenderer.invoke(invokeChannel).finally(() => {
    ipcRenderer.removeListener(progressChannel, listener);
  });
}

contextBridge.exposeInMainWorld('externalWindowsAI', {
  ...createTextGenerationFeature(LAF_TOKEN),
  ...createImageDescriptionFeature(),
  ...createOcrFeature(),
  ...createTextSummarizationFeature(),
  ...createTextRewriteFeature(),
  ...createTextToTableFeature(),
  // The three image features below run in a utility process to keep both
  // the renderer and the main (browser) process responsive during their
  // multi-second synchronous WinRT compute.
  isImageScalerReady: () => ipcRenderer.invoke('image:isImageScalerReady'),
  getImageScalerReadyState: () => ipcRenderer.invoke('image:getImageScalerReadyState'),
  ensureImageScalerReady: (onProgress) => invokeWithProgress(
    'image:ensureImageScalerReady',
    'image:ensureImageScalerReadyProgress',
    onProgress),
  cancelEnsureImageScalerReady: () => ipcRenderer.invoke('image:cancelEnsureImageScalerReady'),
  scaleImage: (imagePath, w, h) => ipcRenderer.invoke('image:scaleImage', imagePath, w, h),
  cancelScaleImage: () => ipcRenderer.invoke('image:cancelScaleImage'),
  isImageObjectExtractorReady: () => ipcRenderer.invoke('image:isImageObjectExtractorReady'),
  getImageObjectExtractorReadyState: () => ipcRenderer.invoke('image:getImageObjectExtractorReadyState'),
  ensureImageObjectExtractorReady: (onProgress) => invokeWithProgress(
    'image:ensureImageObjectExtractorReady',
    'image:ensureImageObjectExtractorReadyProgress',
    onProgress),
  cancelEnsureImageObjectExtractorReady: () => ipcRenderer.invoke('image:cancelEnsureImageObjectExtractorReady'),
  extractObject: (imagePath, includePoints, excludePoints) =>
    ipcRenderer.invoke('image:extractObject', imagePath, includePoints, excludePoints),
  cancelExtractObject: () => ipcRenderer.invoke('image:cancelExtractObject'),
  isImageObjectRemoverReady: () => ipcRenderer.invoke('image:isImageObjectRemoverReady'),
  getImageObjectRemoverReadyState: () => ipcRenderer.invoke('image:getImageObjectRemoverReadyState'),
  ensureImageObjectRemoverReady: (onProgress) => invokeWithProgress(
    'image:ensureImageObjectRemoverReady',
    'image:ensureImageObjectRemoverReadyProgress',
    onProgress),
  cancelEnsureImageObjectRemoverReady: () => ipcRenderer.invoke('image:cancelEnsureImageObjectRemoverReady'),
  removeObject: (imagePath, rect) => ipcRenderer.invoke('image:removeObject', imagePath, rect),
  cancelRemoveObject: () => ipcRenderer.invoke('image:cancelRemoveObject'),
});

// MCP API exposure
contextBridge.exposeInMainWorld('mcpAPI', {
  fetchServers: () => ipcRenderer.invoke('mcp:fetchServers'),
  connectToServer: (server) => ipcRenderer.invoke('mcp:connectToServer', server),
  listTools: () => ipcRenderer.invoke('mcp:listTools'),
  callTool: (toolName, parameters) => ipcRenderer.invoke('mcp:callTool', toolName, parameters),
  disconnect: () => ipcRenderer.invoke('mcp:disconnect'),
  isConnected: () => ipcRenderer.invoke('mcp:isConnected')
});
