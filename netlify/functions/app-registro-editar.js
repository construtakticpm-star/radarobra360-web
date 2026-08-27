const { checkAuth } = require("./lib/auth");
const { saveData, findProyectoForEmpresa, findUsuarioForEmpresa } = require("./lib/store");
const { addEvento } = require("./lib/eventos");

const ESTATUS_VALIDOS = ["pendiente", "en-proceso", "listo"];

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

  const { proyectoId, puntoId, registroId, registroIndex, estatus, responsableId } = payload;
  if (!proyectoId || !puntoId || (!registroId && registroIndex == null) || !ESTATUS_VALIDOS.includes(estatus)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan datos o estatus inválido" }) };
  }

  try {
    const data = auth.data;
    const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);
    if (!proyecto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Proyecto no encontrado" }) };
    }
    const punto = (proyecto.puntos || []).find(p => p.id === puntoId);
    if (!punto) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Punto no encontrado" }) };
    }

    const registros = punto.registros || [];
    // Prefer matching by id (registros created after this feature always
    // have one); fall back to array position for older registros that
    // predate it, so nothing already saved becomes un-editable.
    let registro = registroId ? registros.find(r => r.id === registroId) : null;
    if (!registro && registroIndex != null) registro = registros[registroIndex];
    if (!registro) {
      return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Registro no encontrado" }) };
    }

    const prevEstatus = registro.estatus;
    const prevResponsableId = registro.responsableId || null;
    const nuevoResponsableId = responsableId || null;

    registro.estatus = estatus;
    registro.responsableId = nuevoResponsableId;

    if (nuevoResponsableId && nuevoResponsableId !== prevResponsableId) {
      const responsable = findUsuarioForEmpresa(data, nuevoResponsableId, auth.empresaId);
      addEvento(data, {
        proyectoId, tipo: "asignacion", puntoId: punto.id, puntoNombre: punto.nombre,
        responsableId: nuevoResponsableId, responsableNombre: responsable ? responsable.nombre : null
      });
    }
    if (estatus === "listo" && prevEstatus !== "listo") {
      const responsable = nuevoResponsableId ? findUsuarioForEmpresa(data, nuevoResponsableId, auth.empresaId) : null;
      addEvento(data, {
        proyectoId, tipo: "completado", puntoId: punto.id, puntoNombre: punto.nombre,
        responsableId: nuevoResponsableId, responsableNombre: responsable ? responsable.nombre : null
      });
    }

    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo actualizar el registro.", debug: e.message })
    };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
