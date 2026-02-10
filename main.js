// software-gestion/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // Necesario para fs.existsSync
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

  // mainWindow.webContents.openDevTools(); // Descomenta para depurar la ventana principal

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

  ipcMain.handle('get-logo-file-path', () => {
    const hardcodedLogoPath = "E:\Label\LABEL TECH\gestion y finanzas\software-gestion\public\images\logolabel.png";
    // Loguear la ruta que se va a verificar
    console.log(`[Main Process - get-logo-file-path] Verificando ruta fija del logo: ${hardcodedLogoPath}`);
    if (fs.existsSync(hardcodedLogoPath)) {
      console.log(`[Main Process - get-logo-file-path] ÉXITO: Logo encontrado en la ruta fija: ${hardcodedLogoPath}`);
      return hardcodedLogoPath;
    } else {
      console.error(`[Main Process - get-logo-file-path] ¡ERROR CRÍTICO! La ruta fija para el logo NO EXISTE o no es accesible: ${hardcodedLogoPath}`);
      console.error('[Main Process - get-logo-file-path] Asegúrate de que la imagen del logo esté en esa ruta exacta.');
      return null; // Devuelve null si no se encuentra para que el renderer pueda manejarlo
    }
  });

  ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
    let pdfWindow = null; // Declarar fuera para poder cerrarla en el finally o catch
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Presupuesto como PDF',
        defaultPath: suggestedFileName,
        filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled) {
        console.log('[Main Process - PDF] Guardado de PDF cancelado por el usuario.');
        return { success: false, message: 'canceled' };
      }

      const filePath = result.filePath;

      pdfWindow = new BrowserWindow({
        width: 1200, // Ancho suficiente para renderizar bien
        height: 800, // Alto suficiente
        show: false,   // CAMBIAR A true TEMPORALMENTE PARA DEPURAR VISUALMENTE LA VENTANA DEL PDF
                       // Si show es true, también descomenta pdfWindow.webContents.openDevTools() abajo.
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // ¡¡¡ADVERTENCIA DE SEGURIDAD!!! PERMITE CARGAR file:// URLs.
                              // Usar solo porque el contenido HTML es generado internamente.
          // sandbox: false, // Considerar si webSecurity: false solo no es suficiente. Probar primero sin esto.
          // enableRemoteModule: false, // Asegurar que esté deshabilitado (default en Electron >= 10)
        },
      });

      // Log para verificar el HTML que se va a imprimir, especialmente la etiqueta del logo
      console.log(`[Main Process - PDF] HTML Content (primeros 500 caracteres): ${htmlContent.substring(0, 500)}`);
      const imgTagRegex = /<img[^>]+src="file:\/\/\/[^"]+"[^>]*>/i; // Case-insensitive
      const match = htmlContent.match(imgTagRegex);
      if (match) {
        console.log(`[Main Process - PDF] Etiqueta IMG con URI de archivo encontrada en HTML: ${match[0]}`);
      } else {
        console.warn('[Main Process - PDF] ¡ALERTA! No se encontró la etiqueta IMG con URI de archivo (file:///) en el contenido HTML para el PDF.');
      }
      
      // Descomenta la siguiente línea para abrir DevTools EN LA VENTANA OCULTA DEL PDF
      // Esto es MUY útil para ver si hay errores de carga de la imagen o de CSS.
      // if (pdfWindow && !pdfWindow.isDestroyed() && pdfWindow.webContents) { // Chequeo extra
      //    pdfWindow.webContents.openDevTools({ mode: 'detach' });
      // }

      const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      await pdfWindow.loadURL(htmlDataUrl);
      
      console.log(`[Main Process - PDF] Ventana de PDF cargó la URL de datos.`);

      // Pequeña espera opcional. A veces ayuda si hay contenido complejo o fuentes web.
      // Para una imagen local con webSecurity:false, usualmente no es tan necesario.
      // await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 segundos

      const pdfOptions = {
        printBackground: true, // Muy importante para fondos e imágenes
        marginsType: 1,        // 0: default, 1: none, 2: minimum
        // pageSize: 'A4',     // Puedes especificar un tamaño de página
        // scaleFactor: 100,   // Escala en porcentaje
      };
      const pdfBuffer = await pdfWindow.webContents.printToPDF(pdfOptions);
      console.log(`[Main Process - PDF] PDF generado en buffer (tamaño: ${pdfBuffer.length} bytes).`);

      await fsPromises.writeFile(filePath, pdfBuffer);
      console.log(`[Main Process - PDF] PDF guardado exitosamente en: ${filePath}`);

      return { success: true, filePath: filePath };

    } catch (error) {
      console.error('[Main Process - PDF] Error catastrófico en el manejador save-presupuesto-pdf:', error);
      return { success: false, error: error.message || 'Error desconocido en el backend al generar PDF.' };
    } finally {
      // Asegurarse de cerrar la ventana de PDF incluso si hay errores
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
        console.log('[Main Process - PDF] Ventana de PDF cerrada.');
      }
    }
  });

  ipcMain.handle('exportProductosCsv', async (event) => {
    try {
      console.log('[Main Process - CSV Export] Solicitando datos de productos al backend Express...');
      // Asumimos que tienes una URL de API y lógica de token
      const API_URL = 'http://192.168.0.7:3001/api/productos'; // Ajusta si es necesario
      const AUTH_TOKEN = 'tu_token_de_autenticacion_aqui'; // Reemplaza con tu lógica de token real

      // Simulación de fetch a tu API. Reemplaza con tu lógica real de fetch.
      // const response = await fetch(API_URL, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': `Bearer ${AUTH_TOKEN}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({ error: response.statusText }));
      //   console.error('[Main Process - CSV Export] Error al obtener productos del backend:', response.status, errorData);
      //   return { success: false, error: `Error del backend (${response.status}): ${errorData.error || response.statusText}` };
      // }
      // const productos = await response.json();
      
      // Datos de ejemplo si no tienes la API lista para esta prueba:
      const productos = [
          { id: 1, codigo: 'P001', Descripcion: 'Producto A', eti_x_rollo: 1000, costo_x_1000: 10, costo_x_rollo: 10, precio: 20, banda: 'B1', material: 'M1', Buje: 'BU1' },
          { id: 2, codigo: 'P002', Descripcion: 'Producto B con ; y "comillas"', eti_x_rollo: 500, costo_x_1000: 12, costo_x_rollo: 6, precio: 15, banda: 'B2', material: 'M2', Buje: 'BU2' }
      ];
      console.log(`[Main Process - CSV Export] ${productos.length} productos (ejemplo/reales) recibidos.`);


      if (!productos || productos.length === 0) {
        return { success: false, error: 'No hay productos para exportar.' };
      }

      const columns = [
        'id', 'codigo', 'Descripcion', 'eti_x_rollo',
        'costo_x_1000', 'costo_x_rollo', 'precio',
        'banda', 'material', 'Buje'
      ];
      const csvHeader = columns.join(';');
      const csvRows = productos.map(producto =>
        columns.map(col => {
          let value = producto[col];
          if (value === null || value === undefined) {
            value = '';
          }
          // Escapar comillas dobles y envolver si contiene delimitador o comillas
          if (typeof value === 'string') {
            if (value.includes(';') || value.includes('"') || value.includes('\n')) {
              value = value.replace(/"/g, '""'); // Escapar comillas dobles internas
              value = `"${value}"`; // Envolver con comillas dobles
            }
          }
          return value;
        }).join(';')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      const { canceled, filePath: csvFilePath } = await dialog.showSaveDialog(mainWindow, { // Renombrado a csvFilePath para claridad
        title: 'Guardar Lista de Productos como CSV',
        defaultPath: path.join(app.getPath('documents'), `productos_export_${Date.now()}.csv`),
        filters: [
          { name: 'Archivos CSV', extensions: ['csv'] },
          { name: 'Todos los Archivos', extensions: ['*'] }
        ]
      });

      if (canceled || !csvFilePath) {
        console.log('[Main Process - CSV Export] Exportación CSV cancelada por el usuario.');
        return { success: false, message: 'Exportación CSV cancelada.' };
      }

      await fsPromises.writeFile(csvFilePath, csvContent, 'utf8');
      console.log(`[Main Process - CSV Export] Archivo CSV de productos guardado exitosamente en: ${csvFilePath}`);
      return { success: true, filePath: csvFilePath };

    } catch (error) {
      console.error('[Main Process - CSV Export] Error en el manejador exportProductosCsv:', error);
      return { success: false, error: error.message || 'Error desconocido durante la exportación CSV.' };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.whenReady().then(() => {
  console.log('Electron main process is ready. Ensure backend (if any for CSV) is running and accessible.');
});
