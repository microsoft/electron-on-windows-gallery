import {
  ImageDescriptionGenerator, ImageDescriptionKind, ContentFilterOptions,
  AIFeatureReadyState,
} from '../.winapp/bindings/index.js';
import { createReadinessHelpers } from './readiness-helpers.js';
import { loadImageBuffer } from './shared.js';

export function createImageDescriptionFeature() {
  const readiness = createReadinessHelpers(ImageDescriptionGenerator, 'IMAGE_DESCRIPTION_GENERATOR');

  return {
    isImageDescriptionReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getImageDescriptionGeneratorReadyState: (): number => readiness.getReadyState(),
    ensureImageDescriptionGeneratorReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureImageDescriptionGeneratorReady: (): boolean => readiness.cancelEnsureReady(),

    generateCaption: async (imagePath: string, progressCallback?: (value: unknown) => void, descriptionKind: string = 'BriefDescription'): Promise<string | null> => {
      let generator: ImageDescriptionGenerator | null = null;
      try {
        generator = await ImageDescriptionGenerator.createAsync();
        let kindEnum: ImageDescriptionKind;
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
        let contentFilterOptions: ContentFilterOptions | undefined;
        try {
          contentFilterOptions = ContentFilterOptions.create();
        } catch (e) {
          // ContentFilterOptions may not be available; pass null
        }
        const op = contentFilterOptions
          ? generator.describeAsync(imageBuffer, kindEnum, contentFilterOptions)
          : (generator as any).describeAsync(imageBuffer, kindEnum);
        if (progressCallback) {
          op.progress((p: unknown) => {
            const val = (typeof p === 'string') ? p : (p && typeof (p as any).toString === 'function') ? (p as any).toString() : p;
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
          const msg = (error as any)?.message || String(error);
          console.error('Error generating image description:', msg, error);
          return null;
      }
    },
  };
}
