// src/telegram.js
// Tich hop Telegram qua GramJS (MTProto - tai khoan ca nhan).
// Can api_id / api_hash lay tu https://my.telegram.org  -> API development tools.
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

// creds = { apiId, apiHash, session }
async function createClient(creds) {
  const session = new StringSession(creds.session || '');
  const client = new TelegramClient(session, Number(creds.apiId), String(creds.apiHash), {
    connectionRetries: 5,
  });
  return client;
}

// Login lan dau. Cac callback getCode/getPassword lay input tu UI (async).
// Tra ve session string de luu lai, lan sau khoi phai login.
async function login(client, { phone, getCode, getPassword, onError }) {
  await client.start({
    phoneNumber: async () => phone,
    phoneCode: async () => await getCode(),
    password: async () => (getPassword ? await getPassword() : ''),
    onError: (err) => { if (onError) onError(err); },
  });
  return client.session.save();
}

// Quet tin nhan gan day tren tat ca doan chat trong khoang lookbackDays.
// Tra ve { me, messages } - messages da chuan hoa cho extractor.
async function scan(client, opts = {}) {
  const lookbackDays = opts.lookbackDays || 7;
  const perChatLimit = opts.perChatLimit || 200;
  const maxChats = opts.maxChats || 200;
  const selected = (opts.selectedChats || []).map(String);
  const onProgress = opts.onProgress || (() => {});

  if (!client.connected) await client.connect();
  const me = await client.getMe();
  const myId = me && me.id != null ? String(me.id) : null;
  const myUsername = me && me.username ? me.username.toLowerCase() : null;
  const sinceMs = Date.now() - lookbackDays * 86400000;

  const out = [];
  let dialogs = await client.getDialogs({ limit: maxChats });
  if (selected.length) dialogs = dialogs.filter((d) => selected.includes(String(d.id)));
  let i = 0;
  for (const d of dialogs) {
    i++;
    onProgress({ chat: d.title || d.name || '', index: i, total: dialogs.length });
    let messages;
    try {
      messages = await client.getMessages(d.entity, { limit: perChatLimit });
    } catch (e) { continue; }

    for (const m of messages) {
      if (!m || !m.date) continue;
      if (m.date * 1000 < sinceMs) break; // tin sap xep moi -> cu, gap tin cu thi dung
      if (m.out) continue;                 // bo qua tin do chinh minh gui

      // @mention tu entities
      const mentioned = [];
      if (m.entities && m.message) {
        for (const ent of m.entities) {
          if (ent.className === 'MessageEntityMention') {
            mentioned.push(m.message.substr(ent.offset + 1, ent.length - 1).toLowerCase());
          } else if (ent.className === 'MessageEntityMentionName') {
            if (String(ent.userId) === myId) mentioned.push(myUsername || '__me__');
          }
        }
      }

      // Nguoi gui tin goc bi reply
      let replyToSenderId = null;
      if (m.replyTo && m.replyTo.replyToMsgId) {
        try {
          const orig = await client.getMessages(d.entity, { ids: m.replyTo.replyToMsgId });
          if (orig && orig[0] && orig[0].senderId != null) replyToSenderId = String(orig[0].senderId);
        } catch (e) { /* bo qua neu khong lay duoc */ }
      }

      let senderName = '';
      try {
        const s = m.sender;
        if (s) senderName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || s.title || '';
      } catch (e) {}

      let link = null;
      const chat = d.entity;
      if (chat) {
        if (chat.username) {
          link = 'https://t.me/' + chat.username + '/' + m.id;      // nhom/kenh cong khai
        } else if (chat.className === 'Channel') {
          link = 'https://t.me/c/' + String(chat.id) + '/' + m.id;  // nhom rieng (supergroup)
        }
      }

      out.push({
        id: m.id,
        platform: 'telegram',
        chatId: String(d.id),
        chatName: d.title || d.name || '',
        senderId: m.senderId != null ? String(m.senderId) : null,
        senderName,
        text: m.message || '',
        date: new Date(m.date * 1000).toISOString(),
        link,
        mentionedUsernames: mentioned,
        replyToSenderId,
      });
    }
  }
  return { me: { id: myId, username: myUsername }, messages: out };
}

// Liet ke cac doan chat (nhom/kenh/ca nhan) de nguoi dung chon quet.
async function listDialogs(client, opts = {}) {
  if (!client.connected) await client.connect();
  const dialogs = await client.getDialogs({ limit: opts.max || 200 });
  return dialogs.map((d) => ({
    id: String(d.id),
    name: d.title || d.name || '(khong ten)',
    isGroup: !!(d.isGroup || d.isChannel),
  }));
}

module.exports = { createClient, login, scan, listDialogs };

