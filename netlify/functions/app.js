const { checkAuth } = require("./lib/auth");
const { getData, findProyecto } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

function contarFotos(puntos) {
  return (puntos || []).reduce((sum, p) =>
    sum + (p.registros || []).reduce((s, r) => s + (r.fotos ? r.fotos.length : 0), 0), 0);
}

function renderSelectorProyectos(data) {
  const proyectosHtml = data.proyectos.map(p => {
    const puntos = p.puntos || [];
    const totalFotos = contarFotos(puntos);
    const thumb = p.plano
      ? `<img src="/app/media?id=${esc(p.plano.mediaId)}" alt="">`
      : "📁";
    return `
    <a class="punto-card" href="/app?proyecto=${esc(p.id)}">
      <div class="punto-card__thumb">${thumb}</div>
      <div class="punto-card__body">
        <div class="punto-card__name">${esc(p.nombre)}</div>
        <div class="punto-card__meta">${puntos.length} punto${puntos.length === 1 ? "" : "s"} · ${totalFotos} foto${totalFotos === 1 ? "" : "s"}</div>
      </div>
    </a>`;
  }).join("");

  const body = `
    ${topbar()}
    <div class="wrap">
      <p class="eyebrow">Tus proyectos</p>
      <h1>Proyectos / obras</h1>
      <p class="lead">Cada proyecto tiene su propio plano y sus propios puntos de seguimiento.</p>
      ${data.proyectos.length
        ? `<div class="punto-grid">${proyectosHtml}</div>`
        : `<div class="empty">Todavía no hay ningún proyecto. Crea el primero abajo.</div>`
      }

      <div class="card" style="margin-top:32px; max-width:420px;">
        <p class="eyebrow">Nuevo proyecto</p>
        <form id="fProyecto">
          <label for="nombreProyecto">Nombre del proyecto / obra</label>
          <input type="text" id="nombreProyecto" required placeholder="Ej. Torre Norte, Residencial Palmas...">
          <button type="submit" class="btn btn--primary btn--block" id="crearBtn" style="margin-top:16px;">＋ Crear proyecto</button>
          <div class="status" id="crearStatus"></div>
        </form>
      </div>
    </div>
    <script>
      const fProyecto = document.getElementById('fProyecto');
      const crearBtn = document.getElementById('crearBtn');
      const crearStatus = document.getElementById('crearStatus');
      fProyecto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombreProyecto').value.trim();
        if (!nombre) return;
        crearBtn.disabled = true;
        crearStatus.className = 'status';
        crearStatus.textContent = 'Creando...';
        try {
          const res = await fetch('/app/proyecto-crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.href = '/app?proyecto=' + encodeURIComponent(body.id);
        } catch (err) {
          crearStatus.className = 'status status--error';
          crearStatus.textContent = err.message || 'No se pudo crear.';
          crearBtn.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Proyectos", body)
  };
}

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  const data = await getData();
  const proyectoId = event.queryStringParameters && event.queryStringParameters.proyecto;

  if (!proyectoId) {
    return renderSelectorProyectos(data);
  }

  const proyecto = findProyecto(data, proyectoId);
  if (!proyecto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Proyecto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  const puntos = proyecto.puntos || [];
  const puntosHtml = puntos.map(p => {
    const registros = p.registros || [];
    const last = registros[0];
    const thumb = last && last.fotos && last.fotos[0]
      ? `<img src="/app/media?id=${esc(last.fotos[0])}" alt="">`
      : "📷";
    return `
    <a class="punto-card" href="/app/punto?proyecto=${esc(proyectoId)}&id=${esc(p.id)}">
      <div class="punto-card__thumb">${thumb}</div>
      <div class="punto-card__body">
        <div class="punto-card__name">${esc(p.nombre)}</div>
        <div class="punto-card__meta">${registros.length} registro${registros.length === 1 ? "" : "s"}${last ? " · " + esc(last.fecha) : ""}</div>
      </div>
    </a>`;
  }).join("");

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap">
      <p class="eyebrow">${esc(proyecto.nombre)}</p>
      <h1>Seguimiento visual</h1>
      <p class="lead">Organizado por punto/frente. Cada uno con su línea de tiempo de fotos y video.</p>
      ${puntos.length
        ? `<div class="punto-grid">${puntosHtml}</div>`
        : `<div class="empty">Todavía no hay ningún punto registrado.<br><br><a href="/app/registrar?proyecto=${esc(proyectoId)}">＋ Registrar el primero</a></div>`
      }
    </div>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Seguimiento visual", body)
  };
};
