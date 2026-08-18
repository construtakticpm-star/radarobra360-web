const { checkAuth } = require("./lib/auth");
const { getData } = require("./lib/store");
const { esc, shell, topbar, lightboxMarkup, lightboxScript } = require("./lib/ui");

function renderMedia(reg) {
  const fotos = (reg.fotos || [])
    .map(id => `<img src="/app/media?id=${esc(id)}" alt="Foto" class="lightbox-trigger" data-media-id="${esc(id)}">`)
    .join("");
  const video = reg.video
    ? `<video controls preload="metadata" src="/app/media?id=${esc(reg.video)}"></video>`
    : "";
  return fotos + video;
}

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  const id = event.queryStringParameters && event.queryStringParameters.id;
  const data = await getData();
  const punto = data.puntos.find(p => p.id === id);

  if (!punto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Punto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  const registros = punto.registros || [];
  const registrosHtml = registros.length
    ? registros.map(r => `
      <div class="registro">
        <div class="registro__head">
          <span class="registro__fecha">${esc(r.fecha)}</span>
        </div>
        ${r.nota ? `<p class="registro__nota">${esc(r.nota)}</p>` : ""}
        <div class="registro__media">${renderMedia(r)}</div>
      </div>`).join("")
    : `<div class="empty">Sin registros todavía en este punto.</div>`;

  const body = `
    ${topbar()}
    <div class="wrap">
      <a class="back" href="/app">← Todos los puntos</a>
      <p class="eyebrow">Línea de tiempo</p>
      <h1>${esc(punto.nombre)}</h1>
      <p class="lead">${registros.length} registro${registros.length === 1 ? "" : "s"}, del más reciente al más antiguo.</p>
      ${registrosHtml}
    </div>
    ${lightboxMarkup()}
    <script>
      ${lightboxScript()}
      attachLightbox(document);
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell(punto.nombre, body)
  };
};
