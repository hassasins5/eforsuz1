@echo off
chcp 65001 >nul
title Eforsuz URL + Video MP3 Donusturucu
cd /d "%~dp0"
echo =========================================================
echo   EFORSUZ - Videodan ve URL'den Sese, Eforsuz.
echo   Yerel Yardimci Servis + Web Arayuzu Baslatiliyor...
echo =========================================================
npm run dev
pause
