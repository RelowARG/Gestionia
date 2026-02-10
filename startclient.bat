@echo off
echo Iniciando servidor backend...

REM Navega a la carpeta del backend y ejecuta node server.js en una nueva ventana
cd C:\Gestion\software-gestion\software-gestion-backend\
start cmd /k "node server.js"

echo Iniciando aplicacion Electron (frontend)...

REM Navega a la carpeta raiz del proyecto Electron y ejecuta npm start en una nueva ventana
cd C:\Gestion\software-gestion\
start cmd /k "npm start"

echo Ambos procesos iniciados. Cierra las ventanas de la terminal para detenerlos.

EXIT