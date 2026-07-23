import {
  LanguageModel, TextRewriter, TextRewriteTone,
} from '#winapp/bindings';

export function createTextRewriteFeature() {
  return {
    rewriteText: async (textToRewrite: string, tone: string, progressCallback?: (value: string) => void): Promise<string> => {
      let languageModel: LanguageModel | null = null;
      try {
        languageModel = await LanguageModel.createAsync();
        const textRewriter = TextRewriter.createInstance(languageModel);
        let toneEnum: TextRewriteTone;
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

        const op = textRewriter.rewriteAsync(textToRewrite, toneEnum);
        if (progressCallback) {
          op.progress((p) => {
            try { progressCallback(p as string); } catch (e) {}
          });
        }
        const result = await op;
        if (result.status !== 0) {
          return "Error: rewrite returned status " + result.status;
        }
        return result.text;
      } catch (error) {
        const msg = (error as any)?.message || String(error);
        console.error('Error rewriting text:', msg, error);
        return `Error rewriting text: ${msg}`;
      } finally {
        try { languageModel?.close(); } catch (e) {}
      }
    },
  };
}
