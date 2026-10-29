$ErrorActionPreference = "Stop"
$backend = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $backend ".venv\Scripts\python.exe"
$env:RESTOPRO_LOCAL = "1"
Start-Process -FilePath $python -ArgumentList @("manage.py", "runserver", "127.0.0.1:8000", "--noreload") -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $backend "restopro-server.log") -RedirectStandardError (Join-Path $backend "restopro-server-error.log")
