# Task Scanner

Tool desktop (Electron) quét **Telegram** + **Zalo**, tự động liệt kê **đầu việc** mỗi khi bạn
được **@mention**, **nhắc tên** trong nội dung, hoặc có người **reply** vào tin của bạn.

- **Telegram**: quét tự động qua API chính thức (GramJS/MTProto).
- **Zalo**: import thủ công (dán nội dung chat) — vì Zalo không mở API cho tài khoản cá nhân.
- Bấm **Quét ngay** để chạy bằng tay. Giao diện có thể tự chỉnh (xem phần Tùy biến).

---

## 1. Cài đặt

Cần có **Node.js 18+** (tải ở nodejs.org).

```bash
cd task-scanner
npm install
npm start
```

## 2. Lấy Telegram API key (làm 1 lần)

1. Vào **https://my.telegram.org** → đăng nhập bằng số điện thoại Telegram.
2. Chọn **API development tools**, tạo 1 app bất kỳ.
3. Copy **api_id** và **api_hash**.
4. Mở app → tab **Cài đặt** → dán `api_id`, `api_hash`, số điện thoại (kèm mã quốc gia, vd `+8490...`).
5. Điền **Danh tính**: username (không cần @) và các tên/biệt danh hay bị gọi. Bấm **Lưu cài đặt**.

## 3. Kết nối & quét Telegram

1. Tab **Telegram** → **Kết nối Telegram**.
2. Nhập **mã xác thực** gửi về app Telegram (và mật khẩu 2 lớp nếu có bật).
3. Sau khi kết nối, bấm **Quét Telegram ngay** hoặc nút **Quét ngay** ở góc trái.
4. Phiên đăng nhập được lưu lại, lần sau khỏi phải nhập mã.

## 4. Import Zalo (thủ công)

Tab **Zalo** → dán nội dung chat. Hai định dạng được hỗ trợ:

**A. Dán thô** — mỗi tin cách nhau 1 dòng trống, dạng `Tên: nội dung`:
```
Anh Long: nhờ qua làm báo cáo giúp em

Minh: @qua check giùm file này nhé
```

**B. JSON** (nâng cao) — giữ được cả reply/mention:
```json
[
  { "from": "Nam", "text": "@qua xử lý vụ này", "chat": "Nhóm dự án", "date": "2026-07-18T09:00:00Z" },
  { "from": "Hoa", "text": "ok anh", "replyToSenderName": "Anh Long", "chat": "Nhóm dự án" }
]
```

Bấm **Import & quét** → đầu việc hiện ở tab **Đầu việc**.

## 5. Quản lý đầu việc

- Tick ✔ để đánh dấu xong (tự lưu, giữ nguyên khi quét lại).
- Lọc theo nền tảng / kiểu trigger (@mention, nhắc tên, reply), tìm kiếm, ẩn việc đã xong.
- Với Telegram, mỗi việc có link mở thẳng tới tin nhắn gốc (nếu là group công khai).

---

## Tính năng mới (v1.1)

**Trạng thái đầu việc (kiểu Excel).** Mỗi đầu việc có ô trạng thái đổi được: **Chờ / Đang làm / Xong / Huỷ**, có màu riêng, lọc được theo trạng thái. Trạng thái tự lưu và giữ nguyên khi quét lại.

**Link tới tin nhắn gốc.** Mỗi việc có link **"mở tin gốc ↗"** mở thẳng tới tin nhắn trong Telegram (kể cả nhóm riêng) để đọc full và chắt lọc.

**AI tóm tắt đầu việc (Google Gemini).** Bật AI để app tự suy ra đầu việc ngắn gọn từ nội dung tin nhắn, thay vì chép nguyên tin. Vẫn giữ dòng "Nguồn:" + link để biết gốc.
- Lấy key **miễn phí** tại aistudio.google.com → **Get API key**.
- Vào tab **Cài đặt** → khối **AI tóm tắt** → tick **Bật AI tóm tắt**, dán key → **Lưu cài đặt**.
- Từ đó mỗi lần quét sẽ tự tóm tắt. Muốn tóm tắt lại các việc đang có: bấm **✨ Tóm tắt lại (AI)** ở tab Đầu việc.

## Tùy biến giao diện

- Toàn bộ màu & bo góc nằm trong `renderer/styles.css`, ở khối `:root` (các biến `--bg`, `--primary`, ...).
  Đổi vài dòng đó là đổi cả app.
- Bố cục ở `renderer/index.html`, logic ở `renderer/app.js`.

## Đóng gói thành file cài đặt (.exe)

Bản .exe nên build **trên Windows** (máy bạn) để ra file chuẩn, chạy được ngay. Có 2 cách:

**Cách 1 — build ngay trên máy (nhanh nhất, ~2 phút):**
1. Cài Node.js (nodejs.org) nếu chưa có.
2. Double-click **build-windows.bat** (hoặc mở cmd trong thư mục rồi chạy `npm install` rồi `npm run dist`).
3. File cài đặt xuất ra `dist\Task Scanner Setup 1.0.0.exe`.

**Cách 2 — build tự động bằng GitHub Actions (không cần cài gì):**
1. Đẩy thư mục này lên 1 repo GitHub.
2. Vào tab **Actions** → workflow **Build Windows Installer** → **Run workflow**.
3. Tải file .exe ở mục **Artifacts** sau khi build xong. Workflow có sẵn ở `.github/workflows/build-windows.yml`.

> Build trên Linux không có Wine sẽ không ký số được, nên dùng 1 trong 2 cách trên.


## Cấu trúc code

```
task-scanner/
├─ main.js              # Electron main: cửa sổ + IPC + điều phối
├─ preload.js           # cầu nối an toàn renderer ↔ main
├─ src/
│  ├─ extractor.js      # logic bắt @mention / nhắc tên / reply -> đầu việc (dùng chung)
│  ├─ telegram.js       # kết nối + quét Telegram (GramJS)
│  ├─ zalo.js           # parser import Zalo thủ công
│  └─ store.js          # lưu config + tasks ra JSON
├─ renderer/            # giao diện (HTML/CSS/JS)
└─ test/extractor.test.js
```

Test logic lõi (không cần Electron): `npm test`.

---

## Lưu ý về Zalo

Zalo **không có API chính thức** cho tài khoản cá nhân. Các thư viện không chính thức có
rủi ro khóa nick và vi phạm điều khoản, nên tool này chọn cách **import thủ công** cho an toàn.
Reply chỉ nhận diện được khi import bằng JSON có trường `replyToSenderName`.

## Riêng tư

Mọi dữ liệu (session Telegram, config, đầu việc) lưu **local** trên máy bạn, không gửi đi đâu.
