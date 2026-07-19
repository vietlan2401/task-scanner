// src/extractor.js
// Logic trich xuat dau viec - dung chung cho ca Telegram va Zalo.
// Khong phu thuoc nen tang: nhan vao "messages" da chuan hoa, tra ve "tasks".

function normalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFC').trim();
}

// identity = { usernames: ['qua'], names: ['Nguyen Van A','anh A'], userId: 12345 }
function buildIdentity(identity) {
  identity = identity || {};
  const usernames = (identity.usernames || [])
    .map((u) => u.replace(/^@/, '').toLowerCase())
    .filter(Boolean);
  const names = (identity.names || []).map(normalize).filter(Boolean);
  const userId = identity.userId != null && identity.userId !== '' ? String(identity.userId) : null;
  return { usernames, names, userId };
}

// Chuan hoa 1 tin nhan (do adapter cua tung nen tang tao ra):
// { id, platform, chatId, chatName, senderId, senderName, text, date(ISO),
//   link?, mentionedUsernames?: [], replyToSenderId?, replyToSenderName? }

function detectTriggers(msg, ident, opts) {
  opts = opts || {};
  const triggers = [];
  const text = msg.text || '';
  const low = normalize(text);

  // 1) @mention: tu entities (Telegram) hoac tu chinh noi dung
  const enMentions = (msg.mentionedUsernames || []).map((u) => u.replace(/^@/, '').toLowerCase());
  const textMentions = (low.match(/@([a-z0-9_]{3,})/g) || []).map((m) => m.slice(1));
  const allMentions = new Set(enMentions.concat(textMentions));
  if (ident.usernames.some((u) => allMentions.has(u))) triggers.push('mention');

  // 2) Nhac ten trong noi dung
  if (opts.matchNames !== false && ident.names.length) {
    if (ident.names.some((n) => low.includes(n))) triggers.push('name');
  }

  // 3) Reply vao tin cua minh
  if (opts.matchReplies !== false) {
    const rid = msg.replyToSenderId != null ? String(msg.replyToSenderId) : null;
    if (ident.userId && rid && rid === ident.userId) {
      triggers.push('reply');
    } else if (msg.replyToSenderName) {
      // Fallback theo ten khi khong co id (vd Zalo import)
      const rn = normalize(msg.replyToSenderName);
      if (ident.names.some((n) => rn.includes(n))) triggers.push('reply');
    }
  }

  return triggers;
}

// Bien noi dung tin nhan thanh tieu de dau viec ngan gon.
function toTaskTitle(text) {
  let t = (text || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(@[a-z0-9_]+\s*)+/i, '').trim(); // bo @mention dau cau
  if (t.length > 140) t = t.slice(0, 137) + '...';
  return t || '(khong co noi dung)';
}

function extractTasks(messages, identityConfig, opts) {
  const ident = buildIdentity(identityConfig);
  const tasks = [];
  for (const msg of messages || []) {
    const triggers = detectTriggers(msg, ident, opts || {});
    if (!triggers.length) continue;
    tasks.push({
      id: msg.platform + ':' + msg.chatId + ':' + msg.id,
      platform: msg.platform,
      chatName: msg.chatName || '',
      from: msg.senderName || '',
      title: toTaskTitle(msg.text),
      text: msg.text || '',
      date: msg.date || null,
      triggers: triggers,
      link: msg.link || null,
      status: 'pending',
      aiDone: false,
    });
  }
  tasks.sort((a, b) => (b.date || '').localeCompare(a.date || '')); // moi nhat len dau
  return tasks;
}

// Gop task moi vao task cu, giu trang thai "done", khong trung id.
function mergeTasks(existing, incoming) {
  const byId = new Map();
  for (const t of existing || []) byId.set(t.id, t);
  for (const t of incoming || []) {
    if (byId.has(t.id)) {
      const prev = byId.get(t.id);
      if (prev.status) t.status = prev.status;       // giu trang thai
      if (prev.aiDone) { t.title = prev.title; t.aiDone = true; } // giu ban tom tat AI
    }
    byId.set(t.id, t);
  }
  return Array.from(byId.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

module.exports = { extractTasks, mergeTasks, detectTriggers, buildIdentity, toTaskTitle, normalize };
