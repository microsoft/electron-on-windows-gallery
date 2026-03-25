
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
const { roInitialize } = require('dynwinrt-js');
roInitialize(1); // MTA

// --- Generated WinRT bindings (CommonJS, from winrt-meta --lang js) ---
const { LanguageModel, ILanguageModel2 } = require('./generated-js/LanguageModel');
const { LanguageModelOptions } = require('./generated-js/LanguageModelOptions');
const { LanguageModelResponseResult } = require('./generated-js/LanguageModelResponseResult');
const { ImageDescriptionGenerator, IClosable } = require('./generated-js/ImageDescriptionGenerator');
const { ImageDescriptionKind } = require('./generated-js/ImageDescriptionKind');
const { ContentFilterOptions } = require('./generated-js/ContentFilterOptions');
const { TextRecognizer } = require('./generated-js/TextRecognizer');
const { TextSummarizer, ITextSummarizer2 } = require('./generated-js/TextSummarizer');
const { TextRewriter, ITextRewriter2 } = require('./generated-js/TextRewriter');
const { TextToTableConverter } = require('./generated-js/TextToTableConverter');
const { ConversationItem } = require('./generated-js/ConversationItem');
const { ConversationSummaryOptions } = require('./generated-js/ConversationSummaryOptions');
const { AIFeatureReadyState } = require('./generated-js/AIFeatureReadyState');
const { TextRewriteTone } = require('./generated-js/TextRewriteTone');
const { LimitedAccessFeatures } = require('./generated-js/LimitedAccessFeatures');
const { LimitedAccessFeatureStatus } = require('./generated-js/LimitedAccessFeatureStatus');
const { StorageFile } = require('./generated-js/StorageFile');
const { FileAccessMode } = require('./generated-js/FileAccessMode');
const { BitmapDecoder, IBitmapFrameWithSoftwareBitmap } = require('./generated-js/BitmapDecoder');
const { BitmapPixelFormat } = require('./generated-js/BitmapPixelFormat');
const { BitmapAlphaMode } = require('./generated-js/BitmapAlphaMode');
const { ImageBuffer } = require('./generated-js/ImageBuffer');
const { ImageScaler } = require('./generated-js/ImageScaler');
const { ImageObjectExtractor } = require('./generated-js/ImageObjectExtractor');
const { ImageObjectExtractorHint } = require('./generated-js/ImageObjectExtractorHint');
const { ImageObjectRemover } = require('./generated-js/ImageObjectRemover');
const { SoftwareBitmap } = require('./generated-js/SoftwareBitmap');
const { ImageGenerator, IImageGenerator2 } = require('./generated-js/ImageGenerator');
const { ImageGenerationOptions } = require('./generated-js/ImageGenerationOptions');
const { ImageFromTextGenerationOptions } = require('./generated-js/ImageFromTextGenerationOptions');
const { ImageFromTextGenerationStyle } = require('./generated-js/ImageFromTextGenerationStyle');
const { ImageForegroundExtractor } = require('./generated-js/ImageForegroundExtractor');
const { VideoScaler } = require('./generated-js/VideoScaler');
const { VideoScalerOptions } = require('./generated-js/VideoScalerOptions');
const { LanguageModelExperimental } = require('./generated-js/LanguageModelExperimental');
const { LanguageModelOptionsExperimental } = require('./generated-js/LanguageModelOptionsExperimental');

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
          const lm2 = languageModel.as(ILanguageModel2);
          const result = await lm2.generateResponseAsync2(prompt, options);
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
      const result = contentFilterOptions
        ? await generator.describeAsync(imageBuffer, kindEnum, contentFilterOptions)
        : await generator.describeAsync(imageBuffer, kindEnum);
      const description = result.description;

      try {
        generator.as(IClosable).close();
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
                recognizer.as(IClosable).close();
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

        const sum2 = textSummarizer.as(ITextSummarizer2);
        const result = await sum2.summarizeConversationAsync(conversation, options);
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

      const rw2 = textRewriter.as(ITextRewriter2);
      const result = await rw2.rewriteAsync(textToRewrite, toneEnum);
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
      const { DynWinRtArray } = require('dynwinrt-js');
      const fillBuf = DynWinRtArray.fromU8Values(Array(bufSize).fill(0));
      const pixels = scaledBuffer.copyToByteArray(fillBuf);
      return { width, height, stride, pixels: Array.from(pixels) };
    } catch (error) {
      console.error('Error scaling image:', error);
      return null;
    } finally {
      if (scaler) {
        try { scaler.as(IClosable).close(); } catch (e) {}
      }
    }
  },
  extractObject: async (imagePath, includePoints, excludePoints) => {
    let extractor = null;
    try {
      const imageBuffer = await loadImageBuffer(imagePath);
      extractor = await ImageObjectExtractor.createWithImageBufferAsync(imageBuffer);

      const { DynWinRtStruct, DynWinRtType: DType, DynWinRtArray: DArr } = require('dynwinrt-js');
      const { IVector_RectInt32 } = require('./generated-js/IVector_RectInt32');
      const { IVector_PointInt32 } = require('./generated-js/IVector_PointInt32');
      const PointType = DType.structType('Windows.Graphics.PointInt32', [DType.i32(), DType.i32()]);

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
      const maskBytes = maskBuffer.copyToByteArray(DArr.fromU8Values(Array(maskBufSize).fill(0)));

      const origW = imageBuffer.pixelWidth;
      const origH = imageBuffer.pixelHeight;
      const origStride = imageBuffer.rowStride;
      const origBufSize = origStride * origH;
      const origBytes = imageBuffer.copyToByteArray(DArr.fromU8Values(Array(origBufSize).fill(0)));

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
        try { extractor.as(IClosable).close(); } catch (e) {}
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
      const { DynWinRtArray } = require('dynwinrt-js');
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
        try { remover.as(IClosable).close(); } catch (e) {}
      }
    }
  },
  // --- Image Generator (Text-to-Image) ---
  isImageGeneratorReady: () => {
    try {
      return ImageGenerator.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageGenerator state:', error);
      return false;
    }
  },
  generateImageFromText: async (prompt, style = 'Default') => {
    let generator = null;
    try {
      const readyState = ImageGenerator.getReadyState();
      if (readyState !== AIFeatureReadyState.Ready) {
        const ensureResult = await ImageGenerator.ensureReadyAsync();
      }

      generator = await ImageGenerator.createAsync();
      const options = ImageGenerationOptions.create();
      const result = generator.generateImageFromTextPrompt(prompt, options);
      const status = result.status;
      if (status !== 0) {
        return { error: 'Generation failed with status: ' + status };
      }
      const img = result.image;
      const w = img.pixelWidth;
      const h = img.pixelHeight;
      const stride = img.rowStride;
      const { DynWinRtArray: DArr } = require('dynwinrt-js');
      const imgBufSize = stride * h;
      const bytes = img.copyToByteArray(DArr.fromU8Values(Array(imgBufSize).fill(0)));
      return { width: w, height: h, stride, pixels: Array.from(bytes), status };
    } catch (error) {
      console.error('Error generating image:', error);
      const msg = error.message || '';
      // Surface a user-friendly message; the full WinRT diagnostic stays in the console
      if (msg.includes('0x80004005') || msg.includes('Model session initialization')) {
        return { error: 'Image generation model failed to initialize. Please make sure the model is fully downloaded and your device meets the requirements.' };
      }
      return { error: msg || 'Error generating image' };
    } finally {
      if (generator) { try { generator.as(IClosable).close(); } catch (e) {} }
    }
  },

  // --- Image Foreground Extractor (auto background removal) ---
  isImageForegroundExtractorReady: () => {
    try {
      return ImageForegroundExtractor.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking ImageForegroundExtractor state:', error);
      return false;
    }
  },
  extractForeground: async (imagePath) => {
    let extractor = null;
    try {
      extractor = await ImageForegroundExtractor.createAsync();
      const imageBuffer = await loadImageBuffer(imagePath);
      const maskBuffer = extractor.getMaskFromImageBuffer(imageBuffer);
      const width = maskBuffer.pixelWidth;
      const height = maskBuffer.pixelHeight;
      const maskPixelFormat = maskBuffer.pixelFormat;
      const { DynWinRtArray: DArr2 } = require('dynwinrt-js');

      // Gray8 = 62 (1 byte/pixel), Bgra8 = 87 (4 bytes/pixel)
      const bytesPerPixel = (maskPixelFormat === 62) ? 1 : 4;
      const maskBufSize = width * height * bytesPerPixel;
      const maskBytes = maskBuffer.copyToByteArray(DArr2.fromU8Values(Array(maskBufSize).fill(0)));

      // Also extract the original image pixels (Bgra8) for compositing in the renderer
      const origW = imageBuffer.pixelWidth;
      const origH = imageBuffer.pixelHeight;
      const origStride = imageBuffer.rowStride;
      const origBufSize = origStride * origH;
      const origBytes = imageBuffer.copyToByteArray(DArr2.fromU8Values(Array(origBufSize).fill(0)));

      return {
        width, height,
        maskPixelFormat,
        maskBytes: Array.from(maskBytes),
        origWidth: origW,
        origHeight: origH,
        origStride: origStride,
        origBytes: Array.from(origBytes)
      };
    } catch (error) {
      console.error('Error extracting foreground:', error);
      return null;
    } finally {
      if (extractor) { try { extractor.as(IClosable).close(); } catch (e) {} }
    }
  },

  // --- Video Scaler ---
  isVideoScalerReady: () => {
    try {
      return VideoScaler.getReadyState() === AIFeatureReadyState.Ready;
    } catch (error) {
      console.error('Error checking VideoScaler state:', error);
      return false;
    }
  },
  scaleVideoFrame: async (imagePath, targetWidth, targetHeight) => {
    let scaler = null;
    try {
      scaler = await VideoScaler.createAsync();
      const inputBuffer = await loadImageBuffer(imagePath);
      // Create output buffer with target dimensions
      const outputSb = SoftwareBitmap.createWithAlpha(BitmapPixelFormat.Bgra8, targetWidth, targetHeight, BitmapAlphaMode.Premultiplied);
      const outputBuffer = ImageBuffer.createForSoftwareBitmap(outputSb);
      const options = VideoScalerOptions.create();
      const result = scaler.scaleFrame2(inputBuffer, outputBuffer, options);
      return { status: result.status, width: targetWidth, height: targetHeight };
    } catch (error) {
      console.error('Error scaling video frame:', error);
      return { error: error.message || 'Error scaling video frame' };
    } finally {
      if (scaler) { try { scaler.as(IClosable).close(); } catch (e) {} }
    }
  },

  // --- Language Model Experimental (LoRA) ---
  generateTextWithLoRA: async (prompt, adapterPath) => {
    try {
      const languageModel = await LanguageModel.createAsync();
      const lmExp = LanguageModelExperimental.createInstance(languageModel);
      const options = LanguageModelOptionsExperimental.create();
      options.temperature = 0.9;
      options.topK = 15;
      options.topP = 0.8;

      if (adapterPath) {
        const adapter = lmExp.loadAdapter(adapterPath);
        options.loraAdapter = adapter;
      }

      const result = await lmExp.generateResponseAsync(prompt, options);
      return result.text;
    } catch (error) {
      console.error('Error generating text with LoRA:', error);
      return 'Error: ' + (error.message || 'Failed to generate text');
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
