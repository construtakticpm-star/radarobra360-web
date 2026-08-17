const { checkAuth } = require("./lib/auth");
const { getData, saveData } = require("./lib/store");

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || Math.random().toString(36).slice(2, 10);
}

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

  const { puntoId, nombre, x, y } = payload;
  if (x == null || y == null || (!puntoId && !nombre)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos" }) };
  }

  try {
    const data = await getData();
    let punto;

    if (puntoId) {
      punto = data.puntos.find(p => p.id === puntoId);
      if (!punto) {
        return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Punto no encontrado" }) };
      }
    } else {
      const id = slugify(nombre);
      punto = data.puntos.find(p => p.id === id);
      if (!punto) {
        punto = { id, nombre, registros: [] };
        data.puntos.unshift(punto);
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

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
