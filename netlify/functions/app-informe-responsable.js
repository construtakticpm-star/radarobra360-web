const { checkAuth } = require("./lib/auth");
const { findProyectoForEmpresa, findUsuarioForEmpresa } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

const ESTATUS_LABELS = { pendiente: "Pendiente", "en-proceso": "En proceso", listo: "Listo" };

exports.handler = async (event) => {
  const auth = await checkAuth(event, { redirect: true });
  if (!auth.ok) return auth.response;
  const data = auth.data;

  const params = event.queryStringParameters || {};
  const proyectoId = params.proyecto;
  const responsableId = params.responsable;
  const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);

  if (!proyecto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Proyecto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  const responsable = findUsuarioForEmpresa(data, responsableId, auth.empresaId);
  if (!responsable) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar(proyectoId, proyecto.nombre)}<div class="wrap"><p>Responsable no encontrado. <a href="/app/plano?proyecto=${esc(proyectoId)}">Volver</a></p></div>`)
    };
  }

  // Puntos asignados actualmente a este responsable, sin importar su
  // estatus (a diferencia del plano, aquí no se esconden los "Listo").
  const puntosAsignados = (proyecto.puntos || []).filter(p => {
    const ultimo = p.registros && p.registros[0];
    return ultimo && ultimo.responsableId === responsableId;
  });

  const placed = puntosAsignados.filter(p => p.x != null && p.y != null);

  const pinsHtml = placed.map(p => `
    <div class="informe-pin" style="left:${p.x}%; top:${p.y}%;" title="${esc(p.nombre)}">
      <span class="informe-pin__dot"></span>
      <span class="informe-pin__label">${esc(p.nombre)}</span>
    </div>`).join("");

  const planoHtml = proyecto.plano
    ? `<div class="informe-stage"><img src="/app/media?id=${esc(proyecto.plano.mediaId)}" alt="Plano de obra">${pinsHtml}</div>`
    : `<p class="hint">Este proyecto todavía no tiene un plano cargado.</p>`;

  const listaHtml = puntosAsignados.map(p => {
    const ultimo = p.registros[0];
    const estatusLabel = ESTATUS_LABELS[ultimo.estatus] || ultimo.estatus;
    return `<div class="informe-row">
      <strong>${esc(p.nombre)}</strong>
      <span class="informe-row__estatus informe-row__estatus--${esc(ultimo.estatus)}">${esc(estatusLabel)}</span>
      <span class="informe-row__fecha">${esc(ultimo.fecha)}</span>
      ${p.x == null ? '<span class="informe-row__nota">(sin ubicar en el plano)</span>' : ""}
    </div>`;
  }).join("");

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap wrap--narrow informe-page">
      <div class="informe-actions">
        <a class="back" href="/app/plano?proyecto=${esc(proyectoId)}">← Volver al plano</a>
        <button type="button" class="btn btn--primary" onclick="window.print()">🖨️ Descargar / imprimir PDF</button>
      </div>

      <p class="eyebrow">Informe por responsable · ${esc(proyecto.nombre)}</p>
      <h1>${esc(responsable.nombre)}</h1>
      <p class="lead">${puntosAsignados.length} punto${puntosAsignados.length === 1 ? "" : "s"} asignado${puntosAsignados.length === 1 ? "" : "s"} actualmente a este responsable, sin importar su estatus.</p>

      ${planoHtml}

      <div class="informe-lista">
        ${listaHtml || '<p class="hint">Este responsable no tiene puntos asignados actualmente.</p>'}
      </div>
    </div>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell(`Informe — ${responsable.nombre}`, body, "radar-bg")
  };
};
