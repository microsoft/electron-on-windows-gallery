import {
  LanguageModel, LanguageModelOptions,
  LimitedAccessFeatures, LimitedAccessFeatureStatus,
  AIFeatureReadyState,
} from '../generated-js/index.js';

export function createTextGenerationFeature(LAF_TOKEN) {
  return {
    isLanguageModelReady: () => {
      try {
        return LanguageModel.getReadyState() === AIFeatureReadyState.Ready;
      } catch (error) {
        console.error('Error checking LanguageModel state:', error);
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
  };
}
