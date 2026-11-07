; 卸载时：只有用户真的卸载才清理存档；自动更新 / 覆盖安装时（isUpdated）绝不碰存档
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "PixelNest"
    RMDir /r "$APPDATA\PixelNest"
    RMDir /r "$APPDATA\PixelNest-keep"
    RMDir /r "$LOCALAPPDATA\PixelNest"
    RMDir /r "$LOCALAPPDATA\pixel-nest-updater"
  ${endIf}
!macroend

; 安装前先关掉正在运行的旧版本
!macro customInit
  nsExec::Exec 'taskkill /F /IM "PixelNest.exe"'
  ; 旧版本的卸载程序会删存档（0.2.x 的 bug）。安装新版前先把存档复制一份到 PixelNest-keep，新版启动时会自动找回
  IfFileExists "$APPDATA\PixelNest\save.json" 0 +3
    CreateDirectory "$APPDATA\PixelNest-keep"
    CopyFiles /SILENT "$APPDATA\PixelNest\save.json" "$APPDATA\PixelNest-keep\save-before-update.json"
!macroend

; 改名后：删掉旧名字“像素小窝”留下的快捷方式
!macro customInstall
  Delete "$DESKTOP\像素小窝.lnk"
  Delete "$SMPROGRAMS\像素小窝.lnk"
!macroend
