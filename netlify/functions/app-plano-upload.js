const crypto = require("crypto");
const { checkAuth } = require("./lib/auth");
const { saveData, saveMedia, findProyectoForEmpresa } = require("./lib/store");

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

  const { proyectoId, base64, contentType } = payload;
  if (!proyectoId || !base64) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Falta proyectoId o la imagen" }) };
  }

  try {
    const data = auth.data;
    const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }

    const id = crypto.randomUUID();
    await saveMedia(id, base64, contentType || "image/jpeg", auth.empresaId);
    proyecto.plano = { mediaId: id };
    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar el plano.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
