// ============================================================
//  fix-spacing.mjs —— 中英／中數之間補半形空格（盤古之白）
//  用法： node fix-spacing.mjs          （只報告）
//         node fix-spacing.mjs --write  （寫回 card.md）
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = process.env.CARD_MD || '/Users/amelielee/Documents/Obsidian Vault/card.md';
const WRITE = process.argv.includes('--write');

const CJK = '一-鿿㐀-䶿';
// 只在「漢字 ↔ 英數」之間補，不碰標點（XD， 不會變成 XD ，）
const pangu = (t) => t
  .replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2')
  .replace(new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g'), '$1 $2');

const before = readFileSync(SRC, 'utf8');
const after = pangu(before);

const b = before.split('\n'), a = after.split('\n');
let n = 0;
for (let i = 0; i < b.length; i++) {
  if (b[i] === a[i]) continue;
  n++;
  if (n <= 12) {
    console.log(`  L${i+1}`);
    console.log(`    舊  ${b[i].trim().slice(0, 56)}`);
    console.log(`    新  ${a[i].trim().slice(0, 58)}`);
  }
}
console.log(`\n共 ${n} 行會變動` + (n > 12 ? '（上面只列前 12 行）' : ''));
if (!WRITE) { console.log('（dry-run，沒有寫入。要套用請加 --write）'); process.exit(0); }
writeFileSync(SRC, after);
console.log('✓ 已寫回 card.md');
