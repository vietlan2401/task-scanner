// renderer/app.js
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
let TASKS = [];
let CONFIG = null;
let DIALOGS = [];

const STATUSES = [
  { v: 'pending', label: 'Chờ' },
  { v: 'inprogress', label: 'Đang làm' },
  { v: 'done', label: 'Xong' },
  { v: 'reject', label: 'Huỷ' },
];
const TRLABEL = { mention: '@mention', name: 'nhắc tên', reply: 'reply' };
const ICON_TG = '<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#229ED9"/><path d="M18 6.5L15.6 18c-.15.7-.6.85-1.2.53l-3.3-2.43-1.6 1.54c-.18.18-.33.33-.66.33l.24-3.36 6.1-5.5c.27-.24-.06-.37-.4-.14l-7.55 4.75-3.25-1.02c-.7-.22-.72-.7.15-1.05l12.7-4.9c.6-.22 1.1.14.9 1.05z" fill="#fff"/></svg>';
const ICON_ZL = '<svg width="14" height="14" viewBox="0 0 24 24"><rect width="24" height="24" rx="7" fill="#0068FF"/><text x="12" y="16" font-size="9" fill="#fff" text-anchor="middle" font-weight="700" font-family="Arial">Zalo</text></svg>';

function setStatus(m) { $('#status-line').textContent = m; }
function log(m) { const el = $('#tg-log'); if (el) { el.textContent += (el.textContent ? '\n' : '') + m; el.scrollTop = el.scrollHeight; } }
function esc(s) { return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// -------- Sidebar toggle --------
function applySidebar() { document.body.classList.toggle('sb-collapsed', localStorage.getItem('sbCollapsed') === '1'); }
function toggleSidebar() { const c = document.body.classList.toggle('sb-collapsed'); localStorage.setItem('sbCollapsed', c ? '1' : '0'); }
$('#toggle-sb').addEventListener('click', toggleSidebar);
$$('[data-toggle]').forEach((b) => b.addEventListener('click', toggleSidebar));

// -------- Tabs --------
$$('.nav-item').forEach((b) => b.addEventListener('click', () => {
  $$('.nav-item').forEach((x) => x.classList.remove('active'));
  $$('.tab').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  $('#tab-' + b.dataset.tab).classList.add('active');
}));

// -------- Render tasks --------
function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function brandIcon(pf) { return pf === 'telegram' ? ICON_TG : pf === 'zalo' ? ICON_ZL : ''; }

function renderTasks() {
  const q = $('#search').value.trim().toLowerCase();
  const fp = $('#filter-platform').value;
  const ft = $('#filter-trigger').value;
  const fs = $('#filter-status').value;

  const list = TASKS.filter((t) => {
    if (fp && t.platform !== fp) return false;
    if (ft && !(t.triggers || []).includes(ft)) return false;
    if (fs && (t.status || 'pending') !== fs) return false;
    if (q && !((t.title + ' ' + t.text + ' ' + t.from + ' ' + t.chatName).toLowerCase().includes(q))) return false;
    return true;
  });

  $('#task-count').textContent = TASKS.filter((t) => ['pending', 'inprogress'].includes(t.status || 'pending')).length;
  const wrap = $('#task-list');
  $('#empty').style.display = list.length ? 'none' : 'block';

  wrap.innerHTML = list.map((t) => {
    const idx = TASKS.indexOf(t);
    const st = t.status || 'pending';
    const isManual = t.platform === 'manual';
    const tags = (t.triggers || []).filter((x) => TRLABEL[x]).map((x) => `<span class="tag ${x}">${TRLABEL[x]}</span>`).join(' ');
    const manualTag = isManual ? '<span class="tag manual"><i class="ti ti-pencil" style="font-size:13px"></i>Tự nhập</span>' : '';
    const brand = isManual ? '' : `<span class="brand-ico">${brandIcon(t.platform)}</span>`;
    const rawHint = (t.aiDone && t.text) ? `<div class="raw-hint">Nguồn: ${esc(t.text.slice(0, 100))}${t.text.length > 100 ? '…' : ''}</div>` : '';
    const link = t.link ? `<a href="#" data-url="${esc(t.link)}" class="open-link">mở tin gốc <i class="ti ti-external-link" style="font-size:12px"></i></a>` : '';
    const opts = STATUSES.map((s) => `<option value="${s.v}" ${s.v === st ? 'selected' : ''}>${s.label}</option>`).join('');
    return `<div class="task st-${st}">
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        ${rawHint}
        <div class="task-meta">
          ${brand}${manualTag}${tags}
          ${t.from ? `<span>${esc(t.from)}</span>` : ''}
          ${t.chatName ? `<span>· ${esc(t.chatName)}</span>` : ''}
          <span>· ${fmtDate(t.date)}</span>
          ${link}
        </div>
      </div>
      <select class="status-select st-${st}" data-idx="${idx}">${opts}</select>
    </div>`;
  }).join('');

  $$('#task-list .status-select').forEach((sel) => sel.addEventListener('change', async () => {
    TASKS[Number(sel.dataset.idx)].status = sel.value;
    await window.api.saveTasks(TASKS);
    renderTasks();
  }));
  $$('.open-link').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.api.openExternal(a.dataset.url); }));
}

['#search', '#filter-platform', '#filter-trigger', '#filter-status'].forEach((s) => $(s).addEventListener('input', renderTasks));

$('#clear-tasks').addEventListener('click', async () => {
  if (!confirm('Xoá toàn bộ đầu việc?')) return;
  TASKS = await window.api.clearTasks();
  renderTasks();
});

// -------- Manual add --------
async function addManual() {
  const v = $('#manual-input').value.trim();
  if (!v) return;
  TASKS.unshift({
    id: 'manual:' + Date.now(), platform: 'manual', chatName: '', from: '',
    title: v, text: v, date: new Date().toISOString(), triggers: ['manual'],
    status: 'pending', link: null, aiDone: false,
  });
  $('#manual-input').value = '';
  await window.api.saveTasks(TASKS);
  renderTasks();
}
$('#manual-add').addEventListener('click', addManual);
$('#manual-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addManual(); });

// -------- Chat filter (chon nhom de quet) --------
$('#chat-chip').addEventListener('click', () => {
  $('#chat-panel').classList.toggle('hidden');
});
function selectedChats() { return (CONFIG.scan.selectedChats || []).map(String); }
function updateChipLabel() {
  const n = selectedChats().length;
  $('#chat-chip-label').textContent = n ? (n + ' nhóm') : 'Nhóm';
  $('#chat-chip').classList.toggle('on', n > 0);
}
function renderChatList() {
  const wrap = $('#chat-list');
  if (!DIALOGS.length) { wrap.innerHTML = '<div class="spin">Bấm "Tải danh sách nhóm" (cần kết nối Telegram trước).</div>'; return; }
  const sel = new Set(selectedChats());
  wrap.innerHTML = DIALOGS.map((d) => {
    const on = sel.has(String(d.id));
    return `<div class="cp-row ${on ? 'on' : ''}" data-id="${esc(String(d.id))}">
      <span class="cp-box">${on ? '<i class="ti ti-check" style="font-size:12px;color:#fff"></i>' : ''}</span>${esc(d.name)}</div>`;
  }).join('');
  $$('#chat-list .cp-row').forEach((row) => row.addEventListener('click', async () => {
    const id = row.dataset.id;
    let arr = selectedChats();
    if (arr.includes(id)) arr = arr.filter((x) => x !== id); else arr.push(id);
    CONFIG.scan.selectedChats = arr;
    await window.api.saveConfig(CONFIG);
    updateChipLabel();
    renderChatList();
  }));
}
$('#chat-reload').addEventListener('click', async () => {
  $('#chat-list').innerHTML = '<div class="spin">Đang tải danh sách nhóm...</div>';
  try {
    DIALOGS = await window.api.tgDialogs();
    renderChatList();
  } catch (e) { $('#chat-list').innerHTML = '<div class="spin">Lỗi: ' + esc(e.message) + '</div>'; }
});

// -------- Settings --------
function fillSettings() {
  $('#cfg-usernames').value = (CONFIG.identity.usernames || []).join(', ');
  $('#cfg-names').value = (CONFIG.identity.names || []).join(', ');
  $('#cfg-apiid').value = CONFIG.telegram.apiId || '';
  $('#cfg-apihash').value = CONFIG.telegram.apiHash || '';
  $('#cfg-phone').value = CONFIG.telegram.phone || '';
  $('#cfg-lookback').value = CONFIG.scan.lookbackDays || 7;
  $('#cfg-names-on').checked = CONFIG.scan.matchNames !== false;
  $('#cfg-replies-on').checked = CONFIG.scan.matchReplies !== false;
  $('#cfg-ai-on').checked = !!(CONFIG.ai && CONFIG.ai.enabled);
  $('#cfg-ai-key').value = (CONFIG.ai && CONFIG.ai.apiKey) || '';
  $('#cfg-ai-model').value = (CONFIG.ai && CONFIG.ai.model) || 'gemini-flash-latest';
}
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
$('#save-settings').addEventListener('click', async () => {
  CONFIG.identity.usernames = splitList($('#cfg-usernames').value);
  CONFIG.identity.names = splitList($('#cfg-names').value);
  CONFIG.telegram.apiId = $('#cfg-apiid').value.trim();
  CONFIG.telegram.apiHash = $('#cfg-apihash').value.trim();
  CONFIG.telegram.phone = $('#cfg-phone').value.trim();
  CONFIG.scan.lookbackDays = Number($('#cfg-lookback').value) || 7;
  CONFIG.scan.matchNames = $('#cfg-names-on').checked;
  CONFIG.scan.matchReplies = $('#cfg-replies-on').checked;
  CONFIG.ai = CONFIG.ai || {};
  CONFIG.ai.enabled = $('#cfg-ai-on').checked;
  CONFIG.ai.apiKey = $('#cfg-ai-key').value.trim();
  CONFIG.ai.model = $('#cfg-ai-model').value.trim() || 'gemini-flash-latest';
  await window.api.saveConfig(CONFIG);
  $('#save-note').textContent = '✓ Đã lưu';
  setTimeout(() => ($('#save-note').textContent = ''), 2000);
});

// -------- AI resummarize --------
$('#ai-resummarize').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try { btn.disabled = true; setStatus('AI đang tóm tắt lại...'); TASKS = await window.api.aiResummarize(); renderTasks(); setStatus('✓ Đã tóm tắt lại bằng AI'); }
  catch (err) { setStatus('Lỗi AI: ' + err.message); alert('Lỗi AI: ' + err.message); }
  finally { btn.disabled = false; }
});

// -------- Zalo import --------
$('#zalo-import').addEventListener('click', async () => {
  const raw = $('#zalo-input').value;
  if (!raw.trim()) return;
  $('#zalo-result').textContent = 'Đang xử lý...';
  const res = await window.api.importZalo(raw);
  TASKS = res.tasks; renderTasks();
  $('#zalo-result').textContent = `Quét ${res.scanned} tin → thêm ${res.added} đầu việc.`;
});

// -------- Telegram --------
$('#tg-connect').addEventListener('click', async () => {
  try { log('Đang kết nối...'); $('#tg-state').textContent = 'Đang kết nối...'; await window.api.tgConnect(); $('#tg-state').textContent = 'Đã kết nối'; $('#tg-state').classList.add('on'); log('✓ Kết nối thành công.'); }
  catch (e) { log('✗ ' + e.message); $('#tg-state').textContent = 'Lỗi'; }
});
$('#tg-code-submit').addEventListener('click', async () => { await window.api.tgSubmitCode($('#tg-code').value.trim()); $('#tg-code-box').classList.add('hidden'); });
$('#tg-pass-submit').addEventListener('click', async () => { await window.api.tgSubmitPassword($('#tg-pass').value); $('#tg-pass-box').classList.add('hidden'); });
async function doScan(btn) {
  try { setStatus('Đang quét Telegram...'); if (btn) btn.disabled = true; const res = await window.api.tgScan(); TASKS = res.tasks; renderTasks(); setStatus(`✓ Quét ${res.scanned} tin, thêm ${res.added} việc`); }
  catch (e) { setStatus('Lỗi: ' + e.message); log('✗ ' + e.message); }
  finally { if (btn) btn.disabled = false; }
}
$('#tg-scan').addEventListener('click', (e) => doScan(e.currentTarget));
$('#scan-all').addEventListener('click', (e) => doScan(e.currentTarget));

window.api.onTg((ev) => {
  if (ev.type === 'need-code') { $('#tg-code-box').classList.remove('hidden'); log('→ Nhập mã xác thực gửi về Telegram.'); }
  else if (ev.type === 'need-password') { $('#tg-pass-box').classList.remove('hidden'); log('→ Nhập mật khẩu 2 lớp.'); }
  else if (ev.type === 'error') { log('✗ ' + ev.msg); }
  else if (ev.type === 'ai-error') { setStatus('Lỗi AI: ' + ev.msg); }
  else if (ev.type === 'progress') { setStatus(`Quét: ${ev.p.chat} (${ev.p.index}/${ev.p.total})`); }
});

// -------- Init --------
(async function init() {
  applySidebar();
  CONFIG = await window.api.getConfig();
  TASKS = await window.api.getTasks();
  let changed = false;
  for (const t of TASKS) { if (!t.status) { t.status = t.done ? 'done' : 'pending'; delete t.done; changed = true; } }
  if (changed) await window.api.saveTasks(TASKS);
  fillSettings();
  updateChipLabel();
  renderTasks();
  const st = await window.api.tgStatus();
  if (st.connected) { $('#tg-state').textContent = 'Đã kết nối'; $('#tg-state').classList.add('on'); }
})();
