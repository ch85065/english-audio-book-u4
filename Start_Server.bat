@echo off
chcp 65001 >nul
title 互動式語音書 - 伺服器啟動程式

echo =========================================
echo       正在啟動互動式語音書系統...
echo =========================================
echo.

:: 檢查是否安裝了 Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js 執行環境！
    echo 請您的同事先前往 https://nodejs.org/ 下載並安裝 Node.js。
    echo 安裝完成後，請重新執行這個檔案。
    echo.
    pause
    exit /b
)

:: 檢查是否需要安裝套件
if not exist "node_modules\" (
    echo [系統初始化] 正在下載必要的系統元件，請稍候...
    call npm install
    echo.
)

echo [成功] 伺服器即將啟動！
echo 如果瀏覽器沒有自動打開，請手動前往 http://localhost:5000
echo.
echo (請勿關閉此黑底白字的視窗，否則網頁會無法連線)
echo =========================================
echo.

:: 自動開啟網頁
start http://localhost:5000

:: 啟動伺服器
node server.js

pause
