
const { contextBridge } = require('electron');

const myAddon = require('./myAddon/build/Release/myAddon.node');

contextBridge.exposeInMainWorld('winAppSdk', {
  showNotification: (title, body) => {
    myAddon.showNotification(title, body);
  }
});
