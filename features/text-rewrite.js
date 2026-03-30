import {
  LanguageModel, TextRewriter, TextRewriteTone,
} from '../generated-js/index.js';

export function createTextRewriteFeature() {
  return {
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
  };
}
