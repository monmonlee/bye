/* ============================================================
   pixel-intro.js —— 1-bit dithering 像素過場「撥雲見日」
   參考風格：World of Horror / dithered pixel art
   低解析度畫布 + 4x4 Bayer 有序抖動，純程式無圖檔
   ============================================================ */
(function(global){
  "use strict";

  var BAYER = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];

  // 色盤：由陰天藍 → 奶油金（撥雲見日），最後整盤轉成終端機綠
  var SUNSET   = [[20,22,42],[44,62,96],[63,109,158],[242,214,173]];
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
  function ridge(u){
    return 0.615 - 0.085*Math.sin(u*4.1+0.8) - 0.045*Math.sin(u*9.7+2.3) - 0.02*Math.sin(u*21.0);
  }

  /* 雲層密度場：幾條帶狀雲疊加，t 讓它緩慢飄移 */
  function cloudField(u, v, t){
    var drift = t * 0.18;
    var d = 0;
    d += bump(v, 0.13, 0.085) * (0.62 + 0.38*Math.sin((u+drift)*3.3 + 1.1));
    d += bump(v, 0.26, 0.075) * (0.60 + 0.40*Math.sin((u-drift*0.7)*5.1 + 3.4));
    d += bump(v, 0.37, 0.062) * (0.58 + 0.42*Math.sin((u+drift*1.3)*2.6 + 0.3));
    d += bump(v, 0.47, 0.050) * (0.55 + 0.45*Math.sin((u-drift)*7.4 + 2.0));
    // 大面積雲幕：讓開場整片天都是雲，而不是幾條帶子
    d += bump(v, 0.30, 0.230) * (0.34 + 0.22*Math.sin((u + drift*0.4)*2.1 + 0.9));
    return Math.max(0, Math.min(1.15, d));
  }

  /* 撥開：以太陽為中心向兩側退開的缺口，open 0→1 */
  function gapMask(u, v, open){
    var half = 0.75*open;                        // 缺口半寬（t=0 完全閉合）
    var edge = 0.08 + 0.17*open;                 // 邊緣羽化
    var dx = Math.abs(u - SUN_X);
    return 1 - smoothstep(half - edge, half, dx); // 1 = 完全撥開
  }

  function skyBase(v, horizon){
    return 0.10 + 0.42*Math.pow(Math.max(0, v/horizon), 2.1);
  }

  /* 主場景。t 為 0..1：0＝滿天雲、1＝萬里無雲豔陽高照 */
  function scene(u, v, t, asp){
    asp = asp || 1;
    var horizon = 0.615;
    var sunY = 0.46 - 0.17*t;                    // 太陽升起
    var sunR = 0.090 + 0.028*t;                  // 越來越盛
    var open = smoothstep(0.08, 0.92, t);

    var cloud = cloudField(u, v, t) * (1 - gapMask(u, v, open));
    var occl  = Math.min(1, cloud * 1.35);       // 雲遮住太陽的程度

    var dx = u - SUN_X, dy = (v - sunY)*asp;
    var d = Math.sqrt(dx*dx + dy*dy);

    var val = skyBase(v, horizon) * (0.78 + 0.22*t);
    val += (1.25 + 0.45*t) * Math.max(0, 1 - d/sunR) * (1 - 0.92*occl);
    val += (0.40 + 0.30*t) * Math.exp(-Math.pow(d/(sunR*3.6), 2)) * (1 - 0.70*occl);

    // 雲本身：被照亮的一面偏亮，背光偏暗
    var lit = Math.exp(-Math.pow(d/0.26, 2));
    val = val*(1 - 0.62*cloud) + cloud*(0.21 + 0.40*lit + 0.14*t);

    var r = ridge(u);
    if (v > r) {
      if (v < r + 0.012) {
        val = 0.50 + 0.22*t;                      // 稜線反光
      } else {
        var depth = (v - r)/(1 - r);
        val = 0.26 - 0.10*depth + 0.028*Math.sin(u*37.0)*(1-depth);
        if (v > 0.80) {                            // 水面倒影
          var rv = 2*0.80 - v + (0.80 - r);
          var dw = (v - 0.80)/0.20;
          var band = 0.62 + 0.38*Math.sin((v-0.80)*(40.0+150.0*dw) + u*2.0);
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

  function quantize(val, x, y, levels){
    var th = (BAYER[(y & 3)*4 + (x & 3)] + 0.5)/16;
    var scaled = val*(levels - 1);
    var base = Math.floor(scaled);
    var idx = base + ((scaled - base) > th ? 1 : 0);
    return Math.max(0, Math.min(levels - 1, idx));
  }

  function renderFrame(img, W, H, p){
    var pal = mixPal(SUNSET, PHOSPHOR, p.tint);
    var data = img.data, i = 0, asp = H/W;
    for (var y = 0; y < H; y++){
      var v = y/H, shown = v <= p.reveal;
      for (var x = 0; x < W; x++, i += 4){
        var c;
        if (!shown){
          c = pal[0];
        } else {
          var val = scene(x/W, v, p.t, asp);
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
    return img;
  }

  global.PixelIntro = { scene:scene, renderFrame:renderFrame, SUNSET:SUNSET, PHOSPHOR:PHOSPHOR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
