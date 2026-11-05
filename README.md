# farewell terminal

離職道別小卡 —— 一人一張 QR，掃進去是一個終端機介面，打字機吐出寫給他的話。

## 怎麼改內容

1. 編輯 `cards.src.js`（**明文，不會上傳 GitHub**，已在 .gitignore）
2. `node build.mjs`      → 產生加密的 `cards.enc.json` 與 `tokens.json`
3. `node make-cards.mjs` → 產生 `qr/*.svg` 與 `print/cards-a4.html`
4. `git add -A && git commit -m "update" && git push`

> `build.mjs` 會沿用 `tokens.json` 裡既有的 token，所以**改文字不會讓已經印出去的 QR 失效**。
> 千萬不要刪掉 `tokens.json`，刪了就得重印。

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
