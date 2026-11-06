# sprite 原始檔

`../sprites.js` 是產出結果，真正的原稿在這裡。

| 檔案 | 內容 |
|---|---|
| `sprites-scene.py` | 場景 sprite。**只畫剪影**（`X`），光影由 `autoshade()` 自動套 |
| `sprites-big.py`   | 人物專屬的大 sprite。逐格手上色（`1`基本 `2`暗 `3`亮 `4`輪廓） |

## 為什麼場景那組要自動上光影

手工上色時很容易把 silhouette 塗糊（第一版的草像怪物、星像箭頭、貓認不出來）。
改成「先畫乾淨剪影，程式統一套光源」之後形狀就清楚了，而且每隻的光源方向一定一致。

`autoshade()` 的規則（pixel art 的 sel-out 畫法）：

- 上緣或左緣（受光）→ `3` 亮部
- 下緣或右緣（背光）→ `2` 暗部
- 內部 → `1` 基本色
- 形狀右下的外側 → `4` 深輪廓

比整圈一樣的黑邊有立體感 —— 整圈黑邊會讓圖看起來像貼紙。

## 改完怎麼產生 sprites.js

```bash
python3 - <<'PY'
import sys, json; sys.path.insert(0,'tools')
from importlib import import_module
scene = import_module('sprites-scene').SCENE
big   = import_module('sprites-big').BIG
print(json.dumps({"scene":scene,"big":big}, ensure_ascii=False))
PY
```
把輸出貼回 `sprites.js` 的 `window.SPRITES`。
