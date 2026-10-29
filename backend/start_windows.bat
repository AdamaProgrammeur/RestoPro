@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo RestoPro n'est pas installe. Lancez install_windows.bat.
  pause
  exit /b 1
)
set "RESTOPRO_LOCAL=1"
.venv\Scripts\python.exe manage.py migrate --noinput
if errorlevel 1 (
  echo La base RestoPro n'a pas pu etre mise a jour.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/ -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  start "" http://127.0.0.1:8000/
  exit /b 0
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server_windows.ps1"
for /l %%i in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/ -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
  if not errorlevel 1 goto server_ready
  timeout /t 1 /nobreak >nul
)
echo Le serveur RestoPro ne demarre pas. Consultez restopro-server-error.log.
pause
exit /b 1
:server_ready
start "" http://127.0.0.1:8000/
exit /b 0
