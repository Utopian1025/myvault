@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo 请先安装 Node.js： https://nodejs.org/zh-cn/download & start https://nodejs.org/zh-cn/download & pause & exit /b )
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
if not exist node_modules call npm install
call npm run dist:win
echo.
echo 打包完成！安装包在 dist 文件夹里：
echo   像素小窝 Setup 0.1.0.exe  —— 安装版（发给朋友双击安装）
echo   像素小窝-免安装版.exe     —— 免安装版（双击直接运行）
start "" "%~dp0dist"
pause
