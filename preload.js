
const { contextBridge } = require('electron');

const myAddon = require('./myAddon/build/Release/myAddon.node');
const phiSilicaAddon = require('./PhiSilicaAddon/build/Release/PhiSilicaAddon.node');
const windowsaiAddon = require('./WindowsAIAddon/build/Release/WindowsAIAddon.node');

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
  }
});