const { checkAuth } = require("./lib/auth");
const { getData, saveData, findProyecto } = require("./lib/store");

const MAX_ETIQUETA_LENGTH = 30;

function normalizeEtiqueta(raw) {
  let tag = String(raw || "").trim().replace(/^#+/, "").replace(/\s+/g, "-");
  tag = tag.slice(0, MAX_ETIQUETA_LENGTH);
  return tag ? "#" + tag : "";
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

  const { proyectoId, puntoId } = payload;
  const etiqueta = normalizeEtiqueta(payload.etiqueta);
  if (!proyectoId || !puntoId || !etiqueta) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos o etiqueta vacía" }) };
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

    if (!Array.isArray(punto.etiquetas)) punto.etiquetas = [];
    if (!punto.etiquetas.includes(etiqueta)) punto.etiquetas.push(etiqueta);

    await saveData(data);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, etiquetas: punto.etiquetas }) };
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar la etiqueta.", debug: e.message })
    };
  }
};
