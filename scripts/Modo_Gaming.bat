@echo off
title 🎮 Modo Gaming - Liberando VRAM
echo ==========================================
echo       INICIANDO MODO GAMING
echo ==========================================
echo.

echo [1/2] Pausando a Yuki Studio (Docker)...
docker stop yuki-server

echo [2/2] Apagando el motor local de IA (Ollama)...
:: Mata todos los procesos de Ollama para que libere la VRAM inmediatamente
taskkill /F /IM ollama.exe /T >nul 2>&1
taskkill /F /IM "ollama app.exe" /T >nul 2>&1

echo.
echo ✅ ¡VRAM 100%% Liberada! 
echo 🤖 Milo ha pasado a Modo Nube (Gemini) de forma automatica.
echo 🎮 Ya puedes abrir tu juego tranquilamente.
echo.
pause