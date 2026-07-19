// src/ai.js - Tom tat dau viec bang AI (Google Gemini).
// Dung fetch co san trong Node 20 (Electron 30).

function extractJson(text) {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim(); // bo hang rao ```
  const s = t.indexOf('[');
  const e = t.lastIndexOf(']');
  if (s !== -1 && e !== -1) t = t.slice(s, e + 1);
  try { return JSON.parse(t); } catch (err) { return null; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(items, cfg) {
  const model = (cfg.model || 'gemini-flash-latest').trim();
  const numbered = items.map((it, i) =>
    `${i + 1}. [Tu "${it.from || '?'}" trong nhom "${it.chat || '?'}"] ${it.text}`
  ).join('\n');

  const prompt =
`Ban la tro ly quan ly cong viec. Duoi day la cac tin nhan nguoi khac gui, trong do co nhac/giao viec cho toi.
Voi MOI tin, hay suy ra DAU VIEC toi can lam va viet lai that ngan gon, ro rang, dang menh lenh tieng Viet (toi da 14 tu).
Giu lai moc thoi gian / deadline neu co. Neu tin khong ro la viec gi thi tom tat ngan noi dung chinh.
Tra ve JSON array, moi phan tu {"i": <so thu tu>, "task": "<dau viec>"}.

${numbered}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json', // ep tra ve JSON sach (chay ca voi model "thinking")
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { i: { type: 'INTEGER' }, task: { type: 'STRING' } },
          required: ['i', 'task'],
        },
      },
    },
  };

  // Retry nhe khi bi 429/503 (het han muc tam thoi)
  let res, lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) break;
    const t = await res.text();
    lastErr = 'Gemini ' + res.status + ': ' + t.slice(0, 300);
    if (res.status === 429 || res.status === 503) { await sleep(2000 * (attempt + 1)); continue; }
    throw new Error(lastErr);
  }
  if (!res.ok) throw new Error(lastErr || 'Gemini loi khong ro');

  const data = await res.json();
  const cand = data && data.candidates && data.candidates[0];
  // Gop text tu TAT CA cac part (model thinking co the tach nhieu part)
  let out = '';
  if (cand && cand.content && Array.isArray(cand.content.parts)) {
    out = cand.content.parts.map((p) => p && p.text ? p.text : '').join('');
  }
  let arr = null;
  try { arr = JSON.parse(out); } catch (e) { arr = extractJson(out); }
  if (!Array.isArray(arr)) throw new Error('AI tra ve khong dung dinh dang JSON.');

  const map = {};
  for (const row of arr) {
    const idx = Number(row.i) - 1;
    if (items[idx] && row.task) map[items[idx].id] = String(row.task).trim();
  }
  return map;
}

// tasks: mang task (co .id, .text, .from, .chatName)
// cfg: { apiKey, model }
async function summarizeTasks(tasks, cfg) {
  if (!cfg || !cfg.apiKey) throw new Error('Chua nhap Gemini API key.');
  const items = tasks.map((t) => ({ id: t.id, text: t.text || t.title || '', from: t.from, chat: t.chatName }));
  const result = {};
  const CHUNK = 20;
  for (let i = 0; i < items.length; i += CHUNK) {
    const part = items.slice(i, i + CHUNK);
    const map = await callGemini(part, cfg);
    Object.assign(result, map);
  }
  return result;
}

module.exports = { summarizeTasks };
