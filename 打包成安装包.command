#!/bin/bash
cd "$(dirname "$0")"
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
[ -d node_modules ] || npm install
npm run dist:mac && open dist
