@echo off
setlocal
REM =====================================================
REM  Day TOAN BO folder len GitHub (giu nguyen ten + thu muc con)
REM  Ghi de sach noi dung cu tren repo (--force).
REM  Yeu cau: da cai Git -> https://git-scm.com/download/win
REM =====================================================
where git >nul 2>nul
if errorlevel 1 (
  echo [X] Chua cai Git. Tai o: https://git-scm.com/download/win  roi chay lai file nay.
  pause & exit /b 1
)

echo Dan dia chi repo cua qua (lay o trang repo, nut Code xanh -> HTTPS).
set /p REPO="URL repo (vd https://github.com/vietlan2401/task-scanner.git): "
if "%REPO%"=="" (echo Chua nhap dia chi. & pause & exit /b 1)

echo.
echo === Dang day len (ghi de sach)... ===
if not exist ".git" git init
git config user.email "qua@taskscanner.local"
git config user.name "qua"
git add -A
git commit -m "upload full project" 2>nul
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO%
git push -u --force origin main
if errorlevel 1 (
  echo.
  echo [X] Push loi. Kiem tra lai URL repo va dang nhap GitHub roi thu lai.
  pause & exit /b 1
)
echo.
echo ===== XONG! Toan bo code + thu muc da len GitHub. =====
echo Gio vao repo -> tab Actions -> Build Windows Installer -> Run workflow.
pause
