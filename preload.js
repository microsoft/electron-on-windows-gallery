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
import { createImageScalerFeature } from './dist/image-scaler.js';
import { createObjectExtractorFeature } from './dist/object-extractor.js';
import { createObjectRemoverFeature } from './dist/object-remover.js';

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
  onWindowFocusChanged: (callback) => {
    ipcRenderer.on('window-focus-changed', (event, isFocused) => callback(isFocused));
  },
  getPathForFile: (file) => {
    return webUtils.getPathForFile(file);
  },
  getPathForClipboardBlob: async (blob) => {
    const arrayBuf = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    const ext = blob.type.split('/')[1] || 'png';
    const tmpPath = path.join(os.tmpdir(), `clipboard_${Date.now()}.${ext}`);
    fs.writeFileSync(tmpPath, Buffer.from(uint8));
    return tmpPath;
  },
  saveTempImage: (uint8Array) => {
    const tmpPath = path.join(os.tmpdir(), `eraser_result_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, Buffer.from(uint8Array));
    return tmpPath;
  }
});

contextBridge.exposeInMainWorld('externalWindowsAI', {
  ...createTextGenerationFeature(LAF_TOKEN),
  ...createImageDescriptionFeature(),
  ...createOcrFeature(),
  ...createTextSummarizationFeature(),
  ...createTextRewriteFeature(),
  ...createTextToTableFeature(),
  ...createImageScalerFeature(),
  ...createObjectExtractorFeature(),
  ...createObjectRemoverFeature(),
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
