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

const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000;

// Resumen del día para un proyecto: asignaciones y completados de HOY (se
// "reinicia" cada día solo por el filtro de fecha — el historial completo
// sigue en data.eventos), más alertas de puntos sin asignar 4+ horas (esto
// es sobre el estado ACTUAL, no se filtra por fecha).
function resumenHoy(data, proyecto, proyectoId) {
  const hoy = new Date().toISOString().slice(0, 10);
  const eventosHoy = (data.eventos || []).filter(e => e.proyectoId === proyectoId && e.fecha === hoy);
  const asignaciones = eventosHoy.filter(e => e.tipo === "asignacion").sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const completados = eventosHoy.filter(e => e.tipo === "completado").sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const ahora = Date.now();
  const alertas = (proyecto.puntos || [])
    .filter(p => p.x != null && p.y != null && p.creadoEn)
    .map(p => {
      const ultimo = p.registros && p.registros[0];
      const asignado = !!(ultimo && ultimo.responsableId);
      const horas = Math.floor((ahora - new Date(p.creadoEn).getTime()) / (60 * 60 * 1000));
      return { punto: p, asignado, horas };
    })
    .filter(x => !x.asignado && x.horas * 60 * 60 * 1000 >= CUATRO_HORAS_MS);

  return { hoy, asignaciones, completados, alertas };
}

module.exports = { addEvento, resumenHoy };
