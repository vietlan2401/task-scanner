// preload.js - cau noi an toan giua renderer va main
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (c) => ipcRenderer.invoke('config:save', c),
  getTasks: () => ipcRenderer.invoke('tasks:get'),
  saveTasks: (t) => ipcRenderer.invoke('tasks:save', t),
  clearTasks: () => ipcRenderer.invoke('tasks:clear'),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),

  importZalo: (raw) => ipcRenderer.invoke('zalo:import', raw),
  aiResummarize: () => ipcRenderer.invoke('ai:resummarize'),

  tgConnect: () => ipcRenderer.invoke('tg:connect'),
  tgSubmitCode: (c) => ipcRenderer.invoke('tg:submit-code', c),
  tgSubmitPassword: (p) => ipcRenderer.invoke('tg:submit-password', p),
  tgStatus: () => ipcRenderer.invoke('tg:status'),
  tgScan: () => ipcRenderer.invoke('tg:scan'),
  tgDialogs: () => ipcRenderer.invoke('tg:dialogs'),

  onTg: (handler) => {
    ipcRenderer.on('tg:need-code', () => handler({ type: 'need-code' }));
    ipcRenderer.on('tg:need-password', () => handler({ type: 'need-password' }));
    ipcRenderer.on('tg:error', (e, msg) => handler({ type: 'error', msg }));
    ipcRenderer.on('tg:progress', (e, p) => handler({ type: 'progress', p }));
    ipcRenderer.on('ai:error', (e, msg) => handler({ type: 'ai-error', msg }));
  },
});
