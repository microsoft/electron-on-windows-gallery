
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const path = require('path');

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

const myAddon = require('./myAddon');

// Initialize WinRT COM runtime
const { roInitialize, DynWinRtArray, DynWinRtStruct, DynWinRtType } = require('dynwinrt-js');
roInitialize(1); // MTA

// --- Generated WinRT bindings (from winrt-meta) ---
const {
  LanguageModel, LanguageModelOptions, LanguageModelResponseResult,
  ImageDescriptionGenerator, ImageDescriptionKind, ContentFilterOptions,
  TextRecognizer, TextSummarizer, TextRewriter, TextToTableConverter,
  ConversationItem, ConversationSummaryOptions,
  AIFeatureReadyState, TextRewriteTone,
  ImageBuffer, ImageScaler, ImageObjectExtractor, ImageObjectExtractorHint,
  ImageObjectRemover, SoftwareBitmap, BitmapPixelFormat, BitmapAlphaMode,
  IVector_RectInt32, IVector_PointInt32,
} = require('./generated-js');

// Interfaces not re-exported from index — require from individual files
const { IBitmapFrameWithSoftwareBitmap } = require('./generated-js/IBitmapFrameWithSoftwareBitmap');

// Windows SDK types (not in index)
const { LimitedAccessFeatures } = require('./generated-js/LimitedAccessFeatures');
const { LimitedAccessFeatureStatus } = require('./generated-js/LimitedAccessFeatureStatus');
const { StorageFile } = require('./generated-js/StorageFile');
const { FileAccessMode } = require('./generated-js/FileAccessMode');
const { BitmapDecoder } = require('./generated-js/BitmapDecoder');

// --- Helper: load image file path → ImageBuffer ---
async function loadImageBuffer(filePath) {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  const decoder = await BitmapDecoder.createAsync(stream);
  const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
  const softwareBitmap = await frame.getSoftwareBitmapConvertedAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
  return ImageBuffer.createForSoftwareBitmap(softwareBitmap);
}

// Create a Gray8 BMP mask file: black background, white rectangle
function createGray8MaskFile(filePath, width, height, rect) {
  const fs = require('fs');
  // BMP with 8-bit grayscale (256-entry palette)
  const paletteSize = 256 * 4; // 256 RGBQUAD entries
  const rowBytes = (width + 3) & ~3; // rows padded to 4-byte boundary
  const pixelDataSize = rowBytes * height;
  const headerSize = 14 + 40 + paletteSize; // BITMAPFILEHEADER + BITMAPINFOHEADER + palette
  const fileSize = headerSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize, 0);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(headerSize, 10);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(-height, 22); // negative = top-down
  buf.writeUInt16LE(1, 26);      // planes
  buf.writeUInt16LE(8, 28);      // bitsPerPixel
  buf.writeUInt32LE(0, 30);      // compression = BI_RGB
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);    // xPelsPerMeter
  buf.writeInt32LE(2835, 42);    // yPelsPerMeter
  buf.writeUInt32LE(256, 46);    // colors used
  buf.writeUInt32LE(256, 50);    // important colors

  // Grayscale palette (256 entries, each BGRA)
  for (let i = 0; i < 256; i++) {
    const off = 54 + i * 4;
    buf[off] = i;     // B
    buf[off + 1] = i; // G
    buf[off + 2] = i; // R
    buf[off + 3] = 0; // reserved
  }

  // Pixel data: white (255) in rect, black (0) elsewhere
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

async function loadSoftwareBitmap(filePath, pixelFormat, alphaMode) {
  const storageFile = await StorageFile.getFileFromPathAsync(filePath);
  const stream = await storageFile.openAsync(FileAccessMode.Read);
  const decoder = await BitmapDecoder.createAsync(stream);
  const frame = decoder.as(IBitmapFrameWithSoftwareBitmap);
  return await frame.getSoftwareBitmapConvertedAsync(pixelFormat, alphaMode);
}

async function loadMaskSoftwareBitmap(filePath) {
  // Load as Bgra8, then convert to Gray8+Ignore (mask format for ImageObjectRemover)
  const bgra = await loadSoftwareBitmap(filePath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
  return SoftwareBitmap.convert(bgra, BitmapPixelFormat.Gray8);
}

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
  saveTempImage: (uint8Array) => {
    const fs = require('fs');
    const os = require('os');
    const tmpPath = path.join(os.tmpdir(), `eraser_result_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, Buffer.from(uint8Array));
    return tmpPath;
  }
});

contextBridge.exposeInMainWorld('externalWindowsAI', {
  isLanguageModelReady: () => {
    try {
      return LanguageModel.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking LanguageModel state:', error);
      return false;
    }
  },
  isImageDescriptionReady: () => {
    try {
      return ImageDescriptionGenerator.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageDescriptionGenerator state:', error);
      return false;
    }
  },
  isTextRecognizerReady: () => {
    try {
      return TextRecognizer.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking TextRecognizer state:', error);
      return false;
    }
  },

  generateText: async (prompt, progressCallback) => {
    try {
      const access = LimitedAccessFeatures.tryUnlockFeature(
        "com.microsoft.windows.ai.languagemodel",
        LAF_TOKEN,
        "8wekyb3d8bbwe has registered their use of com.microsoft.windows.ai.languagemodel with Microsoft and agrees to the terms of use.");
      if ((access.status == LimitedAccessFeatureStatus.Available) ||
        (access.status == LimitedAccessFeatureStatus.AvailableWithoutToken))
      {
        const languageModel = await LanguageModel.createAsync();
        if (languageModel) {
          const options = LanguageModelOptions.create();
          options.temperature = 0.9;
          options.topK = 15;
          options.topP = 0.8;
          const op = languageModel.generateResponseAsync2(prompt, options);
          if (progressCallback) {
            op.progress((p) => {
              try { progressCallback(p.toString()); } catch (e) {}
            });
          }
          const result = await op;
          return result.text;
        } else {
          return "Language Model is not ready. Please check that your device meets the requirements to use Phi Silica.";
        }
      } else {
        return "You need an access token to use this Language Model feature.";
      }
    } catch (error) {
      console.error('Error generating text:', error);
      return "Error generating text. Please try again.";
    }
  },
  generateCaption: async (imagePath, progressCallback, descriptionKind = 'BriefDescription') => {
    let generator = null;
    try {
      generator = await ImageDescriptionGenerator.createAsync();
      let kindEnum;
      switch (descriptionKind) {
        case 'Detailed':
          kindEnum = ImageDescriptionKind.DetailedDescription;
          break;
        case 'Diagram':
          kindEnum = ImageDescriptionKind.DiagramDescription;
          break;
        case 'Accessible':
          kindEnum = ImageDescriptionKind.AccessibleDescription;
          break;
        case 'Brief':
        default:
          kindEnum = ImageDescriptionKind.BriefDescription;
          break;
      }

      const imageBuffer = await loadImageBuffer(imagePath);
      let contentFilterOptions;
      try {
        contentFilterOptions = ContentFilterOptions.create();
      } catch (e) {
        // ContentFilterOptions may not be available; pass null
      }
      const op = contentFilterOptions
        ? generator.describeAsync(imageBuffer, kindEnum, contentFilterOptions)
        : generator.describeAsync(imageBuffer, kindEnum);
      if (progressCallback) {
        op.progress((p) => {
          const val = (typeof p === 'string') ? p : (p && typeof p.toString === 'function') ? p.toString() : p;
          try { progressCallback(val); } catch (e) {}
        });
      }
      const result = await op;
      const description = result.description;

      try {
        generator.close();
      } catch (e) {
        // Ignore close errors
      }
      return description;
    } catch (error) {
        console.error('Error generating image description:', error);
        return null;
    }
  },
  recognizeText: async (imagePath) => {
    let recognizer = null;

    try {
        recognizer = await TextRecognizer.createAsync();

        if (TextRecognizer.getReadyState() !== AIFeatureReadyState.Ready) {
                  await TextRecognizer.ensureReadyAsync();
        }

        const imageBuffer = await loadImageBuffer(imagePath);
        const recognizedText = await recognizer.recognizeTextFromImageAsync(imageBuffer);
        const lines = recognizedText.lines;

        const resultArray = [];
        for (const line of lines) {
          const text = line.text;
          const boundingBox = line.boundingBox;

          const simplifiedBoundingBox = [boundingBox.topLeft.x, boundingBox.topLeft.y];

          resultArray.push({
            text: text,
            boundingBox: simplifiedBoundingBox
          });
        }

        return resultArray;
    } catch (error) {
        console.error('Error during text recognition:', error);
        throw error;
    } finally {
        if (recognizer) {
            try {
                recognizer.close();
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
            }
        }
    }
  },
  summarize: async (textToSummarize, progressCallback) => {
    try {
      const languageModel = await LanguageModel.createAsync();
      const textSummarizer = TextSummarizer.createInstance(languageModel);
      const result = await textSummarizer.summarizeAsync(textToSummarize);
      return result.text;
    } catch (error) {
        console.error('Error summarizing text:', error);
        return "Error summarizing text. Please try again.";
    }
  },
  summarizeParagraph: async (textToSummarize, progressCallback) => {
    try {
        const languageModel = await LanguageModel.createAsync();
        const textSummarizer = TextSummarizer.createInstance(languageModel);
        const result = await textSummarizer.summarizeParagraphAsync(textToSummarize);
        return result.text;
    } catch (error) {
        console.error('Error summarizing text:', error);
        return "Error summarizing paragraph. Please try again.";
    }
  },
  summarizeConversation: async (textToSummarize, progressCallback) => {
    try {
        const languageModel = await LanguageModel.createAsync();
        const textSummarizer = TextSummarizer.createInstance(languageModel);

        const conversation = [
            ConversationItem.create(),
            ConversationItem.create(),
            ConversationItem.create()
        ];

        conversation[0].message = "Hello, I need help with my computer";
        conversation[0].participant = "User";

        conversation[1].message = "I'd be happy to help! What seems to be the problem?";
        conversation[1].participant = "Support";

        conversation[2].message = "My computer keeps freezing when I try to open large files";
        conversation[2].participant = "User";

        const options = ConversationSummaryOptions.create();
        options.includeMessageCitations = true;
        options.includeParticipantAttribution = true;

        const result = await textSummarizer.summarizeConversationAsync(conversation, options);
        return result.text;
    } catch (error) {
        console.error('Error summarizing conversation:', error);
        return "Error summarizing conversation. Please try again.";
    }
  },
  rewriteText: async (textToRewrite, tone, progressCallback) => {
    try {
      const languageModel = await LanguageModel.createAsync();
      const textRewriter = TextRewriter.createInstance(languageModel);
      let toneEnum;
      switch (tone) {
        case 'General':
          toneEnum = TextRewriteTone.General;
          break;
        case 'Casual':
          toneEnum = TextRewriteTone.Casual;
          break;
        case 'Formal':
          toneEnum = TextRewriteTone.Formal;
          break;
        case 'Default':
        default:
          toneEnum = TextRewriteTone.Default;
          break;
      }

      const result = await textRewriter.rewriteAsync(textToRewrite, toneEnum);
      if (result.status !== 0) {
        return "Error: rewrite returned status " + result.status;
      }
      return result.text;
    } catch (error) {
      console.error('Error rewriting text:', error);
      return "Error rewriting text. Please try again.";
    }
  },
  isImageScalerReady: () => {
    try {
      return ImageScaler.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageScaler state:', error);
      return false;
    }
  },
  isImageObjectExtractorReady: () => {
    try {
      return ImageObjectExtractor.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageObjectExtractor state:', error);
      return false;
    }
  },
  isImageObjectRemoverReady: () => {
    try {
      return ImageObjectRemover.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageObjectRemover state:', error);
      return false;
    }
  },
  scaleImage: async (imagePath, targetWidth, targetHeight) => {
    let scaler = null;
    try {
      scaler = await ImageScaler.createAsync();
      const imageBuffer = await loadImageBuffer(imagePath);
      const scaledBuffer = scaler.scaleImageBuffer(imageBuffer, targetWidth, targetHeight);
      const width = scaledBuffer.pixelWidth;
      const height = scaledBuffer.pixelHeight;
      const stride = scaledBuffer.rowStride;
      const bufSize = stride * height;
      const fillBuf = DynWinRtArray.fromU8Values(Array(bufSize).fill(0));
      const pixels = scaledBuffer.copyToByteArray(fillBuf);
      return { width, height, stride, pixels: Array.from(pixels) };
    } catch (error) {
      console.error('Error scaling image:', error);
      return null;
    } finally {
      if (scaler) {
        try { scaler.close(); } catch (e) {}
      }
    }
  },
  extractObject: async (imagePath, includePoints, excludePoints) => {
    let extractor = null;
    try {
      const imageBuffer = await loadImageBuffer(imagePath);
      extractor = await ImageObjectExtractor.createWithImageBufferAsync(imageBuffer);

      const PointType = DynWinRtType.structType('Windows.Graphics.PointInt32', [DynWinRtType.i32(), DynWinRtType.i32()]);

      const packPoints = (pts) => (pts || []).map(p => {
        const s = DynWinRtStruct.create(PointType);
        s.setI32(0, p.x);
        s.setI32(1, p.y);
        return s.toValue();
      });

      const rectsVector = IVector_RectInt32.create([]);
      const includeVector = IVector_PointInt32.create(packPoints(includePoints));
      const excludeVector = IVector_PointInt32.create(packPoints(excludePoints));

      const hint = ImageObjectExtractorHint.createInstance(rectsVector, includeVector, excludeVector);
      const maskBuffer = extractor.getImageBufferObjectMask(hint);

      const maskW = maskBuffer.pixelWidth;
      const maskH = maskBuffer.pixelHeight;
      const maskFormat = maskBuffer.pixelFormat;
      const bytesPerPixel = (maskFormat === 62) ? 1 : 4;
      const maskBufSize = maskW * maskH * bytesPerPixel;
      const maskBytes = maskBuffer.copyToByteArray(DynWinRtArray.fromU8Values(Array(maskBufSize).fill(0)));

      const origW = imageBuffer.pixelWidth;
      const origH = imageBuffer.pixelHeight;
      const origStride = imageBuffer.rowStride;
      const origBufSize = origStride * origH;
      const origBytes = imageBuffer.copyToByteArray(DynWinRtArray.fromU8Values(Array(origBufSize).fill(0)));

      return {
        width: origW, height: origH, stride: origStride,
        maskWidth: maskW, maskHeight: maskH, maskPixelFormat: maskFormat,
        maskBytes: Array.from(maskBytes),
        origBytes: Array.from(origBytes)
      };
    } catch (error) {
      console.error('Error extracting object:', error);
      return null;
    } finally {
      if (extractor) {
        try { extractor.close(); } catch (e) {}
      }
    }
  },
  removeObject: async (imagePath, rect) => {
    let remover = null;
    try {
      remover = await ImageObjectRemover.createAsync();
      const imageBitmap = await loadSoftwareBitmap(imagePath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
      const imgW = imageBitmap.pixelWidth;
      const imgH = imageBitmap.pixelHeight;

      // Create Gray8 mask from rect: save a temp BMP mask file, then load it
      const maskPath = path.join(require('os').tmpdir(), `mask_${Date.now()}.bmp`);
      createGray8MaskFile(maskPath, imgW, imgH, rect);
      const maskBgra = await loadSoftwareBitmap(maskPath, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
      const maskGray = SoftwareBitmap.convert(maskBgra, BitmapPixelFormat.Gray8);
      try { require('fs').unlinkSync(maskPath); } catch (e) {}

      const resultBitmap = remover.removeFromSoftwareBitmap(imageBitmap, maskGray);

      // Extract result pixels via ImageBuffer.copyToByteArray (Bgra8)
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
  convertToTable: async (textToConvert, progressCallback) => {
    try {
      const languageModel = await LanguageModel.createAsync();
      const tableConverter = TextToTableConverter.createInstance(languageModel);
      const tableData = await tableConverter.convertAsync(textToConvert);

      const rows = tableData.getRows();
      var result = [];
      for (const row of rows) {
        const columns = row.getColumns();
        result.push(columns);
      }

      return result;
    } catch (error) {
      console.error("Error converting to table:", error);
      return null;
    }
  }
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
