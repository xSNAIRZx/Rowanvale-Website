@echo off
setlocal
cd /d "%~dp0app"
title Rowanvale 19.3.0 - Your World Together Beta
where node >nul 2>nul
if errorlevel 1 (
 echo.
 echo Rowanvale needs Node.js 18 or newer. Install the LTS version from https://nodejs.org
 echo Then double-click this launcher again.
 pause
 exit /b 1
)
for /f %%v in ('node -p "parseInt(process.versions.node.split('.')[0],10)"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 18 (
 echo Node.js %NODEMAJOR% is too old. Please install Node.js 18 or newer.
 pause
 exit /b 1
)
echo.
echo ===================== ROWANVALE BETA =====================
echo Your saved data stays in this browser origin: http://localhost:8080
echo Opening index.html as a file uses DIFFERENT storage and breaks server tools.
echo No verified online account is created in this local beta.
echo Open http://localhost:8080/api/launch if the browser does not open automatically.
echo To exit, close this window or press Ctrl+C.
echo =========================================================
echo.
set ROWANVALE_OPEN_BROWSER=1
node server.js
if errorlevel 1 (
 echo.
 echo Rowanvale could not start. Check whether port 8080 is already in use.
 pause
)
