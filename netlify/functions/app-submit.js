const crypto = require("crypto");
const { checkAuth } = require("./lib/auth");
const { getData, saveData, saveMedia } = require("./lib/store");

const MAX_TOTAL_BYTES = 4.7 * 1024 * 1024; // ~3.5MB raw inflates ~33% as base64

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || crypto.randomUUID().slice(0, 8);
}

exports.handler = async (event) => {
  const auth = checkAuth(event, "RadarObra360 — registrar");
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

  const { punto, fecha, nota, fotos, video } = payload;

  if (!punto || !fecha) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Faltan campos requeridos" }) };
  }

  const totalBytes = (fotos || []).reduce((sum, f) => sum + (f.base64 ? f.base64.length : 0), 0)
    + (video && video.base64 ? video.base64.length : 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return { statusCode: 413, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "El registro pesa demasiado — reduce fotos o video." }) };
  }

  const registro = { fecha, nota: nota || "", fotos: [] };

  try {
    for (const foto of fotos || []) {
      const id = crypto.randomUUID();
      await saveMedia(id, foto.base64, foto.contentType || "image/jpeg");
      registro.fotos.push(id);
    }
    if (video && video.base64) {
      const id = crypto.randomUUID();
      await saveMedia(id, video.base64, video.contentType || "video/mp4");
      registro.video = id;
    }

    const data = await getData();
    const puntoId = slugify(punto);
    let puntoObj = data.puntos.find(p => p.id === puntoId);
    if (!puntoObj) {
      puntoObj = { id: puntoId, nombre: punto, registros: [] };
      data.puntos.unshift(puntoObj);
    }
    puntoObj.registros = [registro, ...(puntoObj.registros || [])];

    await saveData(data);
  } catch (e) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No se pudo guardar — almacenamiento no disponible.", debug: e.message })
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true })
  };
};
