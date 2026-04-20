import {
  LanguageModel, TextToTableConverter,
} from '../generated-js/index.js';

export function createTextToTableFeature() {
  return {
    convertToTable: async (textToConvert: string, progressCallback?: (value: unknown) => void): Promise<string[][] | null> => {
      let languageModel: LanguageModel | null = null;
      try {
        languageModel = await LanguageModel.createAsync();
        const tableConverter = TextToTableConverter.createInstance(languageModel);
        const tableData = await tableConverter.convertAsync(textToConvert);

        const rows = tableData.getRows();
        const result: string[][] = [];
        for (const row of rows) {
          const columns = row.getColumns();
          result.push(columns);
        }

        return result;
      } catch (error) {
        const msg = (error as any)?.message || String(error);
        console.error("Error converting to table:", msg, error);
        return null;
      } finally {
        try { languageModel?.close(); } catch (e) {}
      }
    },
  };
}
