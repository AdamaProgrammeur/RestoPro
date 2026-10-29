$ErrorActionPreference = "Stop"
$backend = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop "RestoPro.lnk"))
$shortcut.TargetPath = Join-Path $backend "start_windows.bat"
$shortcut.WorkingDirectory = $backend
$shortcut.Description = "Ouvrir le logiciel de gestion RestoPro"
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll, 167"
$shortcut.Save()
