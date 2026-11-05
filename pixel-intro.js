/* ============================================================
   pixel-intro.js —— 1-bit dithering 像素過場
   參考風格：World of Horror / dithered sunset pixel art
   低解析度畫布放大 + 4x4 Bayer 有序抖動，純程式無圖檔
   ============================================================ */
(function(global){
  "use strict";

  // 4x4 Bayer 有序抖動矩陣（值 0..15）
  var BAYER = [0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5];

  // 色盤：深夜藍 → 中藍 → 奶油（參考圖三），最後會轉成終端機綠
  var SUNSET = [[20,22,42],[44,62,96],[63,109,158],[242,214,173]];
  var PHOSPHOR = [[7,16,11],[18,54,35],[46,125,79],[91,240,138]];

  function mixPal(a, b, t){
    return a.map(function(c, i){
      return [
        Math.round(c[0] + (b[i][0]-c[0])*t),
        Math.round(c[1] + (b[i][1]-c[1])*t),
        Math.round(c[2] + (b[i][2]-c[2])*t)
      ];
    });
  }

  // 山稜線：兩條正弦疊加，給一點不規則感
  function ridge(u){
    return 0.615 - 0.085*Math.sin(u*4.1 + 0.8) - 0.045*Math.sin(u*9.7 + 2.3) - 0.02*Math.sin(u*21.0);
  }

  /* 回傳該點亮度 0..1。u,v 為 0..1 的畫面座標，t 為 0..1 的動畫進度 */
  function scene(u, v, t){
    var horizon = 0.615;
    // 太陽：隨 t 由高處緩緩沉向地平線
    var sunY = 0.30 + 0.30 * t;
    var sunX = 0.42;
    var sunR = 0.105;
    var dx = (u - sunX) * 1.0, dy = (v - sunY) * 1.0;
    var d = Math.sqrt(dx*dx + dy*dy);

    // 天空：越靠近地平線越亮
    var val = 0.10 + 0.42 * Math.pow(Math.max(0, v / horizon), 2.1);
    // 太陽本體 + 光暈
    val += 1.25 * Math.max(0, 1 - d / sunR);
    val += 0.42 * Math.exp(-Math.pow(d / (sunR * 3.4), 2));
    // 橫向光帶（像圖三那樣的雲層切面）
    val += 0.16 * Math.exp(-Math.pow((v - sunY) / 0.030, 2)) * Math.exp(-Math.pow((u - sunX) / 0.42, 2));

    var r = ridge(u);
    if (v > r) {
      if (v < r + 0.012) {
        val = 0.62;                                   // 稜線反光
      } else {
        // 山體：暗，帶一點垂直紋理
        var depth = (v - r) / (1 - r);
        val = 0.26 - 0.10 * depth + 0.028 * Math.sin(u * 37.0) * (1 - depth);
        // 水面倒影（下三分之一）
        if (v > 0.80) {
          var rv = 2 * 0.80 - v + (0.80 - r);
          var dw = (v - 0.80) / 0.20;
          var band = 0.62 + 0.38 * Math.sin((v - 0.80) * (40.0 + 150.0 * dw) + u * 2.0);
          val = 0.14 + 0.34 * Math.max(0, scene_sky(u, rv, sunX, sunY, sunR, horizon)) * band * (1 - 0.35 * dw);
        }
      }
    }
    return Math.max(0, Math.min(1, val));
  }
  // 倒影用的純天空取樣（避免遞迴到山體）
  function scene_sky(u, v, sunX, sunY, sunR, horizon){
    var dx = u - sunX, dy = v - sunY, d = Math.sqrt(dx*dx + dy*dy);
    var val = 0.10 + 0.42 * Math.pow(Math.max(0, v / horizon), 2.1);
    val += 0.95 * Math.max(0, 1 - d / sunR);
    val += 0.35 * Math.exp(-Math.pow(d / (sunR * 3.4), 2));
    return Math.max(0, Math.min(1, val));
  }

  /* 把亮度 + 抖動 → 色盤索引 */
  function quantize(val, x, y, levels){
    var th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
    var scaled = val * (levels - 1);
    var base = Math.floor(scaled);
    var frac = scaled - base;
    var idx = base + (frac > th ? 1 : 0);
    return Math.max(0, Math.min(levels - 1, idx));
  }

  /* ---------- 繪製一幀 ----------
     phase: 0..1 整體進度
     reveal: 由上而下顯示到哪一行（0..1）
     dissolve: 0..1 碎解程度
     tint: 0..1 轉成綠色的程度                                    */
  function renderFrame(img, W, H, p){
    var pal = mixPal(SUNSET, PHOSPHOR, p.tint);
    var data = img.data, i = 0;
    for (var y = 0; y < H; y++){
      var v = y / H;
      var shown = v <= p.reveal;
      for (var x = 0; x < W; x++, i += 4){
        var c;
        if (!shown){
          c = pal[0];
        } else {
          var val = scene(x / W, v, p.t);
          if (p.dissolve > 0){
            // 碎解：用抖動矩陣當門檻，由下往上把畫面打散
            var bias = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
            var pressure = p.dissolve * (0.55 + 0.75 * v);
            if (pressure > bias) val *= Math.max(0, 1 - (pressure - bias) * 2.2);
          }
          c = pal[quantize(val, x, y, 4)];
        }
        data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2]; data[i+3] = 255;
      }
    }
    return img;
  }

  global.PixelIntro = { scene: scene, renderFrame: renderFrame, SUNSET: SUNSET, PHOSPHOR: PHOSPHOR };
})(typeof globalThis !== 'undefined' ? globalThis : this);
