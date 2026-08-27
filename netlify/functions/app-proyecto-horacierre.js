const { checkAuth } = require("./lib/auth");
const { saveData, findProyectoForEmpresa } = require("./lib/store");

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  const { proyectoId, horaCierre } = payload;
  if (!proyectoId || !HORA_RE.test(horaCierre || "")) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Hora inválida — usa formato HH:MM" }) };
  }

  try {
    const data = auth.data;
    const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }
    proyecto.horaCierre = horaCierre;
    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar la hora de cierre.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, horaCierre }) };
};
