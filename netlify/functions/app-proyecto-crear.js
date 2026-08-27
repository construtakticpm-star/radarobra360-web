const { checkAuth } = require("./lib/auth");
const { saveData, slugify } = require("./lib/store");

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

  const nombre = (payload.nombre || "").trim();
  if (!nombre) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Falta el nombre del proyecto" }) };
  }

  try {
    const data = auth.data;
    const base = slugify(nombre);
    let id = base;
    let n = 2;
    while (data.proyectos.find(p => p.id === id)) {
      id = base + "-" + n;
      n++;
    }
    data.proyectos.push({ id, nombre, empresaId: auth.empresaId, puntos: [], plano: null });
    await saveData(data);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, id }) };
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo crear el proyecto.", debug: e.message })
    };
  }
};
