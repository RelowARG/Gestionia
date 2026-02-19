@echo off
TITLE Iniciando Sistema Labeltech IA...
COLOR 0A

echo =================================================
echo      INICIANDO CEREBRO + INTERFAZ (MILOWSKY)
echo =================================================

:: Obtener el directorio actual donde esta el .bat
set "CURRENT_DIR=%~dp0"

:: 1. INICIAR EL CEREBRO (BACKEND)
echo [1/2] Encendiendo el servidor y la IA...
:: Usamos rutas relativas para que funcione en cualquier PC/Disco
cd /d "%CURRENT_DIR%software-gestion-backend"

:: /min inicia la ventana minimizada para no molestar
:: /k mantiene la ventana abierta por si hay errores
start "Servidor Labeltech" /min cmd /k "node server.js"

:: Esperamos 4 segundos (un segundito extra por seguridad)
timeout /t 4 /nobreak >nul

:: 2. ABRIR LA INTERFAZ (CLIENTE)
echo [2/2] Abriendo aplicacion de escritorio...
cd /d "%CURRENT_DIR%"

:: Verifica si el archivo existe antes de intentar abrirlo
if exist "out\software-gestion-win32-x64\software-gestion.exe" (
    start "" "out\software-gestion-win32-x64\software-gestion.exe"
) else (
    echo.
    echo [ERROR] No se encuentra el archivo .exe en la ruta esperada:
    echo %CURRENT_DIR%out\software-gestion-win32-x64\software-gestion.exe
    echo.
    echo Asegurate de haber compilado el proyecto con 'npm run make'
    pause
)

exit