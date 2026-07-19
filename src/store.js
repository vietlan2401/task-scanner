// src/store.js - luu config va tasks ra file JSON trong thu muc userData.
const fs = require('fs');
const path = require('path');

let baseDir = '.';
function init(dir) { baseDir = dir; fs.mkdirSync(baseDir, { recursive: true }); }
function file(name) { return path.join(baseDir, name); }

function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
  catch (e) { return fallback; }
}
function writeJson(name, data) {
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2), 'utf8');
}

const DEFAULT_CONFIG = {
  identity: { usernames: [], names: [], userId: null },
  telegram: { apiId: '', apiHash: '', session: '', phone: '' },
  scan: { lookbackDays: 7, matchNames: true, matchReplies: true, matchPrivate: true, selectedChats: [] },
  ai: { enabled: false, apiKey: '', model: 'gemini-flash-latest' },
};

function getConfig() {
  const c = readJson('config.json', {});
  return {
    identity: Object.assign({}, DEFAULT_CONFIG.identity, c.identity),
    telegram: Object.assign({}, DEFAULT_CONFIG.telegram, c.telegram),
    scan: Object.assign({}, DEFAULT_CONFIG.scan, c.scan),
    ai: Object.assign({}, DEFAULT_CONFIG.ai, c.ai),
  };
}
function saveConfig(cfg) { writeJson('config.json', cfg); }
function getTasks() { return readJson('tasks.json', []); }
function saveTasks(tasks) { writeJson('tasks.json', tasks); }

module.exports = { init, getConfig, saveConfig, getTasks, saveTasks, DEFAULT_CONFIG };
