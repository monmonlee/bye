# farewell terminal

> **換電腦後從這裡開始。** 這個專案分散在三個 repo：
>
> | repo | 公開 | 內容 |
> |---|---|---|
> | [monmonlee/bye](https://github.com/monmonlee/bye) | public | 網站本體（這裡）。加密後的卡片、前端、sprite、工具 |
> | [monmonlee/bye-secrets](https://github.com/monmonlee/bye-secrets) | private | `tokens.json`＋`cards.src.js`。**弄丟＝已印的 QR 全廢** |
> | [monmonlee/claude-setup](https://github.com/monmonlee/claude-setup) | private | Claude 的 CLAUDE.md、memory、自己寫的 skill |
>
> 線上：https://monmonlee.github.io/bye/　樣品冊：見下方「設計樣品」

離職道別小卡 —— 一人一張 QR，掃進去是一個終端機介面，打字機吐出寫給他的話。

## 怎麼改內容

**文案寫在 Obsidian 的 `card.md`**（段落標題＝每個人的 key，有沒有 `###` 都可以）。
寫完跑 `node import-cards.mjs` 看報告，確認沒問題再 `node import-cards.mjs --write` 匯入。

0. 在 Obsidian 寫 → `node import-cards.mjs --write`
1. （或直接編輯 `cards.src.js`）（**明文，不會上傳 GitHub**，已在 .gitignore）
2. `node build.mjs`      → 產生加密的 `cards.enc.json` 與 `tokens.json`
3. `node make-cards.mjs` → 產生 `qr/*.svg` 與 `print/cards-a4.html`
4. `git add -A && git commit -m "update" && git push`

> `build.mjs` 會沿用 `tokens.json` 裡既有的 token，所以**改文字不會讓已經印出去的 QR 失效**。
> 千萬不要刪掉 `tokens.json`，刪了就得重印。

5. `./backup.sh` → 把 `tokens.json` 與 `cards.src.js` 同步到私有 repo
   [monmonlee/bye-secrets](https://github.com/monmonlee/bye-secrets)

**每次改完文案都要跑 `./backup.sh`。** 這兩個檔案不在公開 repo 裡（故意的），
而公司電腦鎖住檔案傳輸，git/gh 是唯一能把它們帶出這台機器的通道。

## 改完先跑測試（30 秒）

```
node test-flow.mjs    # 解密 + 終端機輸出順序
node test-anim.mjs    # 整段動畫跑一遍，抓執行期錯誤、確認有接上終端機
```

兩個都要印出內容才算過。曾經有一次改動把動畫的時間軸常數刪掉，
畫面會卡在 banner 不動 —— `test-anim.mjs` 就是為了擋這種錯。

## 列印

開 `print/cards-a4.html` → Cmd+P → A4、縮放 100%、關掉「符合頁面大小」。
或直接印 `print/cards-a4.pdf`。

## 安全模型

- 每人一組隨機 token（96 bit），只存在於他那張 QR 裡。
- 卡片內容用 AES-GCM 加密，金鑰由 token 導出；token 不在 repo 裡。
- 所以：公開 repo 翻不到任何人的內容，也沒辦法看別人的卡。
- token 放在網址的 `#` 之後，不會送到伺服器、不會進 referrer。
- `robots.txt` + `noindex` 擋搜尋引擎收錄。

拿到別人 QR 的人當然看得到那張卡 —— 實體小卡本來就是這樣。


## 新電腦怎麼接手

```bash
git clone https://github.com/monmonlee/bye.git
git clone https://github.com/monmonlee/bye-secrets.git
cp bye-secrets/tokens.json bye-secrets/cards.src.js bye/
cd bye && node build.mjs && node make-cards.mjs
```

`gh auth login` 要登 **monmonlee**（不是公司帳號），git email 用個人 gmail。

## 設計樣品

字型／花邊／sprite 的比較頁發布在 Claude Artifact：
https://claude.ai/code/artifact/3a6d980b-22bc-4520-afa1-44a3b681c175
（原始檔 `_sample-book.html` 沒進 repo，因為內嵌了第三方字型子集）

## 用到的字型

動畫字幕目前是系統字型二值化。想換成真正的像素字型，三款免費開源的：

| 字型 | 來源 | 授權 |
|---|---|---|
| Cubic 11（台灣製，推薦） | https://github.com/ACh-K/Cubic-11 | OFL |
| Zpix 最像素 | https://github.com/SolidZORO/zpix-pixel-font | OFL |
| Fusion Pixel 12px | https://github.com/TakWolf/fusion-pixel-font | OFL |

整段動畫只用到 15 個字，用 `pyftsubset` 裁切後約 1.5 KB，可直接內嵌。
