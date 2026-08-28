const { checkAuth } = require("./lib/auth");
const { saveData, findProyectoForEmpresa } = require("./lib/store");
const { addEvento } = require("./lib/eventos");

// Alerta de radar: bandera visible para cualquiera que abra el plano de este
// proyecto mientras está activa (no es un push real al celular — ver
// lib/eventos.js para el resto de la bitácora). Se guarda en el proyecto,
// no en localStorage, para que sea la misma para todos los que entren.
exports.handler = async (event) => {
  const auth = await checkAuth(event);
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

  const { proyectoId, activar } = payload;
  if (!proyectoId || typeof activar !== "boolean") {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos" }) };
  }

  try {
    const data = auth.data;
    const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }

    if (activar) {
      const activadaEn = new Date().toISOString();
      proyecto.alertaRadar = { activadaEn };
      addEvento(data, { proyectoId, tipo: "alerta_radar", puntoId: null, puntoNombre: null, responsableId: null, responsableNombre: null });
    } else {
      proyecto.alertaRadar = null;
    }

    await saveData(data);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, alertaRadar: proyecto.alertaRadar }) };
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo actualizar la alerta.", debug: e.message })
    };
  }
};
