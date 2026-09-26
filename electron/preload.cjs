const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameAPI', {
  save: (data) => ipcRenderer.invoke('save:write', data),
  load: () => ipcRenderer.invoke('save:read'),
});
