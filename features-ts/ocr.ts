import {
  TextRecognizer, AIFeatureReadyState,
} from '#winapp/bindings';
import { createReadinessHelpers } from './readiness-helpers.js';
import { loadImageBuffer } from './shared.js';

interface OcrLineResult {
  text: string;
  boundingBox: [number, number];
  height: number;
}

export function createOcrFeature() {
  const readiness = createReadinessHelpers(TextRecognizer, 'TEXT_RECOGNIZER');

  return {
    isTextRecognizerReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getTextRecognizerReadyState: (): number => readiness.getReadyState(),
    ensureTextRecognizerReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureTextRecognizerReady: (): boolean => readiness.cancelEnsureReady(),

    recognizeText: async (imagePath: string): Promise<OcrLineResult[]> => {
      let recognizer: TextRecognizer | null = null;
      try {
        recognizer = await TextRecognizer.createAsync();

        if (TextRecognizer.getReadyState() !== AIFeatureReadyState.Ready) {
          await TextRecognizer.ensureReadyAsync();
        }

        const imageBuffer = await loadImageBuffer(imagePath);
        const recognizedText = await recognizer.recognizeTextFromImageAsync(imageBuffer);
        const lines = recognizedText.lines;

        const resultArray: OcrLineResult[] = [];
        for (const line of lines) {
          const text = line.text;
          const boundingBox = line.boundingBox;
          const simplifiedBoundingBox: [number, number] = [boundingBox.topLeft.x, boundingBox.topLeft.y];
          const height = Math.abs(boundingBox.topRight.y - boundingBox.bottomRight.y);
          resultArray.push({
            text: text,
            boundingBox: simplifiedBoundingBox,
            height: height
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
