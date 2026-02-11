// software-gestion/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); 
const fsPromises = require('fs').promises;

let mainWindow;

function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  console.log('Electron main process is ready.');
  createWindow();

  // --- MODIFICACIÓN DINÁMICA DEL LOGO ---
  ipcMain.handle('get-logo-file-path', () => {
    // Detectamos la ruta de la aplicación de forma dinámica
    // path.join une las piezas correctamente según el sistema operativo
    const logoPath = path.join(app.getAppPath(), 'public', 'images', 'logolabel.png');
    
    console.log(`[Main Process] Verificando ruta dinámica del logo: ${logoPath}`);
    
    if (fs.existsSync(logoPath)) {
      console.log(`[Main Process] ✅ ÉXITO: Logo encontrado en: ${logoPath}`);
      return logoPath;
    } else {
      console.error(`[Main Process] ❌ ERROR: El logo no existe en la ruta esperada: ${logoPath}`);
      return null; 
    }
  });

  ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
    let pdfWindow = null; 
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Presupuesto como PDF',
        defaultPath: suggestedFileName,
        filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled) {
        return { success: false, message: 'canceled' };
      }

      const filePath = result.filePath;

      pdfWindow = new BrowserWindow({
        width: 1200, 
        height: 800, 
        show: false,   
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, 
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
      return { success: false, error: error.message || 'Error en el backend al generar PDF.' };
    } finally {
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
    }
  });

  ipcMain.handle('exportProductosCsv', async (event) => {
    try {
      const productos = [
          { id: 1, codigo: 'P001', Descripcion: 'Producto A', eti_x_rollo: 1000, costo_x_1000: 10, costo_x_rollo: 10, precio: 20, banda: 'B1', material: 'M1', Buje: 'BU1' },
          { id: 2, codigo: 'P002', Descripcion: 'Producto B', eti_x_rollo: 500, costo_x_1000: 12, costo_x_rollo: 6, precio: 15, banda: 'B2', material: 'M2', Buje: 'BU2' }
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

      if (canceled || !csvFilePath) return { success: false, message: 'Exportación cancelada.' };

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