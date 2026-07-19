@echo off
REM ================================================
REM  Build Task Scanner thanh file cai dat .exe
REM  Yeu cau: da cai Node.js (tai o nodejs.org)
REM  Cach dung: double-click file nay
REM ================================================
echo [1/2] Cai dependencies...
call npm install
if errorlevel 1 goto err
echo [2/2] Dong goi .exe...
call npm run dist
if errorlevel 1 goto err
echo.
echo ===== XONG! =====
echo File cai dat nam trong thu muc: dist\
echo Ten file dang: "Task Scanner Setup 1.0.0.exe"
pause
exit /b 0
:err
echo.
echo Co loi. Kiem tra Node.js da cai chua (mo cmd, go: node -v)
pause
exit /b 1
