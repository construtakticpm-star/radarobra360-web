const { checkAuth } = require("./lib/auth");
const { getData, saveData, findProyecto } = require("./lib/store");

const ESTATUS_VALIDOS = ["pendiente", "en-proceso", "listo"];

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { proyectoId, puntoId, registroId, registroIndex, estatus, responsableId } = payload;
  if (!proyectoId || !puntoId || (!registroId && registroIndex == null) || !ESTATUS_VALIDOS.includes(estatus)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos o estatus inválido" }) };
  }

  try {
    const data = await getData();
    const proyecto = findProyecto(data, proyectoId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }
    const punto = (proyecto.puntos || []).find(p => p.id === puntoId);
    if (!punto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Punto no encontrado" }) };
    }

    const registros = punto.registros || [];
    // Prefer matching by id (registros created after this feature always
    // have one); fall back to array position for older registros that
    // predate it, so nothing already saved becomes un-editable.
    let registro = registroId ? registros.find(r => r.id === registroId) : null;
    if (!registro && registroIndex != null) registro = registros[registroIndex];
    if (!registro) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Registro no encontrado" }) };
    }

    registro.estatus = estatus;
    registro.responsableId = responsableId || null;

    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo actualizar el registro.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
