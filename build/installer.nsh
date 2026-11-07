; 卸载时：去掉开机自启、删除存档和缓存，确保干干净净
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "PixelNest"
  RMDir /r "$APPDATA\PixelNest"
  RMDir /r "$LOCALAPPDATA\PixelNest"
  RMDir /r "$LOCALAPPDATA\pixel-nest-updater"
!macroend

; 安装前先关掉正在运行的旧版本
!macro customInit
  nsExec::Exec 'taskkill /F /IM "PixelNest.exe"'
!macroend

; 改名后：删掉旧名字“像素小窝”留下的快捷方式
!macro customInstall
  Delete "$DESKTOP\像素小窝.lnk"
  Delete "$SMPROGRAMS\像素小窝.lnk"
!macroend
