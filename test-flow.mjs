import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const dir = './';
const html = readFileSync(dir + 'index.html', 'utf8');
const script = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g).pop()
                   .replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
const token = JSON.parse(readFileSync(dir + 'tokens.json','utf8'))[0].token;

// --- 最小 DOM stub ---
function mkEl(id){
  const el = {
    id, _text:'', className:'', hidden:false, value:'', placeholder:'',
    children:[],
    classList:{ _s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
                contains(c){return this._s.has(c)}, toggle(c,f){f?this.add(c):this.remove(c)} },
    get textContent(){ return this._text; },
    set textContent(v){ this._text = v; this.children.length = 0; },
    appendChild(n){ this.children.push(n); if(n.__text!==undefined) this._text += n.__text; return n; },
    addEventListener(){}, focus(){}, blur(){},
  };
  return el;
}
const els = {}; ['out','inputline','cmd','caret','hint','skip'].forEach(k=>els[k]=mkEl(k));
// out 需要追蹤 span 的文字
els.out.appendChild = function(n){
  this.children.push(n);
  this._text += (n.__isText ? n.__text : (n.__render ? n.__render() : ''));
  return n;
};
const spans = [];
const document = {
  getElementById: id => els[id],
  createElement: () => { const s = { className:'', _t:'',
      get textContent(){return this._t;}, set textContent(v){this._t=v;},
      __render(){ return this._t; } };
    spans.push(s);
    // out._text 需在 span 內容變動後才正確 → 改用最後統一收集
    return s; },
  createTextNode: t => ({ __isText:true, __text:t }),
  addEventListener(){},
  body:{ scrollHeight:0 },
};
const ctx = {
  document, console,
  crypto: webcrypto,
  TextEncoder, TextDecoder, atob: s => Buffer.from(s,'base64').toString('binary'),
  Array, JSON, Error, Promise, setTimeout, Buffer,
  matchMedia: () => ({ matches: true }),          // 關掉動畫 → 同步輸出
  location: { hash: '#' + token, search: '' },
  window: {},
  fetch: async (p) => ({ ok:true, status:200,
      json: async () => JSON.parse(readFileSync(dir + p, 'utf8')) }),
};
ctx.scrollTo = ()=>{};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(script, ctx);

await new Promise(r => setTimeout(r, 400));
// 依 appendChild 順序重建畫面文字
let lines = '';
for (const n of els.out.children) lines += n.__isText ? n.__text : n._t;
console.log('===== 畫面輸出 =====');
console.log(lines);
