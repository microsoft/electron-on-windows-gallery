import {
  LanguageModel, LanguageModelOptions,
  LimitedAccessFeatures, LimitedAccessFeatureStatus,
  AIFeatureReadyState,
} from '../.winapp/bindings/index.js';
import { createReadinessHelpers } from './readiness-helpers.js';

export function createTextGenerationFeature(LAF_TOKEN: string) {
  const inflight = new Map<string, AbortController>();
  let nextToken = 1;
  // Shared by all 4 Phi-Silica samples.
  const readiness = createReadinessHelpers(LanguageModel, 'LANGUAGE_MODEL');

  function start(): { token: string; signal: AbortSignal } {
    const token = String(nextToken++);
    const controller = new AbortController();
    inflight.set(token, controller);
    return { token, signal: controller.signal };
  }

  function done(token: string): void {
    inflight.delete(token);
  }

  return {
    isLanguageModelReady: (): boolean =>
      readiness.getReadyState() === AIFeatureReadyState.Ready,
    getLanguageModelReadyState: (): number => readiness.getReadyState(),
    ensureLanguageModelReady: (progressCallback?: (value: number) => void) =>
      readiness.ensureReady(progressCallback),
    cancelEnsureLanguageModelReady: (): boolean => readiness.cancelEnsureReady(),

    cancelGeneration: (): boolean => {
      if (inflight.size === 0) return false;
      for (const c of inflight.values()) {
        c.abort(new Error('User canceled text generation'));
      }
      return true;
    },

    generateText: async (prompt: string, progressCallback?: (value: string) => void): Promise<string> => {
      const { token, signal } = start();
      let languageModel: LanguageModel | null = null;
      try {
        const access = LimitedAccessFeatures.tryUnlockFeature(
          "com.microsoft.windows.ai.languagemodel",
          LAF_TOKEN,
          "8wekyb3d8bbwe has registered their use of com.microsoft.windows.ai.languagemodel with Microsoft and agrees to the terms of use.");
        if ((access.status == LimitedAccessFeatureStatus.Available) ||
          (access.status == LimitedAccessFeatureStatus.AvailableWithoutToken))
        {
          languageModel = await LanguageModel.createAsync(signal);
          if (languageModel) {
            const options = LanguageModelOptions.create();
            options.temperature = 0.9;
            options.topK = 15;
            options.topP = 0.8;
            const op = languageModel.generateResponseAsync(prompt, options, signal);
            if (progressCallback) {
              op.progress((p) => {
                try { progressCallback(p as string); } catch (e) {}
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
      } catch (error: any) {
        if (signal.aborted) return '';
        const msg = error?.message || String(error);
        console.error('Error generating text:', msg, error);
        return `Error generating text: ${msg}`;
      } finally {
        try { languageModel?.close(); } catch (e) {}
        done(token);
      }
    },
  };
}



