// E:\Gestionia\software-gestion-backend\ai_modules\memoriaMilo.js
const historial = require('../milo_modules/historial');
const comercial = require('../milo_modules/comercial');
const finanzas = require('../milo_modules/finanzas');

module.exports = {
    ...historial,
    ...comercial,
    ...finanzas
};