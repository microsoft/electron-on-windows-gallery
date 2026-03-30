import {
  LanguageModel, TextToTableConverter,
} from '../generated-js/index.js';

export function createTextToTableFeature() {
  return {
    convertToTable: async (textToConvert, progressCallback) => {
      try {
        const languageModel = await LanguageModel.createAsync();
        const tableConverter = TextToTableConverter.createInstance(languageModel);
        const tableData = await tableConverter.convertAsync(textToConvert);

        const rows = tableData.getRows();
        var result = [];
        for (const row of rows) {
          const columns = row.getColumns();
          result.push(columns);
        }

        return result;
      } catch (error) {
        console.error("Error converting to table:", error);
        return null;
      }
    },
  };
}
