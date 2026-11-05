// ============================================================
//  build.mjs —— 把明文名單加密成上線用的檔，並產生每人的 token
//  用法：  node build.mjs
// ============================================================
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { CARDS, FALLBACK } from './cards.src.js';

const BASE = (process.env.BASE_URL || 'https://monmonlee.github.io/bye/').replace(/\/?$/, '/');
const TOKENS_FILE = './tokens.json';
const enc = new TextEncoder();
const b64u = b => Buffer.from(b).toString('base64url');
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// token 是高熵隨機字串，所以直接 SHA-256 當金鑰即可（不需要慢速 KDF）
async function keyFromToken(token) {
  const raw = await sha256('key:' + token);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
}
const idFromToken = async (token) => Buffer.from(await sha256('id:' + token)).toString('hex').slice(0, 16);

// 已存在的 token 要沿用，否則重印 QR 會讓舊卡失效
const existing = existsSync(TOKENS_FILE)
  ? JSON.parse(readFileSync(TOKENS_FILE, 'utf8')) : [];
const prev = new Map(existing.map(t => [t.key, t.token]));

const entries = {};
const tokens = [];
for (const card of CARDS) {
  if (!card.key || !/^[a-z0-9-]+$/.test(card.key)) throw new Error(`key 要是小寫英數：${card.key}`);
  const token = prev.get(card.key) || b64u(crypto.getRandomValues(new Uint8Array(12)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await keyFromToken(token),
    enc.encode(JSON.stringify({ name: card.name, msg: card.msg }))
  ));
  entries[await idFromToken(token)] = { iv: b64u(iv), ct: b64u(ct) };
  tokens.push({ key: card.key, name: card.name, token, url: BASE + '#' + token });
}

// ── 印出去之後的保護 ──────────────────────────────────────
// token 是綁在 key 上的。改 name / msg 不會動到 token，
// 但「改 key」或「刪人」會讓那個人已印出的 QR 失效，所以這裡擋下來。
const nowKeys = new Set(CARDS.map(c => c.key));
const lost = existing.filter(t => !nowKeys.has(t.key));
if (lost.length) {
  console.error('\n✗ 停止：以下 key 在 cards.src.js 裡不見了（被改名或刪掉）：');
  for (const t of lost) console.error(`    ${t.key}  (${t.name})`);
  console.error('  這些人已印出的 QR 會失效。');
  console.error('  → 想改顯示名字請改 name，不要改 key；真的要刪人請先手動從 tokens.json 移除。\n');
  process.exit(1);
}
const added = tokens.filter(t => !prev.has(t.key));
writeFileSync('./.new-keys.json', JSON.stringify(added.map(t => t.key)));
if (existing.length && added.length) {
  console.warn(`! 新增了 ${added.length} 人：${added.map(t => t.key).join(', ')}`);
  console.warn('  他們的 QR 還沒印，記得補印（舊的不受影響）。');
}


writeFileSync('./cards.enc.json', JSON.stringify({ v: 1, entries }, null, 0));
writeFileSync('./fallback.json', JSON.stringify(FALLBACK, null, 2));
writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));

const reused = tokens.filter(t => prev.has(t.key)).length;
console.log(`✓ ${tokens.length} 張卡已加密 → cards.enc.json`);
console.log(`  沿用舊 token ${reused} 張、新產生 ${tokens.length - reused} 張`);
console.log(`  網址清單（含 token，不會上傳）→ tokens.json`);
