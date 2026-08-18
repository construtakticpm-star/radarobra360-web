const crypto = require("crypto");
const { checkAuth } = require("./lib/auth");
const { getData, saveData } = require("./lib/store");

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

  const nombre = (payload.nombre || "").trim();
  const mensaje = (payload.mensaje || "").trim();
  if (!mensaje) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Falta el mensaje" }) };
  }

  try {
    const data = await getData();
    data.sugerencias = data.sugerencias || [];
    data.sugerencias.unshift({
      id: crypto.randomUUID(),
      nombre,
      mensaje,
      fecha: new Date().toISOString().slice(0, 10)
    });
    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo enviar la sugerencia.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
