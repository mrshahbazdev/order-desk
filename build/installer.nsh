; Force clean install — remove old Electron runtime to prevent ABI mismatch
!macro customInit
  ; Remove old files from the install directory to ensure fresh Electron
  RMDir /r "$INSTDIR\resources"
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
!macroend
