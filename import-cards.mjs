// ============================================================
//  import-cards.mjs —— 從 Obsidian 的 card.md 匯入文案到 cards.src.js
//  用法： node import-cards.mjs          （只報告，不動檔案）
//         node import-cards.mjs --write  （實際寫入）
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.env.CARD_MD
  || '/Users/amelielee/Documents/Obsidian Vault/card.md';
const WRITE = process.argv.includes('--write');

const tokens = JSON.parse(readFileSync('./tokens.json', 'utf8'));
const known = new Map(tokens.map(t => [t.key.toLowerCase(), t]));

// 切段：一行（可能帶 # 前綴）只要等於某個 key，就當作該人的段落開頭
const lines = readFileSync(SRC, 'utf8').split(/\r?\n/);
const found = new Map();
let cur = null, buf = [];
const flush = () => { if (cur) found.set(cur, buf.join('\n').trim()); buf = []; };
for (const line of lines) {
  const head = line.replace(/^#+\s*/, '').trim().toLowerCase();
  if (known.has(head)) { flush(); cur = head; continue; }
  if (cur) buf.push(line);
}
flush();

// 報告
const done = [], partial = [], empty = [];
for (const t of tokens) {
  const txt = (found.get(t.key.toLowerCase()) || '').trim();
  if (!txt) empty.push(t.name);
  else if (txt.length < 60 || !/\n/.test(txt)) partial.push(`${t.name}（${txt.length} 字）`);
  else done.push(`${t.name}（${txt.length} 字）`);
}
console.log(`來源：${SRC}`);
console.log(`\n✓ 寫好 ${done.length} 位：\n   ${done.join('\n   ')}`);
if (partial.length) console.log(`\n! 疑似未完成 ${partial.length} 位：\n   ${partial.join('\n   ')}`);
if (empty.length)   console.log(`\n⬜ 還沒寫 ${empty.length} 位：${empty.join('、')}`);

if (!WRITE) { console.log('\n（dry-run，沒有動任何檔案。要寫入請加 --write）'); process.exit(0); }

// 重新產生 cards.src.js，順序照 tokens.json，沒寫的保留佔位
const body = tokens.map(t => {
  const txt = (found.get(t.key.toLowerCase()) || '').trim();
  const msg = txt || `（寫給 ${t.name} 的話）`;
  return `  { key: ${JSON.stringify(t.key)}, name: ${JSON.stringify(t.name)},\n    msg: ${JSON.stringify(msg)} },`;
}).join('\n');

const header = readFileSync('./cards.src.js', 'utf8').split('export const CARDS = [')[0];
const tail = readFileSync('./cards.src.js', 'utf8').split('];')[1];
writeFileSync('./cards.src.js', `${header}export const CARDS = [\n${body}\n];${tail}`);
console.log('\n✓ 已寫入 cards.src.js');
