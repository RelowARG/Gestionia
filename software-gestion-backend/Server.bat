@echo off
echo Iniciando servidor backend...

REM Navega a la carpeta del backend y ejecuta node server.js en una nueva ventana
cd E:\Gestionia\software-gestion-backend
start cmd /k "node server.js"

EXIT