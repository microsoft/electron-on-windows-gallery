
const { contextBridge } = require('electron');

const myAddon = require('./myAddon/build/Release/myAddon.node');
const phiSilicaAddon = require('./PhiSilicaAddon/build/Release/PhiSilicaAddon.node');
const windowsaiAddon = require('./WindowsAIAddon/build/Release/WindowsAIAddon.node');
const {LanguageModel, AIFeatureReadyState, LanguageModelOptions} = require('../electron-windows-ai-addon/windows-ai-addon/build/Release/windows-ai-addon.node');

contextBridge.exposeInMainWorld('winAppSdk', {
  showNotification: (title, body) => {
    myAddon.showNotification(title, body);
  },
  showBadgeNotification: (showBadge) => {
    myAddon.showBadgeNotification(showBadge);
  },
  copyToClipboard: (text) => {
    myAddon.copyToClipboard(text);
  },
  openNewFile: () => {
    return myAddon.openNewFile();
  }
  
});

contextBridge.exposeInMainWorld('phiSilica', {
  generateText: (prompt) => {
    return phiSilicaAddon.generateText(prompt);
  }
});

contextBridge.exposeInMainWorld('windowsAI', {
  runTextRecognition: (filePath) => {
    return windowsaiAddon.runTextRecognition(filePath);
  },
  generateCaption: (filePath) => {
    return windowsaiAddon.generateCaption(filePath);
  }
});

contextBridge.exposeInMainWorld('externalWindowsAI', {
  generateText: async (prompt) => {
    var readyState = LanguageModel.GetReadyState();
    if (readyState == AIFeatureReadyState.NotReady) {
      await LanguageModel.EnsureReadyAsync();
    } else if (readyState == AIFeatureReadyState.Ready) {
      var languageModel = await LanguageModel.CreateAsync();
      if (languageModel){
        var options = new LanguageModelOptions();
        options.temperature = 0.9;
        options.topK = 15;
        options.topP = 0.8;
        var result = await languageModel.GenerateResponseAsync(prompt, options);
        return result;
      }
    }
  }
});