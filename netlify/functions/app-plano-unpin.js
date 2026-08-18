const { checkAuth } = require("./lib/auth");
const { getData, saveData, findProyecto } = require("./lib/store");

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

  const { proyectoId, puntoId } = payload;
  if (!proyectoId || !puntoId) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos" }) };
  }

  try {
    const data = await getData();
    const proyecto = findProyecto(data, proyectoId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }

    const punto = proyecto.puntos.find(p => p.id === puntoId);
    if (!punto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Punto no encontrado" }) };
    }

    punto.x = null;
    punto.y = null;

    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo quitar el punto del mapa.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
