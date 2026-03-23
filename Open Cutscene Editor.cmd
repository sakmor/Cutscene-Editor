@echo off
setlocal
cd /d "%~dp0"

start "Cutscene Editor Server" cmd /k node "tools\serve-editor.js"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/Cutscene%%20Editor.html"
