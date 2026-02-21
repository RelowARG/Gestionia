@echo off
title 💼 Modo Trabajo - Despertando IA
echo ==========================================
echo       INICIANDO MODO TRABAJO
echo ==========================================
echo.

echo [1/2] Encendiendo el motor local de IA (Ollama)...
:: Inicia Ollama desde su ruta por defecto en Windows
start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"

:: Le damos 3 segundos a la placa de video para cargar los procesos
timeout /t 3 >nul

echo [2/2] Despertando a Yuki Studio...
docker start yuki-server

echo.
echo ✅ Sistemas de IA locales operativos. La RTX 3080 ha vuelto al trabajo.
echo.
pause