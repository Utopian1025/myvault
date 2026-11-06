@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 还没有安装 Node.js，正在打开下载页面……
  echo 安装完成后（一路点“下一步”即可），再双击这个文件。
  start https://nodejs.org/zh-cn/download
  pause
  exit /b
)
if not exist node_modules (
  echo 第一次运行，正在下载需要的东西（几分钟，只需要一次）……
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  call npm install
)
echo 宠物出门了！看看屏幕底部～（关掉这个黑窗口宠物也会消失，可以最小化）
call npm start
