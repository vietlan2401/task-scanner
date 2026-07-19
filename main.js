// main.js - Electron main process
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const store = require('./src/store');
const zalo = require('./src/zalo');
const { extractTasks, mergeTasks } = require('./src/extractor');
const ai = require('./src/ai');

let tg = null;        // lazy require('./src/telegram')
let tgClient = null;
let win = null;
let pendingCode = null;
let pendingPassword = null;

// Neu bat AI: tom tat cac task chua duoc tom tat (aiDone=false).
async function applyAi(tasks, cfg, force) {
  if (!cfg.ai || !cfg.ai.enabled || !cfg.ai.apiKey) return tasks;
  const todo = tasks.filter((t) => force || !t.aiDone);
  if (!todo.length) return tasks;
  const map = await ai.summarizeTasks(todo, cfg.ai);
  for (const t of tasks) {
    if (map[t.id]) { t.title = map[t.id]; t.aiDone = true; }
  }
  return tasks;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1150,
    height: 780,
    minWidth: 820,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // Mo link ra trinh duyet ngoai, khong mo trong app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  store.init(path.join(app.getPath('userData'), 'data'));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC: config & tasks ----------
ipcMain.handle('config:get', () => store.getConfig());
ipcMain.handle('config:save', (e, cfg) => { store.saveConfig(cfg); return true; });
ipcMain.handle('tasks:get', () => store.getTasks());
ipcMain.handle('tasks:save', (e, tasks) => { store.saveTasks(tasks); return true; });
ipcMain.handle('tasks:clear', () => { store.saveTasks([]); return []; });
ipcMain.handle('open:external', (e, url) => { if (url) shell.openExternal(url); return true; });

// ---------- IPC: Zalo import thu cong ----------
ipcMain.handle('zalo:import', async (e, raw) => {
  const cfg = store.getConfig();
  const msgs = zalo.parse(raw);
  const found = extractTasks(msgs, cfg.identity, {
    matchNames: cfg.scan.matchNames,
    matchReplies: cfg.scan.matchReplies,
    matchPrivate: cfg.scan.matchPrivate,
  });
  let merged = mergeTasks(store.getTasks(), found);
  try { merged = await applyAi(merged, cfg); } catch (err) { win.webContents.send('ai:error', String(err.message || err)); }
  store.saveTasks(merged);
  return { scanned: msgs.length, added: found.length, tasks: merged };
});

// ---------- IPC: Telegram ----------
ipcMain.handle('tg:connect', async () => {
  tg = tg || require('./src/telegram');
  const cfg = store.getConfig();
  if (!cfg.telegram.apiId || !cfg.telegram.apiHash) {
    throw new Error('Chua nhap api_id / api_hash. Vao tab Cai dat de nhap.');
  }
  if (!cfg.telegram.phone) throw new Error('Chua nhap so dien thoai Telegram.');
  tgClient = await tg.createClient(cfg.telegram);
  const session = await tg.login(tgClient, {
    phone: cfg.telegram.phone,
    getCode: () => new Promise((res) => { pendingCode = res; win.webContents.send('tg:need-code'); }),
    getPassword: () => new Promise((res) => { pendingPassword = res; win.webContents.send('tg:need-password'); }),
    onError: (err) => win.webContents.send('tg:error', String(err && err.message ? err.message : err)),
  });
  cfg.telegram.session = session;    // luu de lan sau khoi login lai
  store.saveConfig(cfg);
  return { ok: true };
});

ipcMain.handle('tg:submit-code', (e, code) => {
  if (pendingCode) { pendingCode(code); pendingCode = null; }
  return true;
});
ipcMain.handle('tg:submit-password', (e, pw) => {
  if (pendingPassword) { pendingPassword(pw); pendingPassword = null; }
  return true;
});

ipcMain.handle('tg:status', () => ({ connected: !!(tgClient && tgClient.connected) }));

ipcMain.handle('tg:dialogs', async () => {
  tg = tg || require('./src/telegram');
  const cfg = store.getConfig();
  if (!tgClient) {
    if (cfg.telegram.session) { tgClient = await tg.createClient(cfg.telegram); await tgClient.connect(); }
    else throw new Error('Chua ket noi Telegram. Bam "Ket noi" truoc.');
  }
  return await tg.listDialogs(tgClient);
});

ipcMain.handle('tg:scan', async () => {
  tg = tg || require('./src/telegram');
  const cfg = store.getConfig();
  if (!tgClient) {
    if (cfg.telegram.session) {
      tgClient = await tg.createClient(cfg.telegram);
      await tgClient.connect();
    } else {
      throw new Error('Chua ket noi Telegram. Bam "Ket noi" truoc.');
    }
  }
  const res = await tg.scan(tgClient, {
    lookbackDays: cfg.scan.lookbackDays,
    selectedChats: cfg.scan.selectedChats || [],
    onProgress: (p) => win.webContents.send('tg:progress', p),
  });
  // Tu dong luu userId neu chua co (giup nhan dien reply chinh xac)
  if (!cfg.identity.userId && res.me && res.me.id) {
    cfg.identity.userId = res.me.id;
    if (res.me.username && !cfg.identity.usernames.includes(res.me.username)) {
      cfg.identity.usernames.push(res.me.username);
    }
    store.saveConfig(cfg);
  }
  const found = extractTasks(res.messages, cfg.identity, {
    matchNames: cfg.scan.matchNames,
    matchReplies: cfg.scan.matchReplies,
    matchPrivate: cfg.scan.matchPrivate,
  });
  let merged = mergeTasks(store.getTasks(), found);
  try { merged = await applyAi(merged, cfg); } catch (err) { win.webContents.send('ai:error', String(err.message || err)); }
  store.saveTasks(merged);
  return { scanned: res.messages.length, added: found.length, tasks: merged };
});

// Tom tat lai TAT CA dau viec hien co bang AI (nut bam)
ipcMain.handle('ai:resummarize', async () => {
  const cfg = store.getConfig();
  if (!cfg.ai || !cfg.ai.enabled || !cfg.ai.apiKey) throw new Error('Chua bat AI hoac chua nhap Gemini key trong Cai dat.');
  let tasks = store.getTasks();
  tasks = await applyAi(tasks, cfg, true);
  store.saveTasks(tasks);
  return tasks;
});
