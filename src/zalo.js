// src/zalo.js
// Zalo KHONG co API chinh thuc cho tai khoan ca nhan -> import thu cong.
// Ho tro:
//   A) DAN BULK (paste ca mo tin): moi DONG la 1 tin. Tu bo dong moc gio/ngay.
//      Neu dong dang "Ten: noi dung" thi tach duoc nguoi gui.
//   B) DAN CO DONG TRONG giua cac tin: moi khoi (cach nhau dong trong) = 1 tin (co the nhieu dong).
//   C) JSON: [{ from, text, date, chat, mentions?, replyToSenderName? }]

// Dong chi chua moc gio / ngay / nhan thoi gian -> bo qua khi tach tin.
function isTimeOnly(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^\d{1,2}[:h]\d{2}(\s*(am|pm|sa|ch|SA|CH))?$/i.test(t)) return true;      // 14:38 / 2:05 PM
  if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(t)) return true;                      // 17/07 / 17/07/2026
  if (/^(hôm nay|hôm qua|today|yesterday|thứ\s?\w+)$/i.test(t)) return true;      // Hom nay / Thu Hai
  return false;
}

// Bo moc gio o dau dong: "14:38 noi dung" -> "noi dung"
function stripLeadingTime(line) {
  return line.replace(/^\d{1,2}[:h]\d{2}(\s*(am|pm|sa|ch))?\s+/i, '').trim();
}

function makeMsg(idx, from, text, chatName) {
  return {
    id: idx,
    platform: 'zalo',
    chatId: chatName,
    chatName,
    senderId: null,
    senderName: from || '',
    text: text || '',
    date: new Date().toISOString(),
    link: null,
    mentionedUsernames: [],
    replyToSenderId: null,
    replyToSenderName: null,
  };
}

// Tach "Ten: noi dung" (bo qua URL kieu https://...)
function splitNameText(line) {
  const m = line.match(/^([^:]{1,30}):\s+(.+)$/);   // yeu cau co khoang trang sau dau ':' -> tranh URL
  if (m) return { from: m[1].trim(), text: m[2].trim() };
  return { from: '', text: line };
}

// Che do DONG: moi dong (khong phai moc gio) = 1 tin
function parseByLine(raw, chatName) {
  const out = [];
  let idx = 0;
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || isTimeOnly(line)) continue;
    line = stripLeadingTime(line);
    if (!line) continue;
    const { from, text } = splitNameText(line);
    out.push(makeMsg(idx++, from, text, chatName));
  }
  return out;
}

// Che do KHOI: cac tin cach nhau bang dong trong; moi khoi = 1 tin (co the nhieu dong)
function parseByBlock(raw, chatName) {
  const out = [];
  let idx = 0;
  for (const block of raw.split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l && !isTimeOnly(l));
    if (!lines.length) continue;
    let { from, text } = splitNameText(lines[0]);
    if (lines.length > 1) text = [text].concat(lines.slice(1)).join(' ').trim();
    out.push(makeMsg(idx++, from, text, chatName));
  }
  return out;
}

function parsePasted(raw, chatName) {
  chatName = chatName || 'Zalo (import)';
  // Co dong trong ngan cach -> che do khoi; khong -> che do dong (bulk)
  const hasBlankSep = /\n[ \t]*\n/.test(raw.trim());
  return hasBlankSep ? parseByBlock(raw, chatName) : parseByLine(raw, chatName);
}

function parseJson(raw) {
  const data = JSON.parse(raw);
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((r, i) => ({
    id: r.id != null ? r.id : i,
    platform: 'zalo',
    chatId: r.chat || 'Zalo (import)',
    chatName: r.chat || 'Zalo (import)',
    senderId: r.senderId != null ? String(r.senderId) : null,
    senderName: r.from || r.senderName || '',
    text: r.text || '',
    date: r.date || new Date().toISOString(),
    link: r.link || null,
    mentionedUsernames: r.mentions || [],
    replyToSenderId: r.replyToSenderId != null ? String(r.replyToSenderId) : null,
    replyToSenderName: r.replyToSenderName || null,
  }));
}

function parse(raw) {
  const t = (raw || '').trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    try { return parseJson(t); } catch (e) { /* thu dinh dang khac */ }
  }
  return parsePasted(t);
}

module.exports = { parse, parsePasted, parseJson };
