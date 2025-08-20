
const { contextBridge } = require('electron');

const myAddon = require('./myAddon/build/Release/myAddon.node');
const phiSilicaAddon = require('./PhiSilicaAddon/build/Release/PhiSilicaAddon.node');

contextBridge.exposeInMainWorld('winAppSdk', {
  showNotification: (title, body) => {
    myAddon.showNotification(title, body);
  },
  showBadgeNotification: (showBadge) => {
    myAddon.showBadgeNotification(showBadge);
  }
});

contextBridge.exposeInMainWorld('phiSilica', {
  generateText: (prompt) => {
    return phiSilicaAddon.generateText(prompt);
  }
});
