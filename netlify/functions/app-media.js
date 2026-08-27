const { checkAuth } = require("./lib/auth");
const { getMedia } = require("./lib/store");

exports.handler = async (event) => {
  const auth = await checkAuth(event);
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
  // Los archivos guardados antes del modelo multiempresa no traen
  // empresaId — se dejan pasar (son de la empresa "puente" migrada) en vez
  // de romper fotos ya subidas; los nuevos SIEMPRE llevan su dueño.
  if (media.empresaId && media.empresaId !== auth.empresaId) {
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
