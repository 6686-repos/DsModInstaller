!macro customInstall
  ; Add application to startup
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DS Mod Installer" "$INSTDIR\DS Mod Installer.exe"
!macroend

!macro customUnInstall
  ; Remove application from startup
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "DS Mod Installer"
!macroend