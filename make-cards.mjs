// ============================================================
//  make-cards.mjs —— 產生每人的 QR（SVG）+ A4 列印小卡
//  用法：  node build.mjs && node make-cards.mjs
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const tokens = JSON.parse(readFileSync('./tokens.json', 'utf8'));
mkdirSync('./qr', { recursive: true });
mkdirSync('./print', { recursive: true });

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function cellHtml(t){
  // qrencode -t SVG：容錯等級 H（30%），中間挖掉放名字也還掃得到
  const svg = execFileSync('qrencode', ['-t','SVG','-l','H','-m','0','-s','8','-o','-', t.url],
                           { encoding:'utf8' });
  writeFileSync(`./qr/${t.key}.svg`, svg);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const vb = (svg.match(/viewBox="([^"]+)"/) || [,'0 0 100 100'])[1];

  // 中央名牌：白底挖空 + 名字。面積約 6%，遠低於 H 級的 30% 容錯上限
  const side = parseFloat(vb.split(/\s+/)[2]) || 100;
  const bw = side * 0.40, bh = side * 0.155;
  const bx = (side - bw) / 2, by = (side - bh) / 2;
  const label = String(t.name);
  const fs = Math.min(bh * 0.70, (bw * 0.86) / (label.length * 0.58));
  const badge = `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" `
    + `width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" fill="#fff"/>`
    + `<text x="${(side/2).toFixed(2)}" y="${(side/2).toFixed(2)}" `
    + `text-anchor="middle" dominant-baseline="central" `
    + `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" `
    + `font-size="${fs.toFixed(2)}" fill="#111">${esc(label)}</text>`;

  return `<div class="cell">
  <div class="name">${esc(t.name)}</div>
  <svg class="qr" viewBox="${vb}" shape-rendering="crispEdges">${inner}${badge}</svg>
  <div class="foot">掃我 ＼(^▽^)／</div>
</div>`;
}

function sheet(list, title){
  const COLS = 4, PAGE_H = 277;                 // A4 高 297 − 上下各 10mm 邊界
  const rows = Math.ceil(list.length / COLS);
  const rowH = Math.min(68, PAGE_H / Math.max(1, rows));   // 自動縮放，塞進一頁
  const qr   = (rowH * 0.58).toFixed(1);
  const nameSize = rowH > 60 ? 15 : 13;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  *{box-sizing:border-box}
  body{margin:0;font-family:"PingFang TC",-apple-system,sans-serif;background:#fff;color:#111}
  .grid{display:grid;grid-template-columns:repeat(${COLS},1fr);grid-auto-rows:${rowH.toFixed(1)}mm;gap:0}
  .cell{
    border:1px dashed #bbb; padding:4mm 2mm;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;
    break-inside:avoid;
  }
  .name{font-size:${nameSize}pt;font-weight:600;letter-spacing:1px}
  .qr{width:${qr}mm;height:${qr}mm;display:block}
  .foot{font-size:10pt;color:#555;letter-spacing:.3px}
  .tip{font-size:8pt;color:#999;margin:0 0 3mm}
  @media print{ .tip{display:none} }
</style></head><body>
<p class="tip">A4、縮放 100%、關閉「符合頁面大小」。虛線是裁切線，共 ${list.length} 張。</p>
<div class="grid">
${list.map(cellHtml).join('\n')}
</div>
</body></html>`;
}

writeFileSync('./print/cards-a4.html', sheet(tokens, 'farewell cards — 列印用'));

// 補印用：只印這次新增的人（已印出去的不用重印）
let newKeys = [];
try { newKeys = JSON.parse(readFileSync('./.new-keys.json', 'utf8')); } catch(_) {}
const fresh = tokens.filter(t => newKeys.includes(t.key));
if (fresh.length) {
  writeFileSync('./print/cards-new.html', sheet(fresh, 'farewell cards — 補印'));
}

console.log(`✓ ${tokens.length} 張 QR → qr/*.svg`);
console.log(`✓ 全部 → print/cards-a4.html`);
if (fresh.length) {
  console.log(`✓ 補印（只有新增的 ${fresh.length} 人：${fresh.map(f => f.name).join('、')}）`);
  console.log(`         → print/cards-new.html`);
}
