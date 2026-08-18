const { checkAuth } = require("./lib/auth");
const { getData, findProyecto } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000;

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  const proyectoId = event.queryStringParameters && event.queryStringParameters.proyecto;
  const data = await getData();
  const proyecto = findProyecto(data, proyectoId);

  if (!proyecto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Proyecto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  // La vista se "reinicia" cada día filtrando por la fecha de hoy — el
  // historial completo se conserva en data.eventos, solo no se muestra aquí.
  const hoy = new Date().toISOString().slice(0, 10);
  const eventosHoy = (data.eventos || []).filter(e => e.proyectoId === proyectoId && e.fecha === hoy);
  const asignaciones = eventosHoy.filter(e => e.tipo === "asignacion").sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const completados = eventosHoy.filter(e => e.tipo === "completado").sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Alerta de "sin asignar" es sobre el estado ACTUAL del punto, no un
  // log histórico — por eso no se filtra por fecha, solo por antigüedad.
  const ahora = Date.now();
  const alertas = (proyecto.puntos || [])
    .filter(p => p.x != null && p.y != null && p.creadoEn)
    .map(p => {
      const ultimo = p.registros && p.registros[0];
      const asignado = !!(ultimo && ultimo.responsableId);
      const msDesdeCreado = ahora - new Date(p.creadoEn).getTime();
      return { punto: p, asignado, horas: Math.floor(msDesdeCreado / (60 * 60 * 1000)) };
    })
    .filter(x => !x.asignado && x.horas * 60 * 60 * 1000 >= CUATRO_HORAS_MS);

  const alertasHtml = alertas.length
    ? `<div class="alert-banner-list">${alertas.map(a => `<div class="alert-banner">⚠️ <strong>${esc(a.punto.nombre)}</strong>: Punto aún sin asignar, Peligro próximo <span class="alert-banner__meta">(sin asignar hace ${a.horas}h)</span></div>`).join("")}</div>`
    : `<p class="hint">Sin alertas por ahora.</p>`;

  const asignacionesHtml = asignaciones.length
    ? asignaciones.map(e => `<div class="evento-row"><span class="evento-row__icon">🧷</span><span class="evento-row__text"><strong>${esc(e.puntoNombre)}</strong> se ha asignado a <strong>${esc(e.responsableNombre || "—")}</strong> el día ${esc(e.fecha)} · ${esc(e.hora)}</span></div>`).join("")
    : `<p class="hint">Sin asignaciones todavía hoy.</p>`;

  const completadosHtml = completados.length
    ? completados.map(e => `<div class="evento-row"><span class="evento-row__icon">✅</span><span class="evento-row__text">Fecha de evento: ${esc(e.fecha)} · <strong>${esc(e.responsableNombre || "Sin asignar")}</strong> marcó Listo a <strong>${esc(e.puntoNombre)}</strong> · ${esc(e.hora)}</span></div>`).join("")
    : `<p class="hint">Nada marcado como Listo todavía hoy.</p>`;

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap wrap--narrow">
      <a class="back" href="/app/plano?proyecto=${esc(proyectoId)}">← Volver al plano</a>
      <p class="eyebrow">Registros del día · ${esc(proyecto.nombre)}</p>
      <h1>Hoy</h1>
      <p class="lead">Esta vista se reinicia cada día — solo muestra lo que pasó hoy (${esc(hoy)}). El historial completo sigue disponible en cada punto.</p>

      <div class="card" style="margin-bottom:20px;">
        <p class="eyebrow" style="margin-bottom:12px;">Alertas</p>
        ${alertasHtml}
      </div>

      <div class="card" style="margin-bottom:20px;">
        <p class="eyebrow" style="margin-bottom:12px;">Asignaciones de hoy</p>
        ${asignacionesHtml}
      </div>

      <div class="card">
        <p class="eyebrow" style="margin-bottom:12px;">Completados de hoy</p>
        ${completadosHtml}
      </div>
    </div>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Registros del día", body)
  };
};
