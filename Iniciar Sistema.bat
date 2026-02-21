@echo off
TITLE Iniciando Sistema Labeltech IA...
COLOR 0A

echo =================================================
echo    INICIANDO CEREBRO + INTERFAZ (MILOWSKY)
echo =================================================

:: Obtener el directorio actual donde esta el .bat
set "CURRENT_DIR=%~dp0"

:: 1. INICIAR EL CEREBRO (BACKEND PRINCIPAL)
echo [1/6] Encendiendo el servidor principal y WhatsApp...
cd /d "%CURRENT_DIR%software-gestion-backend"

:: /min inicia la ventana minimizada para no molestar
start "Servidor Labeltech" /min cmd /k "node server.js"

:: Esperamos 2 segundos
timeout /t 2 /nobreak >nul

:: 2. INICIAR EL MOTOR DE CAMPANAS DE MAIL
echo [2/6] Encendiendo el Motor de Marketing por Email...
start "Campana Mails Milo" /min cmd /k "node campana_mails.js"

:: Esperamos 2 segundos
timeout /t 2 /nobreak >nul

:: 3. INICIAR EL MINERO DE PDFs
echo [3/6] Encendiendo el Minero visual de PDFs...
start "Minero de PDFs Milo" /min cmd /k "node importar_pdfs.js"

:: Esperamos 2 segundos
timeout /t 2 /nobreak >nul

:: 4. INICIAR EL RECEPCIONISTA DE MAILS
echo [4/6] Encendiendo el Recepcionista de Bandeja de Entrada...
start "Recepcionista Milo" /min cmd /k "node recepcionista_mails.js"

:: Esperamos 2 segundos
timeout /t 2 /nobreak >nul

:: 5. INICIAR EL DETECTOR DE FUGA (WHATSAPP)
echo [5/6] Encendiendo Clínica Milo (Detector de Fuga)...
start "Detector de Fugas Milo" /min cmd /k "node detector_fuga.js"

:: Esperamos 4 segundos para que todos los motores respiren
timeout /t 4 /nobreak >nul

:: 6. ABRIR LA INTERFAZ (CLIENTE)
echo [6/6] Abriendo aplicacion de escritorio...
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