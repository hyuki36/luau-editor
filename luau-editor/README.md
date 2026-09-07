# Luau Editor (MVP)

App PC viết code Luau/Roblox — Electron + React + TypeScript + Vite + Monaco Editor.
Giao diện minimal kiểu VSCode, theme dark duy nhất, có Ghost-Text-AI (mock, kiểu Copilot).

## Tính năng

- Mở / lưu file `.lua` / `.luau` thật trên Windows (dialog native)
- Mở folder, cây thư mục Explorer, click để mở file
- Layout VSCode: sidebar trái — editor giữa — output dưới — status bar
- Monaco highlight Luau (keywords `type`, `export`, `continue`, `typeof`... + gợi ý `game`, `Instance`, `task`...)
- **Roblox API**: gợi ý `game`, `workspace`, `Players`, `TweenService`, `ReplicatedStorage` + ~20 service,
  method (`GetService`, `FindFirstChild`, `FireServer`...), class (`Part`, `RemoteEvent`...),
  snippet **LocalScript / ModuleScript / RemoteEvent**, hover `Instance.new` hiện docs — offline 100%
- **Ghost-Text-AI**: gõ xong chờ 300ms hiện chữ mờ inline sau con trỏ, `Tab` nhận, `Esc` hủy
- Nút **AI: On/Off** ở status bar để bật/tắt gợi ý
- Font JetBrains Mono, theme dark: nền `#1E1E1E`, sidebar `#181818`, accent `#007ACC`
- Output hiển thị log + cảnh báo cân bằng `end` / `repeat-until` cơ bản
- Phím tắt: `Ctrl+S` lưu, `Ctrl+O` mở file
- Chạy được bằng `npm run dev`

## Test Ghost-AI (leaderstats)

1. `npm run dev`, mở/new file `.luau`
2. Gõ dòng: `local leaderstats` (hoặc bất kỳ dòng nào chứa `leaderstats`)
3. Ngừng gõ 300ms → chữ mờ hiện nguyên block **DataStore + leaderstats**
   (`DataStoreService`, `CoinsStore`, `setupLeaderstats`, save/load `PlayerRemoving`)
4. Nhấn `Tab` → chèn block vào file; nhấn `Esc` → chữ mờ biến mất
5. Bấm nút **AI: On/Off** ở status bar (góc trái) để tắt/mở gợi ý

## Yêu cầu

- Node.js 18+ (khuyên 20 LTS) + npm
- Windows 10/11

Máy hiện tại chưa có Node trong PATH nên cần cài trước (xem bên dưới).

## Cài Node.js (Windows)

1. Tải Node 20 LTS từ https://nodejs.org (file `.msi`)
2. Cài đặt, tick chọn "Add to PATH"
3. Mở PowerShell mới, kiểm tra:

```powershell
node --version
npm --version
```

## Chạy dev

```powershell
cd luau-editor
npm install
npm run dev
```

Lệnh `npm run dev` chạy `electron-vite dev`, mở cửa sổ Electron + Vite HMR.

## Build

```powershell
npm run build
```

## Đóng gói ra file exe (chia sẻ cho người khác)

Chỉ cần build **1 lần trên máy bạn** (máy build cần Node + mạng để tải tool).
File exe chạy độc lập — người nhận **không cần cài Node**, tải về là xài luôn.

```powershell
cd luau-editor
npm install
npm run dist:win
```

File nằm trong thư mục `release/`:

| File | Dùng khi nào |
|---|---|
| `Luau-Editor-Portable.exe` | Tải về, double-click chạy luôn, không cần cài đặt — gửi file này cho người khác là tiện nhất |
| `Luau Editor Setup 0.1.0.exe` | Bản cài đặt kiểu Windows (Next → Finish, có shortcut) |

Gửi 1 trong 2 file qua Drive/Discord/USB là xong. Lưu ý lần build đầu Windows SmartScreen
có thể cảnh báo app không rõ nhà phát hành (do chưa mua chứng chỉ ký) — bấm
"More info → Run anyway" là chạy bình thường.

## Build exe tự động bằng GitHub (free, khỏi build tay)

Repo đã có sẵn workflow `.github/workflows/build-win.yml`. Làm 1 lần
(máy bạn hiện chưa có git — tải free ở https://git-scm.com, cài rồi mở
PowerShell mới mới chạy được lệnh dưới):

```powershell
# 1. Đưa code lên GitHub (tạo repo public miễn phí trên github.com trước)
cd "C:\Users\Administrator\Documents\Default Project"
git init
git add .
git commit -m "Luau Editor v0.1.0"
git branch -M main
git remote add origin https://github.com/TEN-BAN/luau-editor.git
git push -u origin main
```

Sau đó mỗi lần muốn ra bản exe mới:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

Chờ ~5-10 phút (tab **Actions**), file exe tự xuất hiện ở trang **Releases** —
gửi link đó cho người khác tải về là xài luôn. Muốn build thử không cần tag:
vào tab **Actions → Build Windows exe → Run workflow**, tải file ở mục **Artifacts**.

## Ký exe miễn phí để hết cảnh báo SmartScreen (SignPath cho open-source)

1. Repo GitHub để **public** (đã có sẵn file `LICENSE` MIT trong `luau-editor/`)
2. Vào https://signpath.io → đăng ký tài khoản → mục **Free for Open Source**,
   điền link repo + mô tả project, chờ duyệt (thường vài ngày)
3. Được duyệt thì SignPath cấp API token. Báo tôi, tôi gắn bước ký tự động
   vào workflow — từ đó exe ở trang Releases sẽ có chữ ký, hết (hoặc giảm hẳn)
   cảnh báo SmartScreen mà không tốn đồng nào

## Cấu trúc

```
luau-editor/
  package.json
  electron.vite.config.ts
  electron/
    main.ts      # BrowserWindow + IPC đọc/ghi file thật (fs, dialog)
    preload.ts   # window.api an toàn qua contextBridge
  src/renderer/
    index.html
    src/
      main.tsx
      App.tsx          # layout VSCode + logic open/save
      App.css          # theme #1E1E1E / #181818 / #007ACC
      MonacoEditor.tsx # wrapper monaco-editor local (offline, có worker) + ghost-text AI
      ghostAI.ts       # mock getGhostSuggestion(context: 50 dòng trước cursor)
      roblox-api.ts    # data Roblox API offline: services, snippets, hover docs
      luau.ts          # đăng ký ngôn ngữ Luau + theme luau-dark + completion/hover
```

## Test Roblox API

1. Gõ `Play` → gợi ý `Players` (kèm docs); `Tween` → `TweenService`, `TweenInfo.new`
2. Gõ `LocalScript` / `ModuleScript` / `RemoteEvent` → snippet boilerplate, `Tab` nhảy qua các điểm sửa
3. Hover chuột vào `Instance.new` → hiện docs ngắn + ví dụ (tương tự với `game`, `workspace`, ...)
4. Tất cả chạy offline — ngắt mạng vẫn gợi ý/hover bình thường

## Ghi chú

- Không gradient tím-xanh, không icon robot — giữ minimal như VSCode thật.
- Monaco dùng package `monaco-editor` local (không CDN), có `?worker` nên chạy offline sau khi `npm install`.
- MVP chưa có: tabs nhiều file, terminal, Rojo sync. AI hiện là mock rule-based
  (`getGhostSuggestion` trong `ghostAI.ts`) — sau này thay bằng gọi model thật.
