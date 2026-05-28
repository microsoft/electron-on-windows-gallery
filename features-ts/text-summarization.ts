/**
 * TypeScript version of the text-summarization feature.
 * Tests that generated .d.ts types work with real TS code.
 */
import {
  LanguageModel, TextSummarizer,
  ConversationItem, ConversationSummaryOptions,
} from '../generated-js/index.js';

interface SummarizeResult {
  token: string;
  text: string;
  canceled: boolean;
}

export function createTextSummarizationFeature() {
  const inflight = new Map<string, AbortController>();
  let nextToken = 1;

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
    cancelSummarization: (): boolean => {
      if (inflight.size === 0) return false;
      for (const c of inflight.values()) {
        c.abort(new Error('User canceled summarization'));
      }
      return true;
    },

    summarize: async (
      textToSummarize: string,
      progressCallback?: (value: string) => void,
    ): Promise<SummarizeResult> => {
      const { token, signal } = start();
      let languageModel: LanguageModel | null = null;
      try {
        languageModel = await LanguageModel.createAsync(signal);
        const textSummarizer = TextSummarizer.createInstance(languageModel);
        const op = textSummarizer.summarizeAsync(textToSummarize, signal);
        if (progressCallback) {
          op.progress((p) => {
            try { progressCallback(p as string); } catch (e) {}
          });
        }
        const result = await op;
        return { token, text: result.text, canceled: false };
      } catch (error) {
        if (signal.aborted) return { token, text: '', canceled: true };
        const msg = (error as any)?.message || String(error);
        console.error('Error summarizing text:', msg, error);
        return { token, text: `Error summarizing text: ${msg}`, canceled: false };
      } finally {
        try { languageModel?.close(); } catch (e) {}
        done(token);
      }
    },

    summarizeParagraph: async (
      textToSummarize: string,
      progressCallback?: (value: string) => void,
    ): Promise<SummarizeResult> => {
      const { token, signal } = start();
      let languageModel: LanguageModel | null = null;
      try {
        languageModel = await LanguageModel.createAsync(signal);
        const textSummarizer = TextSummarizer.createInstance(languageModel);
        const op = textSummarizer.summarizeParagraphAsync(textToSummarize, signal);
        if (progressCallback) {
          op.progress((p) => {
            try { progressCallback(p as string); } catch (e) {}
          });
        }
        const result = await op;
        return { token, text: result.text, canceled: false };
      } catch (error) {
        if (signal.aborted) return { token, text: '', canceled: true };
        const msg = (error as any)?.message || String(error);
        console.error('Error summarizing paragraph:', msg, error);
        return { token, text: `Error summarizing paragraph: ${msg}`, canceled: false };
      } finally {
        try { languageModel?.close(); } catch (e) {}
        done(token);
      }
    },

    summarizeConversation: async (
      progressCallback?: (value: string) => void,
    ): Promise<SummarizeResult> => {
      const { token, signal } = start();
      let languageModel: LanguageModel | null = null;
      try {
        languageModel = await LanguageModel.createAsync(signal);
        const textSummarizer = TextSummarizer.createInstance(languageModel);

        const conversation = [
          ConversationItem.create(),
          ConversationItem.create(),
          ConversationItem.create(),
        ];

        conversation[0].message = "Hello, I need help with my computer";
        conversation[0].participant = "User";
        conversation[1].message = "I'd be happy to help! What seems to be the problem?";
        conversation[1].participant = "Support";
        conversation[2].message = "My computer keeps freezing when I open large files";
        conversation[2].participant = "User";

        const options = ConversationSummaryOptions.create();
        options.includeMessageCitations = true;
        options.includeParticipantAttribution = true;

        const op = textSummarizer.summarizeConversationAsync(
          conversation, options, signal,
        );
        if (progressCallback) {
          op.progress((p) => {
            try { progressCallback(p as string); } catch (e) {}
          });
        }
        const result = await op;
        return { token, text: result.text, canceled: false };
      } catch (error) {
        if (signal.aborted) return { token, text: '', canceled: true };
        const msg = (error as any)?.message || String(error);
        console.error('Error summarizing conversation:', msg, error);
        return { token, text: `Error summarizing conversation: ${msg}`, canceled: false };
      } finally {
        try { languageModel?.close(); } catch (e) {}
        done(token);
      }
    },
  };
}
