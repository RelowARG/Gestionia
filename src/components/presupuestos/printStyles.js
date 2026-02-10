// src/components/presupuestos/printStyles.js

export const pdfPrintStyles = `
    /* Estilos específicos para impresión - Diseñados para PRESERVAR ESTRUCTURA, usar TEMA CLARO y OCULTAR SECCIONES */
    @media print {
        body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
            font-family: 'Roboto', Arial, sans-serif; /* Añadido Arial como fallback */
            font-size: 10pt; /* Reducido ligeramente para más contenido por página */
            line-height: 1.4; /* Ajustado para impresión */
        }

        .modal-overlay, .modal-content {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important; /* Generalmente se maneja el padding en secciones internas */
            margin: 0 !important; /* Evitar márgenes inesperados */
            /* float: none !important; No es necesario con flex/grid modernos */
        }

        .button-area {
            display: none !important;
        }
        
        .pdf-header, .client-section, .pdf-section > .section-title + *, .totals-section > .totals-section {
             /* padding-left: 0 !important; */ /* Se maneja con el padding general del body o contenedor principal si es necesario */
             /* padding-right: 0 !important; */
        }

        .pdf-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            margin-bottom: 20px !important; 
            border-bottom: 1px solid #cccccc !important;
            padding-bottom: 10px !important;
            width: 100% !important;
        }

        .header-left {
            flex-shrink: 0 !important;
            margin-right: 15px !important;
        }

        .pdf-logo {
            max-width: 170px !important; /* Ligeramente más pequeño para impresión */
            max-height: 65px !important;
            height: auto !important;
            display: block !important;
        }

        .header-right {
            flex-grow: 1 !important;
            text-align: right !important;
        }

        .pdf-main-title {
            color: #000000 !important;
            font-size: 18pt !important; /* Ajustado */
            font-weight: bold !important;
            margin: 0 0 5px 0 !important;
            padding: 0 !important;
            text-transform: uppercase;
        }

        .header-details {
            font-size: 9pt !important;
            color: #222222 !important;
        }

        .header-details div {
            margin-bottom: 2px !important;
        }

        .header-details strong {
            font-weight: bold !important;
            color: #000000 !important;
        }

        .print-hidden-section { /* Secciones como Comentarios, Condiciones de Pago, etc. */
            display: none !important;
        }

        .pdf-section {
            margin-bottom: 12px !important; /* Reducido para más compacidad */
            padding-top: 8px !important;
            border-top: 1px dashed #eeeeee !important;
            page-break-inside: avoid !important;
        }

        .pdf-section:first-of-type { /* client-section */
            border-top: none !important;
            padding-top: 0 !important;
        }
        
        .client-section { /* Estilos específicos para el bloque de cliente en impresión */
            margin-bottom: 15px !important;
            padding: 10px !important; /* Un ligero padding interno */
            background-color: #f9f9f9 !important; /* Un fondo muy sutil para destacar el bloque */
            border: 1px solid #eeeeee !important;
            border-radius: 3px !important;
            page-break-inside: avoid !important; /* Evitar que se corte el bloque de cliente */
        }


        .section-title {
            font-size: 13pt !important; /* Ajustado */
            font-weight: bold !important;
            color: #000000 !important;
            margin-top: 0 !important;
            margin-bottom: 8px !important;
            border-bottom: 1px solid #e0e0e0 !important; /* Borde más sutil */
            padding-bottom: 3px !important;
        }
        
        .client-section .section-title { /* Título dentro de client-section */
             border-bottom-color: #dddddd !important; /* Consistente con el borde de client-section */
        }


        /* --- ESTILOS MODIFICADOS PARA CLIENT-SECTION DETAIL-ROW EN PDF --- */
        .client-section .detail-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start; /* Alinear al inicio si los textos son multilínea */
            margin-bottom: 4px !important;
            padding-bottom: 3px !important;
            border-bottom: 1px dotted #dddddd !important;
            font-size: 10pt !important; /* Consistente con el tamaño de fuente base */
        }

        .client-section .detail-row:last-child {
             border-bottom: none !important;
             margin-bottom: 0 !important; /* Sin margen inferior para la última fila */
             padding-bottom: 0 !important;
        }

        .client-section .detail-label {
            font-weight: bold !important;
            color: #000000 !important;
            text-align: left !important;
            flex-basis: 30% !important; /* Ajusta según el contenido de tus etiquetas */
            margin-right: 10px !important; /* Espacio entre etiqueta y valor */
            flex-shrink: 0 !important; /* Evita que la etiqueta se encoja */
        }

        .client-section .detail-row > span:not(.detail-label) { /* Estilo para el valor del cliente */
            text-align: right !important;
            flex-basis: 70% !important; /* El espacio restante */
            word-break: break-word !important;
            color: #222222 !important; /* Ligeramente más oscuro que #333333 */
        }
        /* --- FIN ESTILOS MODIFICADOS PARA CLIENT-SECTION EN PDF --- */


        table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 8px !important;
            margin-bottom: 12px !important;
            border: 1px solid #cccccc !important;
            font-size: 9pt !important; /* Ligeramente más pequeño para tablas */
            page-break-inside: avoid !important;
         }

        th, td {
            text-align: left !important;
            padding: 5px 7px !important; /* Padding reducido para celdas */
            border: 1px solid #d8d8d8 !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            vertical-align: top !important;
            color: #000000 !important;
            background-color: transparent !important;
        }

        th {
            background-color: #eaeaea !important; /* Fondo de encabezado de tabla más claro */
            font-weight: bold !important;
            font-size: 8.5pt !important;
            text-transform: uppercase !important;
            color: #000000 !important;
        }

        tbody tr:nth-child(even) {
            background-color: #fbfbfb !important; /* Alternado de filas muy sutil */
        }

        /* Estilos para sección de totales (Tema Claro) */
        .pdf-section.totals-section { /* El contenedor de la sección "Totales" */
             border-top: 1px solid #cccccc !important;
             margin-top: 15px !important;
             padding-top: 10px !important;
        }
        /* El div interno .totals-section que tiene el fondo y los .total-row */
        .pdf-section.totals-section > .totals-section {
            background-color: #f0f0f0 !important;
            padding: 10px 12px !important; /* Ajustado el padding */
            border-radius: 3px !important;
            page-break-inside: avoid !important;
        }

        .total-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 3px !important;
            font-size: 10pt !important; /* Consistente con el texto base */
            color: #000000 !important;
        }
        .total-row:last-child {
            margin-bottom: 0 !important;
        }

        .total-label {
             font-weight: bold !important;
             text-align: left !important; /* Asegurar alineación izquierda */
             flex-basis: 60% !important;
             margin-right: 10px !important;
             color: #000000 !important;
        }

         .total-row span:not(.total-label) { /* El valor del total */
             text-align: right !important; /* Asegurar alineación derecha */
             flex-basis: 40% !important;
             font-weight: bold !important; /* Hacer el valor del total en negrita también */
             color: #000000 !important;
         }
        .total-row.total-emphasis span { /* Para las filas de Total USD y Total ARS */
            font-weight: bold !important; /* Ya está en el span:not(.total-label), pero se puede reforzar */
            font-size: 10.5pt !important; /* Ligeramente más grande para destacar */
        }

        .preformatted-text { /* Aunque oculto, por si se decide mostrar alguno */
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            font-family: 'Courier New', Courier, monospace !important; /* Fuente monoespaciada para pre */
            font-size: 9pt !important;
            line-height: 1.4 !important;
            color: #333333 !important;
            background-color: #f5f5f5 !important;
            border: 1px solid #eeeeee !important;
            padding: 8px !important;
            border-radius: 4px !important;
            page-break-inside: avoid !important;
        }

        p, div, span { /* Heredar color, útil si algún estilo se escapa */
            color: inherit !important;
        }

        a {
            text-decoration: none !important;
            color: inherit !important;
        }

        img { /* Estilo general para imágenes en impresión */
            display: inline-block !important; /* O block, según necesidad */
            max-width: 100% !important; /* Para que no se desborden */
            height: auto !important;
            vertical-align: middle !important; /* Buen default */
        }
    } /* Fin @media print */
`;