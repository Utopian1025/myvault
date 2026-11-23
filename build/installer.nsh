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
  ; 记一下：装之前桌面上有没有图标（没有就留个记号）。自动更新是静默安装：你删掉了桌面图标，更新后就别再放回去
  Delete "$TEMP\desktopia-nodesk.flag"
  IfFileExists "$DESKTOP\Desktopia 桌面乌托邦.lnk" +3 0
    FileOpen $0 "$TEMP\desktopia-nodesk.flag" w
    FileClose $0
  nsExec::Exec 'taskkill /F /IM "PixelNest.exe"'
  ; 旧版本的卸载程序会删存档（0.2.x 的 bug）。安装新版前先把存档复制一份到 PixelNest-keep，新版启动时会自动找回
  IfFileExists "$APPDATA\PixelNest\save.json" 0 +3
    CreateDirectory "$APPDATA\PixelNest-keep"
    CopyFiles /SILENT "$APPDATA\PixelNest\save.json" "$APPDATA\PixelNest-keep\save-before-update.json"
!macroend

; 改名后：删掉旧名字（像素小窝、摸鱼动物园）留下的快捷方式
!macro customInstall
  Delete "$DESKTOP\像素小窝.lnk"
  Delete "$SMPROGRAMS\像素小窝.lnk"
  Delete "$DESKTOP\摸鱼动物园.lnk"
  Delete "$SMPROGRAMS\摸鱼动物园.lnk"
  ; 自动更新（静默安装）时：原来桌面上没有图标，就把这次新放的删掉
  ${If} ${Silent}
  ${AndIf} ${FileExists} "$TEMP\desktopia-nodesk.flag"
    Delete "$DESKTOP\Desktopia 桌面乌托邦.lnk"
  ${EndIf}
  Delete "$TEMP\desktopia-nodesk.flag"
!macroend
