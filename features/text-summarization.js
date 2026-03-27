import {
  LanguageModel, TextSummarizer,
  ConversationItem, ConversationSummaryOptions,
} from '../generated-js/index.mjs';

export function createTextSummarizationFeature() {
  return {
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
  };
}
