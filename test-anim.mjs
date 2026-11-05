// 把整段動畫流程在 node 裡真的跑一遍（stub canvas / rAF），抓 ReferenceError 之類的執行期錯誤
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const dir = './';
const html = readFileSync(dir + 'index.html', 'utf8');
const script = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g).pop()
                   .replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
const token = JSON.parse(readFileSync(dir + 'tokens.json','utf8'))[0].token;

const out = [];
function mkEl(id){
  return { id, _t:'', className:'', hidden:false, value:'', placeholder:'', style:{},
    children:[], width:0, height:0, offsetWidth:1,
    classList:{ _s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
                contains(c){return this._s.has(c)}, toggle(c,f){f?this.add(c):this.remove(c)} },
    get textContent(){return this._t}, set textContent(v){this._t=v; this.children.length=0},
    appendChild(n){ this.children.push(n); return n; },
    querySelector(){ return mkEl('x'); },
    getBoundingClientRect(){ return { top:0, left:0, width:0, height:0 }; },
    setAttribute(){}, removeAttribute(){},
    _on:{}, addEventListener(t,f){ (this._on[t]=this._on[t]||[]).push(f); },
    removeEventListener(){}, focus(){}, blur(){},
    getContext(){ return {
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4), width:w, height:h}),
      putImageData(){}, measureText:(s)=>({width:s.length*10}),
      fillText(){}, set font(v){}, get font(){return ''},
      textAlign:'', textBaseline:'', fillStyle:'',
      getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(1,w*h*4))}),
    }; },
  };
}
const els = {};
['out','inputline','cmd','caret','hint','skip','px','pxhint'].forEach(k=>els[k]=mkEl(k));
els.out.appendChild = function(n){ this.children.push(n); return n; };

let rafId = 0; const rafQ = new Map();
let clock = 0;
const ctx = {
  console,
  crypto: webcrypto, TextEncoder, TextDecoder,
  atob: s => Buffer.from(s,'base64').toString('binary'),
  Array, JSON, Error, Promise, Math, Buffer, URLSearchParams, Uint8Array, Uint8ClampedArray,
  setTimeout: (fn, ms) => setTimeout(fn, 0),
  performance: { now: () => clock },
  requestAnimationFrame(fn){ const id = ++rafId; rafQ.set(id, fn); return id; },
  cancelAnimationFrame(id){ rafQ.delete(id); },
  matchMedia: () => ({ matches: false }),           // ← 動畫開著跑
  innerWidth: 390, innerHeight: 844,
  location: { hash: '#' + token, search: '' },
  document: { getElementById: id => els[id], createElement: () => mkEl('tmp'),
              createTextNode: t => ({__isText:true,__text:t}), addEventListener(){}, removeEventListener(){},
              body:{scrollHeight:0} },
  scrollTo(){},
  addEventListener(){}, removeEventListener(){},
  fetch: async (p) => {
    if (process.env.FAIL_FETCH && p.indexOf('cards.enc') === 0) throw new Error('network down');
    return { ok:true, status:200, json: async () => JSON.parse(readFileSync(dir + p, 'utf8')) };
  },
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(dir + 'sprites.js','utf8'), ctx);
vm.runInContext(readFileSync(dir + 'pixel-intro.js','utf8'), ctx);

// 記錄字幕時序，確認每句出現的時間點跟動畫階段對得上
const beats = [];
const _drawTitle = ctx.PixelIntro.drawTitle;
ctx.PixelIntro.drawTitle = function(img, W, H, text, tint){
  if (!beats.length || beats[beats.length-1].text !== text) beats.push({ text, from: clock });
  beats[beats.length-1].to = clock;
  return _drawTitle.apply(this, arguments);
};

let failed = null;
process.on('uncaughtException', e => {
  // 不能只記下來——計時器裡爆掉會讓 event loop 空掉、process 靜默 exit 0，
  // 結果真的壞了也會被當成通過。直接印出並以 1 結束。
  console.error('✗ 執行期例外：' + (e && e.message));
  console.error((e && e.stack || '').split('\n').slice(0, 5).join('\n'));
  process.exit(1);
});
process.on('unhandledRejection', r => {
  console.error('✗ 未處理的 rejection：' + (r && r.message || r));
  process.exit(1);
});
try { vm.runInContext(script, ctx); } catch(e){ failed = e; }

// 推進假時鐘，把整段動畫跑完
for (let step = 0; step < 220 && !failed; step++){
  clock += 50;   // 取樣變疏，仍走完整條時間軸（原本每 20ms 一幀太慢）
  const fns = [...rafQ.entries()];
  rafQ.clear();
  for (const [, fn] of fns){
    try { fn(clock); } catch(e){ failed = e; break; }
  }
  await new Promise(r => setTimeout(r, 0));
}
await new Promise(r => setTimeout(r, 120));

// 跑一次 card → replay，確認重播不會因重複進入而爆
async function type(txt){
  const hs = (els.cmd._on && els.cmd._on.keydown) || [];
  els.cmd.value = txt;
  for (const h of hs) h({ key:'Enter', preventDefault(){} });
  await new Promise(r => setTimeout(r, 60));
}
if (!failed && !process.env.FAIL_FETCH){
  await type('card');
  await type('replay');
  for (let step = 0; step < 220 && !failed; step++){
    clock += 50;
    const fns = [...rafQ.entries()]; rafQ.clear();
    for (const [, fn] of fns){ try { fn(clock); } catch(e){ failed = e; break; } }
    await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 120));
  console.log('  replay 重播    :', failed ? 'NO' : 'ok');
}

if (failed){ console.error('✗ 動畫執行期錯誤：', failed.message); process.exit(1); }
console.log('✓ 動畫跑完無錯誤');
console.log('  canvas 有啟用 :', els.px.classList.contains('on') || els.px.width > 0 ? 'yes' : 'NO');
console.log('  畫布尺寸      :', els.px.width + 'x' + els.px.height);
let text = '';
for (const n of els.out.children) text += (n.__isText ? n.__text : (n._t || ''));
const reached = process.env.FAIL_FETCH
  ? (text.includes('連不上伺服器') && !text.includes('沒有對應到任何人'))
  : (text.includes('嗨嗨') && text.includes('Jimmy'));
console.log(process.env.FAIL_FETCH ? '  斷線訊息正確  :' : '  有接上終端機  :', reached ? 'yes' : 'NO');
console.log('--- 字幕時序 ---');
for (const b of beats) console.log(`  ${String(b.from).padStart(5)}–${String(b.to).padStart(5)}ms  ${b.text}`);
console.log('--- 終端機輸出 ---');
console.log(text.trim());
if (!reached) process.exit(1);
