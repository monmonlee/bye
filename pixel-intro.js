/* ============================================================
   pixel-intro.js —— 1-bit dithering 像素過場「撥雲見日」
   參考風格：World of Horror / dithered pixel art
   低解析度畫布 + 4x4 Bayer 有序抖動，純程式無圖檔
   ============================================================ */
(function(global){
  "use strict";

  var BAYER = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];

  // 色盤：由陰天藍 → 奶油金（撥雲見日），最後整盤轉成終端機綠
  var SUNSET   = [[22,28,54],[62,90,136],[168,190,214],[246,239,223]];
  var PHOSPHOR = [[7,16,11],[18,54,35],[46,125,79],[91,240,138]];

  var SUN_X = 0.46;

  function mixPal(a, b, t){
    return a.map(function(c, i){
      return [Math.round(c[0]+(b[i][0]-c[0])*t),
              Math.round(c[1]+(b[i][1]-c[1])*t),
              Math.round(c[2]+(b[i][2]-c[2])*t)];
    });
  }
  function bump(x, c, w){ var d = (x-c)/w; return Math.exp(-d*d); }
  function smoothstep(e0, e1, x){
    var t = Math.max(0, Math.min(1, (x-e0)/(e1-e0)));
    return t*t*(3-2*t);
  }
  function ridge(u){        // 近山（深）
    return 0.615 - 0.085*Math.sin(u*4.1+0.8) - 0.045*Math.sin(u*9.7+2.3) - 0.02*Math.sin(u*21.0);
  }
  function farRidge(u){     // 遠山（淺，壓在近山後面）
    return 0.560 - 0.070*Math.sin(u*2.7-1.4) - 0.030*Math.sin(u*6.3+0.6);
  }

  /* 雲層密度場：幾條帶狀雲疊加，t 讓它緩慢飄移 */
  function cloudField(u, v, t, anim){
    var drift = t * 0.18 + (anim || 0) * 0.016;
    var d = 0;
    d += bump(v, 0.13, 0.105) * (0.88 + 0.32*Math.sin((u+drift)*3.3 + 1.1));
    d += bump(v, 0.26, 0.095) * (0.85 + 0.35*Math.sin((u-drift*0.7)*5.1 + 3.4));
    d += bump(v, 0.37, 0.082) * (0.82 + 0.38*Math.sin((u+drift*1.3)*2.6 + 0.3));
    d += bump(v, 0.47, 0.068) * (0.78 + 0.42*Math.sin((u-drift)*7.4 + 2.0));
    // 大面積雲幕：讓開場整片天都是雲，而不是幾條帶子
    d += bump(v, 0.30, 0.260) * (0.62 + 0.26*Math.sin((u + drift*0.4)*2.1 + 0.9));
    // 高頻細節：讓雲邊是塊狀的，而不是一團平滑光暈
    d += 0.16*Math.sin(u*23.0 + v*17.0 + drift*3.0) * bump(v, 0.30, 0.260);
    return Math.max(0, Math.min(1.6, d));
  }

  /* 撥開：以太陽為中心向兩側退開的缺口，open 0→1 */
  function gapMask(u, v, open, sunY, asp){
    // 以太陽為圓心向外擴張的洞（不是貫穿天空的直柱）
    // dy 要乘長寬比，否則在螢幕上會變成瘦高的拱門
    var dx = u - SUN_X, dy = (v - (sunY || 0.36)) * (asp || 1) * 0.85;
    var d  = Math.sqrt(dx*dx + dy*dy);
    var half = 0.02 + 0.80*open;                 // 洞的半徑
    var edge = 0.07 + 0.18*open;                 // 邊緣羽化
    return 1 - smoothstep(half - edge, half, d); // 1 = 完全撥開
  }

  function skyBase(v, horizon){
    return 0.10 + 0.42*Math.pow(Math.max(0, v/horizon), 2.1);
  }

  /* 主場景。t 為 0..1：0＝滿天雲、1＝萬里無雲豔陽高照 */
  function scene(u, v, t, asp, anim){
    asp = asp || 1; anim = anim || 0;
    var horizon = 0.615;
    var sunY = 0.46 - 0.17*t;                    // 太陽升起
    var sunR = 0.090 + 0.028*t;                  // 越來越盛
    var open = smoothstep(0.08, 0.92, t);

    var cloud = cloudField(u, v, t, anim) * (1 - gapMask(u, v, open, sunY, asp));
    var occl  = Math.min(1, cloud * 1.9);        // 雲遮住太陽的程度

    var dx = u - SUN_X, dy = (v - sunY)*asp;
    var d = Math.sqrt(dx*dx + dy*dy);

    var val = skyBase(v, horizon) * (0.78 + 0.22*t);
    val += (1.25 + 0.45*t) * Math.max(0, 1 - d/sunR) * (1 - 0.97*occl);
    val += (0.40 + 0.30*t) * Math.exp(-Math.pow(d/(sunR*3.6), 2)) * (1 - 0.85*occl);

    // 雲本身：被照亮的一面偏亮，背光偏暗
    var lit = Math.exp(-Math.pow(d/0.34, 2));
    var cw = Math.min(1, cloud);
    val = val*(1 - 0.90*cw) + cw*(0.70 + 0.22*lit + 0.08*t);

    var rfar = farRidge(u);
    var r = ridge(u);
    if (v > rfar && v <= r) {                     // 遠山：比天空暗、比近山亮
      var fd = (v - rfar)/Math.max(0.001, r - rfar);
      val = 0.34 - 0.07*fd + 0.04*t;
      if (v < rfar + 0.008) val = 0.52 + 0.16*t;  // 遠山稜線受光
    }
    if (v > r) {
      if (v < r + 0.012) {
        val = 0.50 + 0.22*t;                      // 近山稜線反光
      } else {
        var depth = (v - r)/(1 - r);
        val = 0.25 - 0.09*depth;
        if (v > 0.80) {                            // 水面倒影
          var rv = 2*0.80 - v + (0.80 - r);
          var dw = (v - 0.80)/0.20;
          var band = 0.80 + 0.20*Math.sin((v-0.80)*(34.0+90.0*dw) + u*2.0 - anim*2.4);
          var rd = Math.sqrt(Math.pow(u-SUN_X,2) + Math.pow((rv-sunY)*asp,2));
          var sky = skyBase(rv, horizon)
                  + 0.95*Math.max(0, 1 - rd/sunR)
                  + 0.35*Math.exp(-Math.pow(rd/(sunR*3.6),2));
          val = 0.14 + 0.34*Math.max(0, Math.min(1, sky))*band*(1 - 0.35*dw);
        }
      }
    }
    return Math.max(0, Math.min(1, val));
  }

  // DITHER < 1 → 只有「夾在兩階之間」的像素才抖動，
  // 接近某一階的大片區域直接吃實色（真正的像素畫是這樣，不是整張都是網點）
  var DITHER = 0.70;
  /* 小人剪影（3x6 兩幀走路）：從右下谷底一路爬到左上峰頂 */
  var FIGURES = [[
    0,1,0,
    1,1,1,
    0,1,0,
    0,1,0,
    1,0,1,
    1,0,1
  ],[
    0,1,0,
    1,1,1,
    0,1,0,
    0,1,0,
    0,1,1,
    1,1,0
  ]];
  var FIG_W = 3, FIG_H = 6;
  var U_START = 0.90, U_END = 0.06;          // 谷底 → 峰頂

  function drawFigure(data, W, H, pal, anim, climb){
    var k = Math.max(0, Math.min(1, climb || 0));
    var e = k * k * (3 - 2 * k);                       // 起步與到頂都放慢
    var u = U_START + (U_END - U_START) * e;
    // 走路：每前進一小段換一次腳；爬坡時上下輕微起伏
    var fig = FIGURES[Math.floor(k * 46) % 2];
    var bob = (Math.floor(k * 46) % 2) ? 0 : -1;

    var fx = Math.round(u * W) - (FIG_W >> 1);
    var fy = Math.round(ridge(u) * H) - FIG_H + bob;
    var c = pal[0];
    for (var y = 0; y < FIG_H; y++){
      var yy = fy + y; if (yy < 0 || yy >= H) continue;
      for (var x = 0; x < FIG_W; x++){
        if (!fig[y*FIG_W + x]) continue;
        var xx = fx + x; if (xx < 0 || xx >= W) continue;
        var i = (yy*W + xx)*4;
        data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2];
      }
    }
  }

  function quantize(val, x, y, levels){
    var th = (BAYER[(y & 3)*4 + (x & 3)] + 0.5)/16;
    var scaled = val*(levels - 1);
    var base = Math.floor(scaled);
    var frac = scaled - base;
    var cut = 0.5 + (th - 0.5)*DITHER;
    var idx = base + (frac > cut ? 1 : 0);
    return Math.max(0, Math.min(levels - 1, idx));
  }

  function renderFrame(img, W, H, p){
    var pal = mixPal(SUNSET, PHOSPHOR, p.tint);
    var anim = (p.anim || 0) / 1000;
    var collapse = p.collapse || 0;
    var halfH = (1 - collapse) * 0.5;
    var data = img.data, i = 0, asp = H/W;
    for (var y = 0; y < H; y++){
      var v = y/H, shown = v <= p.reveal;
      // CRT 關機：畫面往中央一條水平線收合
      if (collapse > 0 && Math.abs(v - 0.5) > halfH){
        for (var bx = 0; bx < W; bx++, i += 4){
          data[i] = pal[0][0]; data[i+1] = pal[0][1]; data[i+2] = pal[0][2]; data[i+3] = 255;
        }
        continue;
      }
      if (collapse > 0.72 && Math.abs(v - 0.5) < 0.012){
        for (var lx = 0; lx < W; lx++, i += 4){
          data[i] = pal[3][0]; data[i+1] = pal[3][1]; data[i+2] = pal[3][2]; data[i+3] = 255;
        }
        continue;
      }
      for (var x = 0; x < W; x++, i += 4){
        var c;
        if (!shown){
          c = pal[0];
        } else {
          var val = scene(x/W, v, p.t, asp, anim);
          if (p.dissolve > 0){
            var bias = (BAYER[(y & 3)*4 + (x & 3)] + 0.5)/16;
            var pressure = p.dissolve*(0.55 + 0.75*v);
            if (pressure > bias) val *= Math.max(0, 1 - (pressure - bias)*2.2);
          }
          c = pal[quantize(val, x, y, 4)];
        }
        data[i]=c[0]; data[i+1]=c[1]; data[i+2]=c[2]; data[i+3]=255;
      }
    }
    if (p.reveal >= 1 && !collapse) drawFigure(data, W, H, pal, anim, p.climb);
    return img;
  }


  /* ---------- 像素字幕 ----------
     把文字畫進同一張低解析畫布，再二值化成 1-bit
     → 跟場景共用同一個像素網格，放大後就是真的像素字，零字型下載 */
  var _maskCache = {};
  function titleMask(text, W){
    var key = text + '|' + W;
    if (_maskCache[key]) return _maskCache[key];
    if (typeof document === 'undefined') return null;

    var FONT = '600 SIZEpx ui-monospace, "PingFang TC", "Heiti TC", "Noto Sans CJK TC", monospace';
    var maxW = W * 0.86;
    var probe = document.createElement('canvas').getContext('2d');
    var size = Math.max(9, Math.round(W * 0.185));
    while (size > 9) {                                  // 量到塞得下為止，絕不換行
      probe.font = FONT.replace('SIZE', size);
      if (probe.measureText(text).width <= maxW) break;
      size--;
    }
    probe.font = FONT.replace('SIZE', size);
    var w = Math.min(W, Math.ceil(probe.measureText(text).width) + 2);
    var h = Math.ceil(size * 1.34);

    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.font = FONT.replace('SIZE', size);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(text, w/2, h/2);

    var d = g.getImageData(0, 0, w, h).data;
    var bits = new Uint8Array(w*h);
    for (var i = 0, n = w*h; i < n; i++) bits[i] = d[i*4+3] > 132 ? 1 : 0;   // 二值化（門檻偏高，讓黏在一起的筆畫分開）
    var m = { w:w, h:h, bits:bits };
    _maskCache[key] = m;
    return m;
  }

  function drawTitle(img, W, H, text, tint){
    if (!text) return;
    var m = titleMask(text, W);
    if (!m) return;
    var pal = mixPal(SUNSET, PHOSPHOR, tint || 0);
    var data = img.data;
    var ox = Math.round((W - m.w)/2);
    var oy = Math.round(H*0.52 - m.h/2);
    var padY = 4, edge = W*0.12, dark = pal[0];

    for (var y = oy - padY; y < oy + m.h + padY; y++){
      if (y < 0 || y >= H) continue;
      var dy = Math.min(y - (oy - padY), (oy + m.h + padY) - y);
      var fy = dy < 3 ? dy/3 : 1;
      for (var x = 0; x < W; x++){
        var fx = x < edge ? x/edge : (x > W - edge ? (W - x)/edge : 1);
        var a = 0.82 * fx * fy;
        if (a <= 0) continue;
        var i = (y*W + x)*4;
        data[i]   = Math.round(data[i]  *(1-a) + dark[0]*a);
        data[i+1] = Math.round(data[i+1]*(1-a) + dark[1]*a);
        data[i+2] = Math.round(data[i+2]*(1-a) + dark[2]*a);
      }
    }
    var lit = pal[3];
    for (var ty = 0; ty < m.h; ty++){
      var yy = oy + ty; if (yy < 0 || yy >= H) continue;
      for (var tx = 0; tx < m.w; tx++){
        if (!m.bits[ty*m.w + tx]) continue;
        var xx = ox + tx; if (xx < 0 || xx >= W) continue;
        var j = (yy*W + xx)*4;
        data[j] = lit[0]; data[j+1] = lit[1]; data[j+2] = lit[2];
      }
    }
  }

  global.PixelIntro = { scene:scene, renderFrame:renderFrame, drawTitle:drawTitle,
                        SUNSET:SUNSET, PHOSPHOR:PHOSPHOR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
