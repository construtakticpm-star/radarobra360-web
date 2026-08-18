const { checkAuth } = require("./lib/auth");
const { getData, saveData, findProyecto, deleteMedia } = require("./lib/store");

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

  const { proyectoId, puntoId, mediaId } = payload;
  if (!proyectoId || !puntoId || !mediaId) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos" }) };
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

    let found = false;
    for (const reg of punto.registros || []) {
      if (reg.fotos && reg.fotos.includes(mediaId)) {
        reg.fotos = reg.fotos.filter(id => id !== mediaId);
        found = true;
        break;
      }
      if (reg.video === mediaId) {
        reg.video = null;
        found = true;
        break;
      }
    }
    if (!found) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Archivo no encontrado en este punto" }) };
    }

    await saveData(data);
    try {
      await deleteMedia(mediaId);
    } catch (e) {
      // Reference already removed from the registro; blob cleanup is best-effort.
    }
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo eliminar el archivo.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
