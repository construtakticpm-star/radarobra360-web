const { checkAuth } = require("./lib/auth");
const { getData, saveData, slugify } = require("./lib/store");

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
  const whatsapp = String(payload.whatsapp || "").replace(/[^0-9]/g, "");
  if (!nombre || !whatsapp) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Falta el nombre o el WhatsApp" }) };
  }

  try {
    const data = await getData();
    const base = slugify(nombre);
    let id = base;
    let n = 2;
    while ((data.usuarios || []).find(u => u.id === id)) {
      id = base + "-" + n;
      n++;
    }
    data.usuarios = data.usuarios || [];
    data.usuarios.push({ id, nombre, whatsapp });
    await saveData(data);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id }) };
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar el usuario.", debug: e.message })
    };
  }
};
