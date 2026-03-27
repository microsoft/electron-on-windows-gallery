import {
  TextRecognizer, AIFeatureReadyState,
} from '../generated-js/index.mjs';
import { loadImageBuffer } from './shared.js';

export function createOcrFeature() {
  return {
    isTextRecognizerReady: () => {
      try {
        return TextRecognizer.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking TextRecognizer state:', error);
        return false;
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
          try { recognizer.close(); } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
          }
        }
      }
    },
  };
}
