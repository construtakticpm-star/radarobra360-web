const { checkAuth } = require("./lib/auth");
const { getData, findProyecto } = require("./lib/store");
const { esc, shell, topbar, lightboxMarkup, lightboxScript } = require("./lib/ui");

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

  // ---------- No plano uploaded yet: show the upload form ----------
  if (!proyecto.plano) {
    const body = `
      ${topbar(proyectoId, proyecto.nombre)}
      <div class="wrap wrap--narrow">
        <p class="eyebrow">Plano de obra · ${esc(proyecto.nombre)}</p>
        <h1>Sube el plano o croquis</h1>
        <p class="lead">Una sola vez. Después colocas cada punto haciendo click directo sobre él.</p>
        <div class="card">
          <form id="f">
            <label for="imagen">Imagen del plano</label>
            <input type="file" id="imagen" accept="image/*" required>
            <div class="hint">Foto del plano, croquis escaneado o render — lo que tengas a mano.</div>
            <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:22px;">Subir plano</button>
            <div class="status" id="status"></div>
          </form>
        </div>
      </div>
      <script>
        const PROYECTO_ID = ${JSON.stringify(proyectoId)};
        const form = document.getElementById('f');
        const imagenInput = document.getElementById('imagen');
        const statusEl = document.getElementById('status');
        const submitBtn = document.getElementById('submitBtn');

        function fileToBase64(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const file = imagenInput.files[0];
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) {
            statusEl.className = 'status status--error';
            statusEl.textContent = 'La imagen pesa más de 4 MB — usa una más ligera.';
            return;
          }
          submitBtn.disabled = true;
          statusEl.className = 'status';
          statusEl.textContent = 'Subiendo...';
          try {
            const base64 = await fileToBase64(file);
            const res = await fetch('/app/plano-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proyectoId: PROYECTO_ID, base64, contentType: file.type })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
            window.location.href = '/app/plano?proyecto=' + encodeURIComponent(PROYECTO_ID);
          } catch (err) {
            statusEl.className = 'status status--error';
            statusEl.textContent = err.message || 'No se pudo subir.';
            submitBtn.disabled = false;
          }
        });
      </script>
    `;
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
      body: shell("Subir plano", body)
    };
  }

  // ---------- Plano exists: interactive map ----------
  // Un frente cuyo registro más reciente quedó en estatus "listo" se
  // considera cerrado y desaparece de esta vista (sigue existiendo, solo
  // ya no se muestra aquí — ver /app/punto para su historial completo).
  const puntos = (proyecto.puntos || []).filter(p => {
    const ultimo = p.registros && p.registros[0];
    return !ultimo || ultimo.estatus !== "listo";
  });
  const placed = puntos.filter(p => p.x != null && p.y != null);
  const unplaced = puntos.filter(p => p.x == null || p.y == null);
  const usuarios = data.usuarios || [];

  function estatusDe(p) {
    const ultimo = p.registros && p.registros[0];
    return (ultimo && ultimo.estatus) || "pendiente";
  }

  // Leyenda de responsable bajo el pin: solo cuando el frente está "en
  // proceso" (muestra el nombre) o no tiene responsable asignado (muestra
  // "Sin asignar"). Un frente "pendiente" con responsable ya asignado no
  // necesita leyenda todavía.
  function responsableLegend(p) {
    const ultimo = p.registros && p.registros[0];
    const est = (ultimo && ultimo.estatus) || "pendiente";
    const responsable = ultimo && ultimo.responsableId ? usuarios.find(u => u.id === ultimo.responsableId) : null;
    if (!responsable) return "Sin asignar";
    if (est === "en-proceso") return responsable.nombre;
    return null;
  }

  const pinsHtml = placed.map(p => {
    const legend = responsableLegend(p);
    return `
    <button type="button" class="pin pin--estatus-${esc(estatusDe(p))}" data-punto-id="${esc(p.id)}" style="left:${p.x}%; top:${p.y}%;" title="${esc(p.nombre)}">
      <span class="pin__dot"></span>
      <span class="pin__label">${esc(p.nombre)}</span>
      ${legend ? `<span class="pin__responsable">${esc(legend)}</span>` : ""}
    </button>`;
  }).join("");

  const unplacedOptionsHtml = unplaced.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join("");

  const unplacedListHtml = unplaced.length ? `
    <p class="eyebrow" style="margin-top:24px;">Sin ubicar todavía</p>
    <div class="unplaced-list">
      ${unplaced.map(p => `<div class="unplaced-item">${esc(p.nombre)} — <button type="button" class="linklike" data-punto-id="${esc(p.id)}">ver fotos</button></div>`).join("")}
    </div>` : "";

  // Full punto data (incl. registros/fotos/video ids) embedded so clicking a
  // pin renders instantly, no extra round trip to fetch each punto.
  // `<` is escaped to < so a nota/nombre containing "</script>" can't
  // break out of the <script> tag this gets embedded in below.
  const puntosDataJson = JSON.stringify(puntos.map(p => {
    const ultimo = p.registros && p.registros[0];
    return {
      id: p.id, nombre: p.nombre, registros: p.registros || [],
      estatusActual: (ultimo && ultimo.estatus) || "pendiente",
      responsableActualId: (ultimo && ultimo.responsableId) || null
    };
  })).replace(/</g, "\\u003c");
  const usuariosDataJson = JSON.stringify(usuarios).replace(/</g, "\\u003c");

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap wrap--wide">
      <p class="eyebrow">Visual de RadarObra360 · ${esc(proyecto.nombre)}</p>
      <h1>Visual de RadarObra360</h1>
      <p class="lead">Click en un pin para ver sus fotos y video sin salir del plano. Los frentes en estatus "Listo" se quitan de esta vista automáticamente.</p>

      <div class="plano-toolbar">
        <button class="btn btn--primary" id="placeBtn">📍 Colocar punto</button>
        <button type="button" class="btn btn--ghost" id="moveBtn" style="color:var(--navy); border-color:var(--border);">↔️ Mover punto</button>
        <button type="button" class="btn btn--ghost" id="deleteBtn" style="color:#b5453f; border-color:var(--border);">🗑️ Eliminar punto</button>
        <button type="button" class="btn btn--ghost" id="replaceBtn" style="color:var(--navy); border-color:var(--border);">🔄 Reemplazar plano</button>
        <span class="hint" id="placeHint"></span>
      </div>
      <input type="file" id="replaceInput" accept="image/*" style="display:none;">
      <div class="status" id="replaceStatus"></div>

      <div class="plano-layout">
        <div class="plano-stage-col">
          <div class="plano-stage" id="stage">
            <img src="/app/media?id=${esc(proyecto.plano.mediaId)}" alt="Plano de obra" id="planoImg">
            ${pinsHtml}
          </div>
          ${unplacedListHtml}
        </div>

        <div class="plano-detail" id="detailPanel">
          <div class="plano-detail__empty" id="detailEmpty">👈 Selecciona un punto en el plano para ver sus fotos y video aquí.</div>
          <div class="plano-detail__content" id="detailContent" style="display:none;">
            <div class="plano-detail__head">
              <h2 id="detailName"></h2>
              <div class="plano-detail__actions">
                <button type="button" class="btn btn--ghost btn--small" id="exportBtn" style="color:var(--navy); border-color:var(--border);">🖨️ Exportar</button>
                <button type="button" class="btn btn--ghost btn--small" id="shareBtn" style="color:var(--navy); border-color:var(--border);">📤 Compartir</button>
                <a id="detailAddLink" class="btn btn--primary btn--small" href="#">＋ Agregar aquí</a>
              </div>
            </div>
            <p class="plano-detail__responsable" id="detailResponsable"></p>

            <div id="detailRegistros"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="pin-picker" id="picker" style="display:none;">
      <div class="pin-picker__card">
        <h3>¿Qué punto va aquí?</h3>
        <label for="existente">Punto existente sin ubicar</label>
        <select id="existente">
          <option value="">— Elegir —</option>
          ${unplacedOptionsHtml}
        </select>
        <label for="nuevoNombre">O crear uno nuevo</label>
        <input type="text" id="nuevoNombre" placeholder="Ej. Fachada Poniente">
        <button class="btn btn--primary btn--block" id="confirmPin" style="margin-top:18px;">Colocar aquí</button>
        <button class="btn btn--ghost btn--block" id="cancelPin" style="margin-top:8px; color:var(--navy); border-color:var(--border);">Cancelar</button>
        <div class="status" id="pickerStatus"></div>
      </div>
    </div>

    ${lightboxMarkup()}

    <script>
      ${lightboxScript()}

      const PROYECTO_ID = ${JSON.stringify(proyectoId)};
      const PUNTOS_DATA = ${puntosDataJson};
      const USUARIOS_DATA = ${usuariosDataJson};
      const ESTATUS_LABELS = { pendiente: 'Pendiente', 'en-proceso': 'En proceso', listo: 'Listo' };

      const stage = document.getElementById('stage');
      const planoImg = document.getElementById('planoImg');
      const placeBtn = document.getElementById('placeBtn');
      const placeHint = document.getElementById('placeHint');
      const moveBtn = document.getElementById('moveBtn');
      const deleteBtn = document.getElementById('deleteBtn');
      const replaceBtn = document.getElementById('replaceBtn');
      const replaceInput = document.getElementById('replaceInput');
      const replaceStatus = document.getElementById('replaceStatus');
      const picker = document.getElementById('picker');
      const existente = document.getElementById('existente');
      const nuevoNombre = document.getElementById('nuevoNombre');
      const confirmPin = document.getElementById('confirmPin');
      const cancelPin = document.getElementById('cancelPin');
      const pickerStatus = document.getElementById('pickerStatus');

      const detailEmpty = document.getElementById('detailEmpty');
      const detailContent = document.getElementById('detailContent');
      const detailName = document.getElementById('detailName');
      const detailResponsable = document.getElementById('detailResponsable');
      const detailAddLink = document.getElementById('detailAddLink');
      const detailRegistros = document.getElementById('detailRegistros');
      const exportBtn = document.getElementById('exportBtn');
      const shareBtn = document.getElementById('shareBtn');
      let currentPuntoId = null;

      exportBtn.addEventListener('click', () => window.print());
      shareBtn.addEventListener('click', () => {
        const url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: document.title, url }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => alert('Link copiado al portapapeles.')).catch(() => prompt('Copia este link:', url));
        } else {
          prompt('Copia este link:', url);
        }
      });

      function escHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      }

      function mediaTag(id, isVideo) {
        const kind = isVideo ? 'video' : 'foto';
        const el = isVideo
          ? '<video controls preload="metadata" src="/app/media?id=' + id + '"></video>'
          : '<img src="/app/media?id=' + id + '" alt="Foto" class="lightbox-trigger" data-media-id="' + id + '">';
        return '<div class="media-item">' + el
          + '<button type="button" class="media-item__share" data-media-id="' + id + '" title="Compartir por WhatsApp">📲</button>'
          + '<button type="button" class="media-item__delete" data-media-id="' + id + '" title="Eliminar ' + kind + '">🗑️</button>'
          + '</div>';
      }

      function fileToBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      replaceBtn.addEventListener('click', () => {
        const ok = confirm('¿Reemplazar el plano actual por uno nuevo? Los puntos ya colocados se conservan, pero podrían no coincidir con la nueva imagen.');
        if (ok) replaceInput.click();
      });

      replaceInput.addEventListener('change', async () => {
        const file = replaceInput.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
          replaceStatus.className = 'status status--error';
          replaceStatus.textContent = 'La imagen pesa más de 4 MB — usa una más ligera.';
          replaceInput.value = '';
          return;
        }
        replaceBtn.disabled = true;
        replaceStatus.className = 'status';
        replaceStatus.textContent = 'Subiendo plano nuevo...';
        try {
          const base64 = await fileToBase64(file);
          const res = await fetch('/app/plano-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proyectoId: PROYECTO_ID, base64, contentType: file.type })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.reload();
        } catch (err) {
          replaceStatus.className = 'status status--error';
          replaceStatus.textContent = err.message || 'No se pudo reemplazar el plano.';
          replaceBtn.disabled = false;
          replaceInput.value = '';
        }
      });

      // ISO week (lunes-domingo, semana 1 = la que contiene el primer jueves del año).
      function isoWeekInfo(fechaStr) {
        const d = new Date(fechaStr + 'T00:00:00');
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(), 0, 4);
        const diff = (target - firstThursday) / 86400000;
        const week = 1 + Math.round(diff / 7);
        return { year: target.getFullYear(), week };
      }

      function groupByWeek(registros) {
        const map = new Map();
        registros.forEach(r => {
          const info = isoWeekInfo(r.fecha);
          const key = info.year + '-' + info.week;
          if (!map.has(key)) map.set(key, { key, year: info.year, week: info.week, registros: [] });
          map.get(key).registros.push(r);
        });
        return Array.from(map.values()).sort((a, b) => (a.year - b.year) || (a.week - b.week));
      }

      function fotosCount(registros) {
        return registros.reduce((sum, r) => sum + (r.fotos ? r.fotos.length : 0) + (r.video ? 1 : 0), 0);
      }

      function estatusOptionsHtml(selected) {
        return ['pendiente', 'en-proceso', 'listo'].map(v =>
          '<option value="' + v + '"' + (v === selected ? ' selected' : '') + '>' + ESTATUS_LABELS[v] + '</option>'
        ).join('');
      }

      function responsableOptionsHtml(selectedId) {
        return '<option value="">— Sin asignar —</option>' + USUARIOS_DATA.map(u =>
          '<option value="' + u.id + '"' + (u.id === selectedId ? ' selected' : '') + '>' + escHtml(u.nombre) + '</option>'
        ).join('');
      }

      function renderRegistros(registros, punto) {
        return registros.map(r => {
          const fotos = (r.fotos || []).map(id => mediaTag(id, false)).join('');
          const video = r.video ? mediaTag(r.video, true) : '';
          const estatus = r.estatus || 'pendiente';
          const responsable = r.responsableId ? USUARIOS_DATA.find(u => u.id === r.responsableId) : null;
          const fecha = escHtml(r.fecha);
          const nota = escHtml(r.nota || '');
          const registroIndex = punto.registros.indexOf(r);
          const registroId = r.id || '';
          const notifyBtn = estatus === 'listo'
            ? '<button type="button" class="btn btn--ghost btn--small registro__notify" data-whatsapp="' + (responsable ? escHtml(responsable.whatsapp) : '') + '" data-nombre="' + escHtml(punto.nombre) + '" data-fecha="' + fecha + '" style="color:var(--navy); border-color:var(--border);">📲 Notificar' + (responsable ? ' a ' + escHtml(responsable.nombre) : '') + '</button>'
            : '';
          const editForm = '<div class="registro__edit" style="display:none;">'
            + '<select class="registro__edit-estatus">' + estatusOptionsHtml(estatus) + '</select>'
            + '<select class="registro__edit-responsable">' + responsableOptionsHtml(r.responsableId || '') + '</select>'
            + '<button type="button" class="btn btn--primary btn--small registro__edit-save" data-punto-id="' + escHtml(punto.id) + '" data-registro-id="' + escHtml(registroId) + '" data-registro-index="' + registroIndex + '">Guardar</button>'
            + '<button type="button" class="btn btn--ghost btn--small registro__edit-cancel" style="color:var(--navy); border-color:var(--border);">Cancelar</button>'
            + '<span class="status registro__edit-status"></span>'
            + '</div>';
          return '<div class="registro">'
            + '<div class="registro__head"><span class="registro__fecha">' + fecha + '</span>'
            + '<span class="registro__estatus registro__estatus--' + estatus + '">' + (ESTATUS_LABELS[estatus] || estatus) + '</span>'
            + (responsable ? '<span class="registro__responsable">👤 ' + escHtml(responsable.nombre) + '</span>' : '')
            + '<button type="button" class="linklike registro__edit-toggle" title="Cambiar estatus/responsable de este registro">✏️</button>'
            + '</div>'
            + editForm
            + (nota ? '<p class="registro__nota">' + nota + '</p>' : '')
            + '<div class="registro__media">' + fotos + video + '</div>'
            + notifyBtn
            + '</div>';
        }).join('');
      }

      let selectedWeekKey = null;

      function renderDetail(puntoId) {
        const punto = PUNTOS_DATA.find(p => p.id === puntoId);
        if (!punto) return;

        currentPuntoId = puntoId;

        if (window.history && window.history.replaceState) {
          const url = '/app/plano?proyecto=' + encodeURIComponent(PROYECTO_ID) + '&punto=' + encodeURIComponent(puntoId);
          window.history.replaceState(null, '', url);
        }

        document.querySelectorAll('.pin').forEach(p => p.classList.toggle('pin--active', p.dataset.puntoId === puntoId));

        detailEmpty.style.display = 'none';
        detailContent.style.display = 'block';
        detailName.textContent = punto.nombre;
        detailAddLink.href = '/app/registrar?proyecto=' + encodeURIComponent(PROYECTO_ID) + '&punto=' + encodeURIComponent(punto.nombre);

        const responsableActual = punto.responsableActualId ? USUARIOS_DATA.find(u => u.id === punto.responsableActualId) : null;
        detailResponsable.textContent = responsableActual ? '👤 ' + responsableActual.nombre : 'Abierto';

        if (!punto.registros.length) {
          detailRegistros.innerHTML = '<div class="empty">Sin registros todavía. <a href="' + detailAddLink.href + '" style="color:var(--cyan);">Agregar el primero</a></div>';
          return;
        }

        const weeks = groupByWeek(punto.registros);
        selectedWeekKey = weeks[weeks.length - 1].key;

        function paintWeek() {
          const current = weeks.find(w => w.key === selectedWeekKey);
          const barsHtml = '<div class="week-bars">' + weeks.map(w => {
            const active = w.key === selectedWeekKey ? ' week-bar--active' : '';
            return '<button type="button" class="week-bar' + active + '" data-week-key="' + w.key + '">'
              + '<span class="week-bar__label">Sem ' + w.week + '</span>'
              + '<span class="week-bar__count">' + fotosCount(w.registros) + ' 📷</span>'
              + '</button>';
          }).join('') + '</div>';

          detailRegistros.innerHTML = barsHtml + '<div id="weekRegistros">' + renderRegistros(current.registros, punto) + '</div>';

          detailRegistros.querySelectorAll('.week-bar').forEach(btn => {
            btn.addEventListener('click', () => {
              selectedWeekKey = btn.dataset.weekKey;
              paintWeek();
            });
          });

          attachLightbox(detailRegistros);

          detailRegistros.querySelectorAll('.media-item__delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const mediaId = btn.dataset.mediaId;
              if (!confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return;
              btn.disabled = true;
              try {
                const res = await fetch('/app/media-delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ proyectoId: PROYECTO_ID, puntoId: punto.id, mediaId })
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
                punto.registros.forEach(r => {
                  if (r.fotos) r.fotos = r.fotos.filter(fid => fid !== mediaId);
                  if (r.video === mediaId) r.video = null;
                });
                paintWeek();
              } catch (err) {
                alert(err.message || 'No se pudo eliminar.');
                btn.disabled = false;
              }
            });
          });

          detailRegistros.querySelectorAll('.media-item__share').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const url = window.location.origin + '/app/media?id=' + btn.dataset.mediaId;
              const texto = 'Foto de ' + punto.nombre + ': ' + url;
              window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
            });
          });

          detailRegistros.querySelectorAll('.registro__notify').forEach(btn => {
            btn.addEventListener('click', () => {
              const numero = (btn.dataset.whatsapp || '').replace(/[^0-9]/g, '');
              const texto = btn.dataset.nombre + ' — ' + btn.dataset.fecha + ' quedó en estatus Listo. ' + window.location.href;
              const base = numero ? 'https://wa.me/' + numero : 'https://wa.me/';
              window.open(base + '?text=' + encodeURIComponent(texto), '_blank');
            });
          });

          detailRegistros.querySelectorAll('.registro__edit-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
              const form = btn.closest('.registro').querySelector('.registro__edit');
              form.style.display = form.style.display === 'none' ? 'flex' : 'none';
            });
          });

          detailRegistros.querySelectorAll('.registro__edit-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
              btn.closest('.registro__edit').style.display = 'none';
            });
          });

          detailRegistros.querySelectorAll('.registro__edit-save').forEach(btn => {
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
                    puntoId: btn.dataset.puntoId,
                    registroId: btn.dataset.registroId || null,
                    registroIndex: Number(btn.dataset.registroIndex),
                    estatus,
                    responsableId
                  })
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
                window.location.href = '/app/plano?proyecto=' + encodeURIComponent(PROYECTO_ID) + '&punto=' + encodeURIComponent(punto.id);
              } catch (err) {
                statusEl.className = 'status status--error registro__edit-status';
                statusEl.textContent = err.message || 'No se pudo guardar.';
                btn.disabled = false;
              }
            });
          });
        }
        paintWeek();
      }

      document.querySelectorAll('[data-punto-id].linklike').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          renderDetail(el.dataset.puntoId);
        });
      });

      let placing = false;
      let pendingCoords = null;
      let moving = false;
      let movingPuntoId = null;
      let removing = false;

      function exitMoveMode() {
        moving = false;
        movingPuntoId = null;
        stage.classList.remove('moving');
        document.querySelectorAll('.pin').forEach(p => p.classList.remove('pin--moving'));
      }

      function exitPlaceMode() {
        placing = false;
        stage.classList.remove('placing');
      }

      function exitRemoveMode() {
        removing = false;
        stage.classList.remove('removing');
      }

      placeBtn.addEventListener('click', () => {
        exitMoveMode();
        exitRemoveMode();
        placing = !placing;
        stage.classList.toggle('placing', placing);
        placeHint.textContent = placing ? 'Ahora haz click sobre el plano.' : '';
      });

      moveBtn.addEventListener('click', () => {
        exitPlaceMode();
        exitRemoveMode();
        moving = !moving;
        movingPuntoId = null;
        stage.classList.toggle('moving', moving);
        document.querySelectorAll('.pin').forEach(p => p.classList.remove('pin--moving'));
        placeHint.textContent = moving ? 'Modo mover: haz click en el punto que quieres reubicar.' : '';
      });

      deleteBtn.addEventListener('click', () => {
        exitPlaceMode();
        exitMoveMode();
        removing = !removing;
        stage.classList.toggle('removing', removing);
        placeHint.textContent = removing ? 'Modo eliminar: haz click en el pin que quieres quitar del mapa.' : '';
      });

      document.querySelectorAll('.pin').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation();

          if (removing) {
            const puntoId = el.dataset.puntoId;
            const nombre = el.title || puntoId;
            const ok = confirm('¿Quitar "' + nombre + '" del plano? Sus fotos y registros se conservan — vuelve a la lista de "sin ubicar" y puedes colocarlo de nuevo cuando quieras.');
            if (!ok) return;
            placeHint.textContent = 'Quitando del mapa...';
            try {
              const res = await fetch('/app/plano-unpin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proyectoId: PROYECTO_ID, puntoId })
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
              window.location.reload();
            } catch (err) {
              placeHint.textContent = err.message || 'No se pudo quitar el punto.';
            }
            return;
          }

          if (moving) {
            if (movingPuntoId === el.dataset.puntoId) {
              movingPuntoId = null;
              el.classList.remove('pin--moving');
              placeHint.textContent = 'Modo mover: haz click en el punto que quieres reubicar.';
              return;
            }
            movingPuntoId = el.dataset.puntoId;
            document.querySelectorAll('.pin').forEach(p => p.classList.toggle('pin--moving', p.dataset.puntoId === movingPuntoId));
            placeHint.textContent = 'Ahora haz click en la nueva posición sobre el plano.';
            return;
          }
          renderDetail(el.dataset.puntoId);
        });
      });

      stage.addEventListener('click', async (e) => {
        if (moving && movingPuntoId) {
          const rect = planoImg.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          const puntoId = movingPuntoId;
          const pinEl = document.querySelector('.pin[data-punto-id="' + puntoId + '"]');
          placeHint.textContent = 'Guardando nueva posición...';
          try {
            const res = await fetch('/app/plano-pin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proyectoId: PROYECTO_ID, puntoId, x, y })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
            if (pinEl) {
              pinEl.style.left = x + '%';
              pinEl.style.top = y + '%';
            }
            placeHint.textContent = '';
          } catch (err) {
            placeHint.textContent = err.message || 'No se pudo mover el punto.';
          }
          exitMoveMode();
          return;
        }

        if (!placing) return;
        const rect = planoImg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        pendingCoords = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
        picker.style.display = 'flex';
        exitPlaceMode();
        placeHint.textContent = '';
      });

      cancelPin.addEventListener('click', () => {
        picker.style.display = 'none';
        pendingCoords = null;
        existente.value = '';
        nuevoNombre.value = '';
        pickerStatus.textContent = '';
      });

      confirmPin.addEventListener('click', async () => {
        if (!pendingCoords) return;
        const puntoId = existente.value;
        const nombre = nuevoNombre.value.trim();
        if (!puntoId && !nombre) {
          pickerStatus.className = 'status status--error';
          pickerStatus.textContent = 'Elige un punto existente o escribe uno nuevo.';
          return;
        }
        confirmPin.disabled = true;
        pickerStatus.className = 'status';
        pickerStatus.textContent = 'Guardando...';
        try {
          const res = await fetch('/app/plano-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proyectoId: PROYECTO_ID, puntoId: puntoId || null, nombre: nombre || null, x: pendingCoords.x, y: pendingCoords.y })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.href = '/app/plano?proyecto=' + encodeURIComponent(PROYECTO_ID);
        } catch (err) {
          pickerStatus.className = 'status status--error';
          pickerStatus.textContent = err.message || 'No se pudo guardar.';
          confirmPin.disabled = false;
        }
      });

      const initialPunto = new URLSearchParams(window.location.search).get('punto');
      if (initialPunto && PUNTOS_DATA.find(p => p.id === initialPunto)) {
        renderDetail(initialPunto);
      }
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Visual de RadarObra360", body)
  };
};
