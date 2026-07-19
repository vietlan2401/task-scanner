# Cập nhật app lên bản mới (v1.1) — có AI, trạng thái, link tin gốc

Con đã sửa hết code trong thư mục làm việc. Để build ra .exe mới, làm theo cách nhanh này
(tận dụng lại repo GitHub + terminal qua đã dùng lần trước, khỏi push từ đầu):

## Bước 1 — Chép đè file mới vào thư mục đã có git

1. Mở thư mục **task-scanner mà Claude vừa sửa** (chính là thư mục lần trước qua copy ra Desktop
   để đó — nơi có các file mới nhất). Mẹo: chuột phải bất kỳ file nào Claude gửi ở khung chat →
   **Open file location** là tới đúng chỗ.
2. Trong đó bấm **Ctrl+A** chọn hết → **Ctrl+C** copy.
3. Mở thư mục **task-scanner trên Desktop** (thư mục lần trước qua đã push lên GitHub — bên trong
   có thư mục ẩn `.git`).
4. **Ctrl+V** dán vào. Windows hỏi trùng file → chọn **Replace the files in the destination**
   (ghi đè). Thư mục `.git` giữ nguyên, không bị đụng.

> Nếu 2 thư mục thực ra là một (qua vẫn làm ngay tại chỗ đó) thì bỏ qua bước này.

## Bước 2 — Đẩy bản mới lên GitHub

1. Mở thư mục `task-scanner` trên Desktop → chuột phải chỗ trống → **Open in Terminal**
   (hoặc **Open Git Bash here**).
2. Dán khối này, Enter:
```
git add -A
git commit -m "them AI, trang thai, link tin goc"
git push
```

## Bước 3 — Build lại .exe

1. Vào repo trên GitHub → tab **Actions** → **Build Windows Installer** → **Run workflow**.
2. Chờ ~3–5 phút → tải file ở **Artifacts** như lần trước.
3. Giải nén, chạy **Task Scanner Setup 1.1.0.exe** để cài đè bản cũ.

## Sau khi cài — bật AI (không bắt buộc)

1. Lấy key miễn phí ở **aistudio.google.com → Get API key**.
2. Mở app → tab **Cài đặt** → khối **AI tóm tắt đầu việc** → tick **Bật AI tóm tắt** → dán key →
   **Lưu cài đặt**.
3. Quét lại, hoặc bấm **✨ Tóm tắt lại (AI)** ở tab Đầu việc để tóm tắt các việc đang có.

Không bật AI thì app vẫn chạy bình thường, chỉ hiện tin gốc (như bản cũ) + có thêm trạng thái và link.
