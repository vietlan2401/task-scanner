# Hướng dẫn đẩy folder lên GitHub & build file .exe

Mục tiêu: đưa thư mục `task-scanner` lên GitHub, rồi cho GitHub tự build ra file cài đặt `.exe`
mà không cần cài gì trên máy.

---

## Bước 0 — Tạo tài khoản GitHub (nếu chưa có)

1. Vào **https://github.com** → bấm **Sign up**.
2. Nhập email, mật khẩu, tên tài khoản → xác nhận email.
   (Miễn phí, đủ dùng.)

---

---

# CÁCH C — Upload thẳng qua web (KHÔNG cài gì, chỉ cần trình duyệt) ⭐ dễ nhất nếu app lỗi

Cách này né hẳn GitHub Desktop và Git — hợp khi máy đang bị lỗi app.

## Bước 1 — Tạo repo rỗng
1. Vào github.com → bấm dấu **+** góc trên phải → **New repository**.
2. **Repository name**: `task-scanner`.
3. Tick **Add a README file** (để repo không rỗng) → bấm **Create repository**.

## Bước 2 — Upload folder
1. Trong trang repo vừa tạo, bấm **Add file → Upload files**.
2. Mở thư mục `task-scanner` trên máy, **bôi đen chọn hết file + thư mục con** (Ctrl+A) rồi
   **kéo thả** vào khung upload trên web.
   - Nhớ kéo cả thư mục `.github` (chứa file build). Nếu Windows ẩn nó, bật hiện file ẩn
     hoặc kéo riêng thư mục `.github` vào sau.
3. Kéo xong, kéo trang xuống dưới → bấm **Commit changes**.

## Bước 3 — Build .exe
Giống PHẦN CUỐI bên dưới: vào tab **Actions → Build Windows Installer → Run workflow** →
chờ ~5 phút → tải file .exe ở **Artifacts**.

> Lưu ý: nếu kéo thả thiếu thư mục `.github/workflows`, tab Actions sẽ không có workflow.
> Khi đó bấm **Add file → Create new file**, gõ tên `.github/workflows/build-windows.yml`
> rồi dán nội dung file đó vào.

# CÁCH A — Dùng GitHub Desktop (bấm nút, KHÔNG gõ lệnh) ⭐ khuyên dùng

## Bước 1 — Cài GitHub Desktop
1. Tải ở **https://desktop.github.com** → cài đặt.
2. Mở lên → **Sign in to GitHub.com** → đăng nhập tài khoản vừa tạo.

## Bước 2 — Tạo repo từ folder task-scanner
1. Trong GitHub Desktop: menu **File → Add local repository...**
2. Bấm **Choose...** rồi trỏ tới thư mục `task-scanner`.
3. Nó sẽ báo "chưa phải git repository" → bấm **create a repository** (dòng chữ xanh).
4. Cửa sổ hiện ra:
   - **Name**: `task-scanner`
   - Để nguyên các mục khác → bấm **Create repository**.

## Bước 3 — Đẩy lên GitHub
1. Ở giữa màn hình sẽ thấy **"1 commit"** hoặc danh sách file → bấm **Commit to main** (nút xanh dưới cùng bên trái).
2. Bấm nút **Publish repository** (góc trên bên phải).
3. Cửa sổ hiện ra:
   - Bỏ tick **"Keep this code private"** nếu muốn công khai (để private cũng build được).
   - Bấm **Publish repository**.
4. Xong! Code đã lên GitHub. Bấm **View on GitHub** để mở trang repo.

➡️ Sang **PHẦN CUỐI** để build ra .exe.

---

# CÁCH B — Dùng dòng lệnh (Git)

## Bước 1 — Cài Git
Tải ở **https://git-scm.com/download/win** → cài (bấm Next hết).

## Bước 2 — Tạo repo rỗng trên GitHub
1. Vào github.com → bấm dấu **+** góc trên phải → **New repository**.
2. **Repository name**: `task-scanner` → bấm **Create repository**.
3. GitHub hiện trang có mấy dòng lệnh — cứ để đó, làm tiếp bước 3.

## Bước 3 — Đẩy folder lên
Mở **cmd** hoặc **PowerShell**, gõ từng dòng (thay `TEN-TAI-KHOAN` bằng tên GitHub của qua):

```bash
cd "C:\đường\dẫn\tới\task-scanner"
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/TEN-TAI-KHOAN/task-scanner.git
git push -u origin main
```

Lần đầu push nó hỏi đăng nhập → cứ đăng nhập bằng tài khoản GitHub (thường mở cửa sổ trình duyệt).

---

# PHẦN CUỐI — Build ra file .exe trên GitHub

1. Mở trang repo trên GitHub → bấm tab **Actions** (thanh trên cùng).
2. Bên trái chọn workflow **Build Windows Installer**.
3. Bên phải bấm nút **Run workflow** → chọn nhánh **main** → bấm **Run workflow** lần nữa.
4. Chờ ~3–5 phút (có vòng tròn vàng đang chạy → xanh là xong).
5. Bấm vào lần chạy đó → kéo xuống mục **Artifacts** → tải **task-scanner-windows**.
6. Giải nén file zip vừa tải → bên trong là **Task Scanner Setup 1.0.0.exe** → chạy để cài.

---

## Lỡ tay lỗi thường gặp

- **Không thấy tab Actions chạy được**: vào **Settings → Actions → General** → chọn
  "Allow all actions" → Save. Rồi quay lại Actions bấm Run.
- **Push báo lỗi remote already exists**: chạy `git remote remove origin` rồi thêm lại lệnh `git remote add ...`.
- **Sau này sửa code**: trong GitHub Desktop chỉ cần Commit → Push (hoặc `git add . && git commit -m "sua" && git push`).
  Muốn build lại thì vào Actions bấm Run workflow lần nữa.
