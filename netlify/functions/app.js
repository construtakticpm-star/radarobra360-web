const { checkAuth } = require("./lib/auth");
const { getData } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  const data = await getData();

  const puntosHtml = data.puntos.map(p => {
    const registros = p.registros || [];
    const last = registros[0];
    const thumb = last && last.fotos && last.fotos[0]
      ? `<img src="/app/media?id=${esc(last.fotos[0])}" alt="">`
      : "📷";
    return `
    <a class="punto-card" href="/app/punto?id=${esc(p.id)}">
      <div class="punto-card__thumb">${thumb}</div>
      <div class="punto-card__body">
        <div class="punto-card__name">${esc(p.nombre)}</div>
        <div class="punto-card__meta">${registros.length} registro${registros.length === 1 ? "" : "s"}${last ? " · " + esc(last.fecha) : ""}</div>
      </div>
    </a>`;
  }).join("");

  const body = `
    ${topbar()}
    <div class="wrap">
      <p class="eyebrow">Tus puntos de obra</p>
      <h1>Seguimiento visual</h1>
      <p class="lead">Organizado por punto/frente. Cada uno con su línea de tiempo de fotos y video.</p>
      ${data.puntos.length
        ? `<div class="punto-grid">${puntosHtml}</div>`
        : `<div class="empty">Todavía no hay ningún punto registrado.<br><br><a href="/app/registrar">＋ Registrar el primero</a></div>`
      }
    </div>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Seguimiento visual", body)
  };
};
