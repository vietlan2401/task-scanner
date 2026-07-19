// test/extractor.test.js - test logic loi bang node thuan (khong can Electron)
const assert = require('assert');
const { extractTasks, mergeTasks, toTaskTitle } = require('../src/extractor');
const zalo = require('../src/zalo');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.log('  ✗ ' + name + '\n    ' + e.message); fail++; }
}

const identity = { usernames: ['qua'], names: ['anh long', 'sep a'], userId: '999' };

console.log('== extractor ==');

t('bat @mention tu entities', () => {
  const msgs = [{ id: 1, platform: 'telegram', chatId: 'c1', chatName: 'Nhom A', senderName: 'Minh',
    text: 'nho check file nhe', date: '2026-07-18T10:00:00Z', mentionedUsernames: ['qua'] }];
  const tasks = extractTasks(msgs, identity);
  assert.strictEqual(tasks.length, 1);
  assert.ok(tasks[0].triggers.includes('mention'));
});

t('bat @mention viet thang trong text', () => {
  const msgs = [{ id: 2, platform: 'zalo', chatId: 'z1', chatName: 'Zalo', senderName: 'Nam',
    text: '@qua lam giup em bao cao', date: '2026-07-18T09:00:00Z' }];
  const tasks = extractTasks(msgs, identity);
  assert.ok(tasks[0].triggers.includes('mention'));
});

t('bat nhac ten trong noi dung (case-insensitive)', () => {
  const msgs = [{ id: 3, platform: 'zalo', chatId: 'z1', chatName: 'Zalo', senderName: 'Nam',
    text: 'Nho ANH LONG xu ly vu kia', date: '2026-07-18T08:00:00Z' }];
  const tasks = extractTasks(msgs, identity);
  assert.ok(tasks[0].triggers.includes('name'));
});

t('bat reply theo userId', () => {
  const msgs = [{ id: 4, platform: 'telegram', chatId: 'c1', chatName: 'Nhom A', senderName: 'Hoa',
    text: 'ok anh', date: '2026-07-18T07:00:00Z', replyToSenderId: '999' }];
  const tasks = extractTasks(msgs, identity);
  assert.ok(tasks[0].triggers.includes('reply'));
});

t('KHONG bat khi khong lien quan', () => {
  const msgs = [{ id: 5, platform: 'telegram', chatId: 'c1', chatName: 'Nhom A', senderName: 'Hoa',
    text: 'chao ca nha', date: '2026-07-18T06:00:00Z' }];
  assert.strictEqual(extractTasks(msgs, identity).length, 0);
});

t('bo qua nhac ten khi matchNames=false', () => {
  const msgs = [{ id: 6, platform: 'zalo', chatId: 'z1', chatName: 'Zalo', senderName: 'Nam',
    text: 'anh long oi', date: '2026-07-18T05:00:00Z' }];
  assert.strictEqual(extractTasks(msgs, identity, { matchNames: false }).length, 0);
});

t('nhieu trigger cung luc', () => {
  const msgs = [{ id: 7, platform: 'telegram', chatId: 'c1', chatName: 'X', senderName: 'Nam',
    text: '@qua nho anh long lam', date: '2026-07-18T04:00:00Z', replyToSenderId: '999' }];
  const tr = extractTasks(msgs, identity)[0].triggers;
  assert.ok(tr.includes('mention') && tr.includes('name') && tr.includes('reply'));
});

t('toTaskTitle bo @mention dau va cat dai', () => {
  assert.strictEqual(toTaskTitle('@qua   lam bao cao'), 'lam bao cao');
  assert.ok(toTaskTitle('x'.repeat(200)).length <= 140);
});

t('sap xep moi nhat len dau', () => {
  const msgs = [
    { id: 8, platform: 'telegram', chatId: 'c', chatName: 'X', text: '@qua a', date: '2026-07-10T00:00:00Z' },
    { id: 9, platform: 'telegram', chatId: 'c', chatName: 'X', text: '@qua b', date: '2026-07-18T00:00:00Z' },
  ];
  const tasks = extractTasks(msgs, identity);
  assert.strictEqual(tasks[0].id, 'telegram:c:9');
});

t('extractTasks gan status=pending mac dinh', () => {
  const msgs = [{ id: 99, platform: 'telegram', chatId: 'c', chatName: 'X', text: '@qua lam di', date: '2026-07-18T00:00:00Z' }];
  assert.strictEqual(extractTasks(msgs, identity)[0].status, 'pending');
});

console.log('== mergeTasks ==');
t('merge giu trang thai + ban tom tat AI, khong trung', () => {
  const existing = [{ id: 'telegram:c:1', status: 'done', aiDone: true, title: 'Viec da tom tat', date: '2026-07-18T00:00:00Z' }];
  const incoming = [{ id: 'telegram:c:1', status: 'pending', title: 'raw', date: '2026-07-18T00:00:00Z' },
                    { id: 'telegram:c:2', status: 'pending', title: 'raw2', date: '2026-07-17T00:00:00Z' }];
  const m = mergeTasks(existing, incoming);
  assert.strictEqual(m.length, 2);
  const kept = m.find((x) => x.id === 'telegram:c:1');
  assert.strictEqual(kept.status, 'done');
  assert.strictEqual(kept.title, 'Viec da tom tat');
  assert.strictEqual(kept.aiDone, true);
});

console.log('== zalo parser ==');
t('parse dang "Ten: noi dung"', () => {
  const raw = 'Anh Long: nho qua lam bao cao\n\nMinh: @qua check giup';
  const msgs = zalo.parse(raw);
  assert.strictEqual(msgs.length, 2);
  assert.strictEqual(msgs[0].senderName, 'Anh Long');
  assert.strictEqual(msgs[1].text, '@qua check giup');
});

t('parse JSON', () => {
  const raw = JSON.stringify([{ from: 'Nam', text: '@qua oi', chat: 'Group 1' }]);
  const msgs = zalo.parse(raw);
  assert.strictEqual(msgs[0].senderName, 'Nam');
  assert.strictEqual(msgs[0].chatName, 'Group 1');
});

t('zalo import + extract chay full', () => {
  const raw = 'Anh Long: viec nay giao cho ai\n\nNam: nho qua lam nhe @qua';
  const msgs = zalo.parse(raw);
  const tasks = extractTasks(msgs, identity);
  assert.strictEqual(tasks.length, 1); // chi tin cua Nam co @qua
  assert.ok(tasks[0].triggers.includes('mention'));
});

t('zalo BULK paste (khong dong trong, co moc gio) tach dung tin', () => {
  const bulk = 'Tuan\n14:38\nnho anh long xu ly\nNam\nviec khac khong lien quan\n15:02\nMinh: @qua lam nhe';
  const msgs = zalo.parse(bulk);
  // moc gio 14:38, 15:02 bi bo -> con 5 tin
  assert.strictEqual(msgs.length, 5);
  const tasks = extractTasks(msgs, identity);
  // "nho anh long xu ly" (ten) + "@qua lam nhe" (mention) = 2 viec
  assert.strictEqual(tasks.length, 2);
});

t('zalo BLOCK paste (co dong trong) giu nguyen sender', () => {
  const blocks = 'Anh Long: nho qua lam\n\nNam: viec vu vo';
  const msgs = zalo.parse(blocks);
  assert.strictEqual(msgs.length, 2);
  assert.strictEqual(msgs[0].senderName, 'Anh Long');
});

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
