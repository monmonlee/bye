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

const cells = tokens.map(t => {
  // qrencode -t SVG：容錯等級 M，夠應付小卡被折到
  const svg = execFileSync('qrencode', ['-t','SVG','-l','M','-m','0','-s','8','-o','-', t.url],
                           { encoding:'utf8' });
  writeFileSync(`./qr/${t.key}.svg`, svg);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const vb = (svg.match(/viewBox="([^"]+)"/) || [,'0 0 100 100'])[1];
  return `<div class="cell">
  <div class="name">${esc(t.name)}</div>
  <svg class="qr" viewBox="${vb}" shape-rendering="crispEdges">${inner}</svg>
  <div class="foot">掃我 · 這張只有你打得開</div>
</div>`;
}).join('\n');

const sheet = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>farewell cards — 列印用</title>
<style>
  @page { size: A4; margin: 10mm; }
  *{box-sizing:border-box}
  body{margin:0;font-family:"PingFang TC",-apple-system,sans-serif;background:#fff;color:#111}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:68mm;gap:0}
  .cell{
    border:1px dashed #bbb; padding:5mm 2mm;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3.5mm;
    break-inside:avoid;
  }
  .name{font-size:15pt;font-weight:600;letter-spacing:1px}
  .qr{width:40mm;height:40mm;display:block}
  .foot{font-size:8pt;color:#777;letter-spacing:.3px}
  .tip{font-size:8pt;color:#999;margin:0 0 3mm}
  @media print{ .tip{display:none} }
</style></head><body>
<p class="tip">列印提示：A4、縮放 100%、關閉「符合頁面大小」。虛線是裁切線，共 ${tokens.length} 張。</p>
<div class="grid">
${cells}
</div>
</body></html>`;

writeFileSync('./print/cards-a4.html', sheet);
console.log(`✓ ${tokens.length} 張 QR → qr/*.svg`);
console.log(`✓ 列印用 A4 → print/cards-a4.html`);
