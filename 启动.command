#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "还没有安装 Node.js，正在打开下载页面，装好后再双击这个文件。"
  open "https://nodejs.org/zh-cn/download"; read -p "按回车关闭"; exit
fi
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
[ -d node_modules ] || { echo "第一次运行，正在下载需要的东西（几分钟，只需要一次）……"; npm install; }
npm start
