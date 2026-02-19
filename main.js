// software-gestion/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  // --- LÓGICA DE AUTO-ARRANQUE DEL BACKEND (MILO) ---
  // 1. Ruta absoluta al ejecutable de PM2 para evitar errores de PATH en el .exe
  const pm2Path = 'C:\\Users\\Julian\\AppData\\Roaming\\npm\\pm2.cmd';
  
  // 2. Comando forzado: Define el HOME neutral y aplica RESTART para salir de estado 'stopped'
  // Si restart falla (porque el proceso no existe), intenta con start.
  const pm2Command = `set PM2_HOME=C:\\pm2\\.pm2 && "${pm2Path}" restart milo-backend || "${pm2Path}" start milo-backend`;
  
  exec(pm2Command, (error, stdout, stderr) => {
    if (error) {
      // Si hay error, lo logueamos para depuración pero permitimos que la app siga
      console.error(`[Main Process] Intento de arranque de backend: ${error.message}`);
    } else {
      console.log('[Main Process] Backend verificado y en marcha vía PM2.');
    }
  });

  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'src', 'preload.js'),
    },
    minWidth: 800,
    minHeight: 600,
    maximizable: true,
    fullscreenable: true,
    show: false,
  });

  // Carga del archivo principal usando ruta relativa al directorio de la app
  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();

  // --- MANEJADOR PARA EL LOGO DE LABELTECH (PORTÁTIL) ---
  ipcMain.handle('get-logo-file-path', () => {
    // Buscamos el logo dentro de la carpeta del proyecto de forma dinámica
    const logoPath = path.join(app.getAppPath(), 'public', 'images', 'logolabel.png');
    
    if (fs.existsSync(logoPath)) {
      return logoPath;
    } else {
      console.error(`[Main Process] Logo no encontrado en: ${logoPath}`);
      return null;
    }
  });

  // --- MANEJADOR PARA GUARDAR PRESUPUESTOS EN PDF ---
  ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
    let pdfWindow = null;
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Presupuesto como PDF',
        defaultPath: suggestedFileName,
        filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled) return { success: false, message: 'canceled' };

      const filePath = result.filePath;

      // Ventana invisible para renderizar el PDF
      pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // Requerido para cargar el logo local (file://)
          sandbox: false,
        },
      });

      const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      await pdfWindow.loadURL(htmlDataUrl);
      
      const pdfOptions = {
        printBackground: true,
        marginsType: 1,
      };

      const pdfBuffer = await pdfWindow.webContents.printToPDF(pdfOptions);
      await fsPromises.writeFile(filePath, pdfBuffer);

      return { success: true, filePath: filePath };

    } catch (error) {
      console.error('[Main Process - PDF] Error:', error);
      return { success: false, error: error.message };
    } finally {
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
    }
  });

  // --- MANEJADOR PARA EXPORTACIÓN DE PRODUCTOS ---
  ipcMain.handle('exportProductosCsv', async (event) => {
    try {
      const productos = [
          { id: 1, codigo: 'P001', Descripcion: 'Producto Ejemplo A', eti_x_rollo: 1000, costo_x_1000: 10, costo_x_rollo: 10, precio: 20, banda: 'B1', material: 'M1', Buje: 'BU1' }
      ];

      const columns = ['id', 'codigo', 'Descripcion', 'eti_x_rollo', 'costo_x_1000', 'costo_x_rollo', 'precio', 'banda', 'material', 'Buje'];
      const csvHeader = columns.join(';');
      const csvRows = productos.map(producto =>
        columns.map(col => {
          let value = producto[col] || '';
          if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(';')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      const { canceled, filePath: csvFilePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Lista de Productos como CSV',
        defaultPath: path.join(app.getPath('documents'), `productos_export_${Date.now()}.csv`),
        filters: [{ name: 'Archivos CSV', extensions: ['csv'] }]
      });

      if (canceled || !csvFilePath) return { success: false, message: 'canceled' };

      await fsPromises.writeFile(csvFilePath, csvContent, 'utf8');
      return { success: true, filePath: csvFilePath };

    } catch (error) {
      console.error('[Main Process - CSV] Error:', error);
      return { success: false, error: error.message };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});