// 從 index.html 的 boot() 把每個輸出動作抓出來，算真實時間預算
import { readFileSync } from 'node:fs';
const h = readFileSync('./index.html','utf8');
const boot = h.slice(h.indexOf('function boot(card){'), h.indexOf('(async function start(){'));
let total = 0; const rows = [];
const re = /(say|reveal|print|wait)\(([^;]*?)\);/g;
let m;
while ((m = re.exec(boot))) {
  const fn = m[1], args = m[2];
  if (fn === 'wait') { const ms = +args.trim(); total += ms; rows.push(['wait', '', ms]); continue; }
  const lit = args.match(/^'((?:[^'\\]|\\.)*)'/);
  const text = lit ? lit[1].replace(/\\'/g, "'") : '(動態)';
  const nums = [...args.matchAll(/,\s*(\d+)\s*$/g)];
  const n = nums.length ? +nums[0][1] : null;
  let ms = 0;
  if (fn === 'say') {
    const len = text === '(動態)' ? 6 : text.length;        // 名字約 6 字
    const sp = n ?? 20;
    const punct = (text.match(/[。，、！？.,!?]/g)||[]).length;
    ms = (len - punct) * sp + punct * sp * 7;
  } else if (fn === 'reveal') ms = n ?? 420;
  total += ms;
  rows.push([fn, text.slice(0, 26), Math.round(ms)]);
}
for (const [fn, t, ms] of rows) console.log(`  ${fn.padEnd(7)} ${String(ms).padStart(5)}ms  ${t}`);
console.log(`\n  終端機開場合計：${(total/1000).toFixed(1)}s`);
console.log(`  封面動畫：7.8s  →  出現輸入列總共約 ${((total+7750)/1000).toFixed(1)}s`);
