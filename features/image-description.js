import {
  ImageDescriptionGenerator, ImageDescriptionKind, ContentFilterOptions,
  AIFeatureReadyState,
} from '../generated-js/index.mjs';
import { loadImageBuffer } from './shared.js';

export function createImageDescriptionFeature() {
  return {
    isImageDescriptionReady: () => {
      try {
        return ImageDescriptionGenerator.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking ImageDescriptionGenerator state:', error);
        return false;
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
  };
}
