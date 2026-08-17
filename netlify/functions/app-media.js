const { checkAuth } = require("./lib/auth");
const { getMedia } = require("./lib/store");

exports.handler = async (event) => {
  const auth = checkAuth(event, "RadarObra360 — media");
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: "Falta id" };
  }

  let media;
  try {
    media = await getMedia(id);
  } catch (e) {
    return { statusCode: 503, body: "Almacenamiento no disponible." };
  }
  if (!media) {
    return { statusCode: 404, body: "No encontrado" };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=3600"
    },
    body: media.buffer.toString("base64"),
    isBase64Encoded: true
  };
};
