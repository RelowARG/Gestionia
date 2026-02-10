// src/components/presupuestos/modalScreenStyles.js

export const modalScreenStyles = `
    /* Estilos generales para el contenido dentro del modal (Vista en pantalla - Tema Oscuro) */
    .modal-content {
        /* Estilos base ya definidos en modalContentStyle en línea (backgroundColor, color, font-family, padding, etc.) */
    }

    .pdf-container {
        width: 100%;
        margin: 0 auto;
        padding: 0;
    }

    .pdf-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: 30px;
         border-bottom: 2px solid #555;
         padding-bottom: 15px;
    }

    .pdf-header .header-left .pdf-logo {
        max-width: 180px;
        max-height: 70px;
        width: auto;
        height: auto;
        display: block;
    }

    .pdf-header h3 { /* Corregido: .pdf-main-title es la clase del título */
        color: #ffffff;
        font-size: 22px;
        margin: 0;
        padding: 0;
        text-align: left; /* El título del presupuesto usualmente va a la derecha o centrado con los detalles */
        /* flex-grow: 1; Si quieres que empuje el logo, pero el layout es header-left y header-right */
        font-weight: bold;
    }
    /* Si el título es .pdf-main-title dentro de .header-right, los estilos ya están en printStyles */
    .pdf-main-title { /* Estilo para el título "PRESUPUESTO" */
        color: #ffffff;
        font-size: 22px;
        font-weight: bold;
        margin: 0 0 8px 0;
        padding: 0;
        text-align: right; /* Alineado a la derecha como en el PDF */
    }


    .header-details { /* Cambiado de .header-info para consistencia con el HTML y printStyles */
        font-size: 14px;
        text-align: right;
        color: #bbb;
    }

    .header-details div {
        margin-bottom: 4px;
    }

    .header-details strong {
        font-weight: bold;
        color: #e0e0e0;
    }

    .pdf-section {
        margin-bottom: 15px;
        padding-top: 10px;
        border-top: 1px dashed #444;
    }

     .pdf-section.totals-section {
         margin-bottom: 10px;
     }

    .pdf-section:first-of-type { /* Usualmente .client-section */
         border-top: none;
         padding-top: 0;
    }

    .section-title {
        font-size: 16px;
        font-weight: bold;
        color: #ffffff;
        margin-top: 0;
        margin-bottom: 10px;
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
    }

    /* --- ESTILOS MODIFICADOS PARA CLIENT-SECTION DETAIL-ROW --- */
    .client-section .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        padding-bottom: 5px;
        border-bottom: 1px dotted #444; /* Borde sutil para separar las filas */
        font-size: 14px; /* Consistente con .header-details */
    }

    .client-section .detail-row:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
    }

    .client-section .detail-label {
        font-weight: bold;
        color: #e0e0e0;
        text-align: left;
        flex-basis: 35%; /* Ajusta este porcentaje según el contenido más largo de tus etiquetas */
        margin-right: 10px;
        flex-shrink: 0; /* Evita que la etiqueta se encoja */
    }

    .client-section .detail-row > span:not(.detail-label) { /* Estilo para el valor del cliente */
        text-align: right;
        flex-basis: 65%; /* El resto del espacio */
        word-break: break-word; /* Para textos largos */
        color: #bbb;
    }
    /* --- FIN ESTILOS MODIFICADOS PARA CLIENT-SECTION --- */

    /* Estilos para tabla en PANTALLA (Tema Oscuro) */
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        margin-bottom: 15px;
        border: 1px solid #555;
        font-size: 0.9rem;
    }

    th, td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #444;
        word-wrap: break-word;
        vertical-align: top;
        color: #e0e0e0;
    }

    th {
        background-color: #3a3a3a;
        font-weight: bold;
        font-size: 0.8rem;
        text-transform: uppercase;
        color: #ffffff;
        border-bottom: 1px solid #555;
    }

    tbody tr:nth-child(even) {
        background-color: #333;
    }

     tbody tr:hover {
         background-color: #444;
     }

    /* Estilos para la sección de totales en PANTALLA (Tema Oscuro) */
    /* El div .pdf-section.totals-section ya tiene estilos generales */
    /* Este es el div interno que tiene la clase .totals-section */
    .pdf-section.totals-section > .totals-section {
        margin-top: 10px; /* Espacio respecto al título "Totales" */
        /* border-top: 1px solid #555; No es necesario si el título ya tiene borde inferior */
        padding-top: 8px;
        background-color: #3a3a3a;
        padding: 10px; /* Padding interno para el bloque de totales */
        border-radius: 3px;
    }

    .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px; /* Espacio entre filas de totales */
        font-size: 0.95rem; /* Ligeramente más pequeño que el texto base del modal */
        font-weight: normal; /* Normal, el énfasis lo da .total-label o .total-emphasis */
        color: #ffffff;
    }
    .total-row:last-child{
        margin-bottom: 0;
    }

    .total-label {
         font-weight: bold;
         text-align: left;
         flex-basis: 60%; /* Más espacio para etiquetas de totales */
         margin-right: 10px;
         color: #ffffff;
    }

     .total-row span:not(.total-label) { /* El valor del total */
         text-align: right;
         flex-basis: 40%;
         color: #ffffff;
     }
     .total-row.total-emphasis span { /* Para las filas de Total USD y Total ARS */
        font-weight: bold;
        font-size: 1rem; /* Un poco más grande para destacar */
     }


    /* Estilos para texto preformateado en PANTALLA (Tema Oscuro) */
    .preformatted-text {
        white-space: pre-wrap;
        word-wrap: break-word;
        overflow-wrap: break-word;
        font-family: sans-serif;
        font-size: 0.9rem;
        line-height: 1.6;
        color: #bbb;
        background-color: #3a3a3a;
        border: 1px solid #555;
        padding: 10px;
        border-radius: 5px;
    }

     /* Estilos para los botones en pantalla */
    .button-area button {
        padding: 10px 20px;
        border-radius: 5px;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        font-weight: bold;
        transition: background-color 0.3s ease, opacity 0.3s ease;
        margin-left: 10px;
         color: #ffffff;
    }

    .button-area button:first-child {
        margin-left: 0;
    }

    .button-area button.primary {
         background-color: #5cb85c;
    }
     .button-area button.primary:hover {
         background-color: #4cae4c;
     }


    .button-area button.secondary {
        background-color: #d9534f;
    }
    .button-area button.secondary:hover {
        background-color: #c9302c;
    }

     .button-area button:disabled {
         background-color: #555;
         color: #aaa;
         cursor: not-allowed;
     }
`;
