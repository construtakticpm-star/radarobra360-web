const { checkAuth } = require("./lib/auth");
const { findProyectoForEmpresa, empresaUsuarios } = require("./lib/store");
const { esc, shell, topbar, lightboxMarkup, lightboxScript } = require("./lib/ui");

const ESTATUS_LABELS = { pendiente: "Pendiente", "en-proceso": "En proceso", listo: "Listo" };

function estatusOptionsHtml(selected) {
  return Object.keys(ESTATUS_LABELS).map(v =>
    `<option value="${v}"${v === selected ? " selected" : ""}>${ESTATUS_LABELS[v]}</option>`
  ).join("");
}

function responsableOptionsHtml(usuarios, selectedId) {
  return `<option value="">— Sin asignar —</option>` + usuarios.map(u =>
    `<option value="${esc(u.id)}"${u.id === selectedId ? " selected" : ""}>${esc(u.nombre)}</option>`
  ).join("");
}

function renderMedia(reg) {
  const fotos = (reg.fotos || [])
    .map(id => `
      <div class="media-item">
        <img src="/app/media?id=${esc(id)}" alt="Foto" class="lightbox-trigger" data-media-id="${esc(id)}">
        <button type="button" class="media-item__share" data-media-id="${esc(id)}" title="Compartir por WhatsApp">📲</button>
        <button type="button" class="media-item__delete" data-media-id="${esc(id)}" title="Eliminar foto">🗑️</button>
      </div>`)
    .join("");
  const video = reg.video
    ? `
      <div class="media-item">
        <video controls preload="metadata" src="/app/media?id=${esc(reg.video)}"></video>
        <button type="button" class="media-item__share" data-media-id="${esc(reg.video)}" title="Compartir por WhatsApp">📲</button>
        <button type="button" class="media-item__delete" data-media-id="${esc(reg.video)}" title="Eliminar video">🗑️</button>
      </div>`
    : "";
  return fotos + video;
}

exports.handler = async (event) => {
  const auth = await checkAuth(event, { redirect: true });
  if (!auth.ok) return auth.response;
  const data = auth.data;

  const params = event.queryStringParameters || {};
  const proyectoId = params.proyecto;
  const proyecto = findProyectoForEmpresa(data, proyectoId, auth.empresaId);

  if (!proyecto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Proyecto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  const punto = (proyecto.puntos || []).find(p => p.id === params.id);

  if (!punto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar(proyectoId, proyecto.nombre)}<div class="wrap"><p>Punto no encontrado. <a href="/app?proyecto=${esc(proyectoId)}">Volver</a></p></div>`)
    };
  }

  const usuarios = empresaUsuarios(data, auth.empresaId);
  const registros = punto.registros || [];
  const registrosHtml = registros.length
    ? registros.map((r, idx) => {
        const estatus = r.estatus || "pendiente";
        const responsable = r.responsableId ? usuarios.find(u => u.id === r.responsableId) : null;
        const notifyBtn = estatus === "listo"
          ? `<button type="button" class="btn btn--ghost btn--small registro__notify" data-whatsapp="${responsable ? esc(responsable.whatsapp) : ""}" data-nombre="${esc(punto.nombre)}" data-fecha="${esc(r.fecha)}" style="color:var(--navy); border-color:var(--border);">📲 Notificar${responsable ? " a " + esc(responsable.nombre) : ""}</button>`
          : "";
        return `
      <div class="registro">
        <div class="registro__head">
          <span class="registro__fecha">${esc(r.fecha)}</span>
          <span class="registro__estatus registro__estatus--${estatus}">${esc(ESTATUS_LABELS[estatus] || estatus)}</span>
          ${responsable ? `<span class="registro__responsable">👤 ${esc(responsable.nombre)}</span>` : ""}
          <button type="button" class="linklike registro__edit-toggle" title="Cambiar estatus/responsable de este registro">✏️</button>
        </div>
        <div class="registro__edit" style="display:none;">
          <select class="registro__edit-estatus">${estatusOptionsHtml(estatus)}</select>
          <select class="registro__edit-responsable">${responsableOptionsHtml(usuarios, r.responsableId || "")}</select>
          <button type="button" class="btn btn--primary btn--small registro__edit-save" data-registro-id="${esc(r.id || "")}" data-registro-index="${idx}">Guardar</button>
          <button type="button" class="btn btn--ghost btn--small registro__edit-cancel" style="color:var(--navy); border-color:var(--border);">Cancelar</button>
          <span class="status registro__edit-status"></span>
        </div>
        ${r.nota ? `<p class="registro__nota">${esc(r.nota)}</p>` : ""}
        <div class="registro__media">${renderMedia(r)}</div>
        ${notifyBtn}
      </div>`;
      }).join("")
    : `<div class="empty">Sin registros todavía en este punto.</div>`;

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap">
      <div class="page-actions">
        <a class="back" href="/app?proyecto=${esc(proyectoId)}">← Todos los puntos</a>
        <div class="page-actions__right">
          <button type="button" class="btn btn--ghost btn--small" id="exportBtn" style="color:var(--navy); border-color:var(--border);">🖨️ Exportar</button>
          <button type="button" class="btn btn--ghost btn--small" id="shareBtn" style="color:var(--navy); border-color:var(--border);">📤 Compartir</button>
        </div>
      </div>
      <p class="eyebrow">Línea de tiempo</p>
      <h1>${esc(punto.nombre)}</h1>
      <p class="lead">${registros.length} registro${registros.length === 1 ? "" : "s"}, del más reciente al más antiguo.</p>
      ${registrosHtml}
    </div>
    ${lightboxMarkup()}
    <script>
      ${lightboxScript()}
      attachLightbox(document);

      const PROYECTO_ID = ${JSON.stringify(proyectoId)};
      const PUNTO_ID = ${JSON.stringify(punto.id)};

      document.getElementById('exportBtn').addEventListener('click', () => window.print());
      document.getElementById('shareBtn').addEventListener('click', () => {
        const url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: document.title, url }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => alert('Link copiado al portapapeles.')).catch(() => prompt('Copia este link:', url));
        } else {
          prompt('Copia este link:', url);
        }
      });

      document.querySelectorAll('.media-item__delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const mediaId = btn.dataset.mediaId;
          if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return;
          btn.disabled = true;
          try {
            const res = await fetch('/app/media-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proyectoId: PROYECTO_ID, puntoId: PUNTO_ID, mediaId })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
            btn.closest('.media-item').remove();
          } catch (err) {
            alert(err.message || 'No se pudo eliminar.');
            btn.disabled = false;
          }
        });
      });

      document.querySelectorAll('.media-item__share').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = window.location.origin + '/app/media?id=' + btn.dataset.mediaId;
          const texto = 'Foto de ' + document.title + ': ' + url;
          window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
        });
      });

      document.querySelectorAll('.registro__notify').forEach(btn => {
        btn.addEventListener('click', () => {
          const numero = (btn.dataset.whatsapp || '').replace(/[^0-9]/g, '');
          const texto = btn.dataset.nombre + ' — ' + btn.dataset.fecha + ' quedó en estatus Listo. ' + window.location.href;
          const base = numero ? 'https://wa.me/' + numero : 'https://wa.me/';
          window.open(base + '?text=' + encodeURIComponent(texto), '_blank');
        });
      });

      document.querySelectorAll('.registro__edit-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const form = btn.closest('.registro').querySelector('.registro__edit');
          form.style.display = form.style.display === 'none' ? 'flex' : 'none';
        });
      });

      document.querySelectorAll('.registro__edit-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.registro__edit').style.display = 'none';
        });
      });

      document.querySelectorAll('.registro__edit-save').forEach(btn => {
        btn.addEventListener('click', async () => {
          const form = btn.closest('.registro__edit');
          const statusEl = form.querySelector('.registro__edit-status');
          const estatus = form.querySelector('.registro__edit-estatus').value;
          const responsableId = form.querySelector('.registro__edit-responsable').value || null;
          btn.disabled = true;
          statusEl.className = 'status registro__edit-status';
          statusEl.textContent = 'Guardando...';
          try {
            const res = await fetch('/app/registro-editar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proyectoId: PROYECTO_ID,
                puntoId: PUNTO_ID,
                registroId: btn.dataset.registroId || null,
                registroIndex: Number(btn.dataset.registroIndex),
                estatus,
                responsableId
              })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
            window.location.reload();
          } catch (err) {
            statusEl.className = 'status status--error registro__edit-status';
            statusEl.textContent = err.message || 'No se pudo guardar.';
            btn.disabled = false;
          }
        });
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell(punto.nombre, body)
  };
};
