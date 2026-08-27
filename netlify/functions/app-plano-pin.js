const { checkAuth } = require("./lib/auth");
const { saveData, findProyectoForEmpresa, slugify } = require("./lib/store");

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

  const { proyectoId, puntoId, nombre, x, y } = payload;
  if (!proyectoId || x == null || y == null || (!puntoId && !nombre)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos" }) };
  }

  let punto;

  try {
    const data = auth.data;
    const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }

    if (puntoId) {
      punto = proyecto.puntos.find(p => p.id === puntoId);
      if (!punto) {
        return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Punto no encontrado" }) };
      }
    } else {
      const id = slugify(nombre);
      punto = proyecto.puntos.find(p => p.id === id);
      if (!punto) {
        punto = { id, nombre, registros: [], creadoEn: new Date().toISOString() };
        proyecto.puntos.unshift(punto);
      }
    }

    punto.x = x;
    punto.y = y;

    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar la ubicación.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id: punto.id, nombre: punto.nombre }) };
};
