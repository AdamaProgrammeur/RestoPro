@echo off
setlocal
cd /d "%~dp0"
set "RESTOPRO_LOCAL=1"
where py >nul 2>nul
if errorlevel 1 (
  echo Installez Python 3.12 depuis python.org puis relancez.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  py -3.12 -m venv .venv
  if errorlevel 1 goto failed
)
if not exist ".venv\restopro-dependencies-installed" (
  .venv\Scripts\python.exe -m pip install --upgrade pip
  if errorlevel 1 goto failed
  .venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 goto failed
  type nul > .venv\restopro-dependencies-installed
)
if not exist "restopro_local.sqlite3" set "RESTOPRO_FIRST_INSTALL=1"
.venv\Scripts\python.exe manage.py migrate
if errorlevel 1 goto failed
if defined RESTOPRO_FIRST_INSTALL (
  echo Creez le compte administrateur initial :
  .venv\Scripts\python.exe manage.py createsuperuser
  if errorlevel 1 goto failed
  .venv\Scripts\python.exe manage.py shell -c "from apps.accounts.models import User; User.objects.filter(is_superuser=True).update(role='ADMIN')"
  if errorlevel 1 goto failed
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create_windows_shortcut.ps1"
if errorlevel 1 goto failed
echo Installation terminee. Double-cliquez sur RestoPro sur le Bureau.
pause
exit /b 0
:failed
echo Installation echouee. Verifiez Python 3.12 et votre connexion Internet.
pause
exit /b 1
