@echo off
TITLE Iniciando Sistema Labeltech IA...
COLOR 0A

echo =================================================
echo      INICIANDO CEREBRO + INTERFAZ (MILOWSKY)
echo =================================================

:: Obtener el directorio actual donde esta el .bat
set "CURRENT_DIR=%~dp0"

:: 1. INICIAR EL CEREBRO (BACKEND PRINCIPAL)
echo [1/3] Encendiendo el servidor principal y WhatsApp...
cd /d "%CURRENT_DIR%software-gestion-backend"

:: /min inicia la ventana minimizada para no molestar
:: /k mantiene la ventana abierta por si hay errores
start "Servidor Labeltech" /min cmd /k "node server.js"

:: Esperamos 2 segundos
timeout /t 2 /nobreak >nul

:: 2. INICIAR EL MOTOR DE CAMPAÑAS DE MAIL (NUEVO)
echo [2/3] Encendiendo el Motor de Marketing por Email...
:: Seguimos en la carpeta del backend, asi que lo lanzamos directo
start "Campaña Mails Milo" /min cmd /k "node campaña_mails.js"

:: Esperamos 4 segundos para que los dos motores respiren
timeout /t 4 /nobreak >nul

:: 3. ABRIR LA INTERFAZ (CLIENTE)
echo [3/3] Abriendo aplicacion de escritorio...
cd /d "%CURRENT_DIR%"

:: Verifica si el archivo existe antes de intentar abrirlo
if exist "out\software-gestion-win32-x64\software-gestion.exe" (
    start "" "out\software-gestion-win32-x64\software-gestion.exe"
) else (
    echo.
    echo [ERROR] No se encuentra el archivo .exe en la ruta esperada:
    echo %CURRENT_DIR%out\software-gestion-win32-x64\software-gestion.exe
    pause
)