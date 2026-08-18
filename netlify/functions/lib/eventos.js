const crypto = require("crypto");

// Registro de bitácora (asignaciones y "listo") usado por la vista de
// "Registros del día". Se guarda con fecha/hora en UTC, igual que el resto
// de fechas de la app (ver app-registrar.js), para no mezclar convenciones.
function addEvento(data, { proyectoId, tipo, puntoId, puntoNombre, responsableId, responsableNombre }) {
  if (!Array.isArray(data.eventos)) data.eventos = [];
  const now = new Date();
  data.eventos.push({
    id: crypto.randomUUID(),
    proyectoId,
    tipo, // "asignacion" | "completado"
    puntoId,
    puntoNombre,
    responsableId: responsableId || null,
    responsableNombre: responsableNombre || null,
    fecha: now.toISOString().slice(0, 10),
    hora: now.toISOString().slice(11, 16),
    timestamp: now.toISOString()
  });
}

module.exports = { addEvento };
