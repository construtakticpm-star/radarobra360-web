const { checkAuth } = require("./lib/auth");
const { getData } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = checkAuth(event);
  if (!auth.ok) return auth.response;

  const data = await getData();

  // ---------- No plano uploaded yet: show the upload form ----------
  if (!data.plano) {
    const body = `
      ${topbar()}
      <div class="wrap wrap--narrow">
        <p class="eyebrow">Plano de obra</p>
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
              body: JSON.stringify({ base64, contentType: file.type })
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
            window.location.href = '/app/plano';
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
  const placed = data.puntos.filter(p => p.x != null && p.y != null);
  const unplaced = data.puntos.filter(p => p.x == null || p.y == null);

  const pinsHtml = placed.map(p => `
    <button type="button" class="pin" data-punto-id="${esc(p.id)}" style="left:${p.x}%; top:${p.y}%;" title="${esc(p.nombre)}">
      <span class="pin__dot"></span>
      <span class="pin__label">${esc(p.nombre)}</span>
    </button>`).join("");

  const unplacedOptionsHtml = unplaced.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join("");

  const unplacedListHtml = unplaced.length ? `
    <p class="eyebrow" style="margin-top:24px;">Sin ubicar todavía</p>
    <div class="unplaced-list">
      ${unplaced.map(p => `<div class="unplaced-item">${esc(p.nombre)} — <button type="button" class="linklike" data-punto-id="${esc(p.id)}">ver fotos</button></div>`).join("")}
    </div>` : "";

  // Full punto data (incl. registros/fotos/video ids) embedded so clicking a
  // pin renders instantly, no extra round trip to fetch each punto.
  const puntosDataJson = JSON.stringify(data.puntos.map(p => ({
    id: p.id, nombre: p.nombre, registros: p.registros || []
  })));

  const body = `
    ${topbar()}
    <div class="wrap wrap--wide">
      <p class="eyebrow">Plano de obra</p>
      <h1>Plano + fotos</h1>
      <p class="lead">Click en un pin para ver sus fotos y video sin salir del plano. "Colocar punto" para agregar uno nuevo.</p>

      <div class="plano-toolbar">
        <button class="btn btn--primary" id="placeBtn">📍 Colocar punto</button>
        <span class="hint" id="placeHint"></span>
      </div>

      <div class="plano-layout">
        <div class="plano-stage-col">
          <div class="plano-stage" id="stage">
            <img src="/app/media?id=${esc(data.plano.mediaId)}" alt="Plano de obra" id="planoImg">
            ${pinsHtml}
          </div>
          ${unplacedListHtml}
        </div>

        <div class="plano-detail" id="detailPanel">
          <div class="plano-detail__empty" id="detailEmpty">👈 Selecciona un punto en el plano para ver sus fotos y video aquí.</div>
          <div class="plano-detail__content" id="detailContent" style="display:none;">
            <div class="plano-detail__head">
              <h2 id="detailName"></h2>
              <a id="detailAddLink" class="btn btn--primary btn--small" href="#">＋ Agregar aquí</a>
            </div>
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

    <script>
      const PUNTOS_DATA = ${puntosDataJson};

      const stage = document.getElementById('stage');
      const planoImg = document.getElementById('planoImg');
      const placeBtn = document.getElementById('placeBtn');
      const placeHint = document.getElementById('placeHint');
      const picker = document.getElementById('picker');
      const existente = document.getElementById('existente');
      const nuevoNombre = document.getElementById('nuevoNombre');
      const confirmPin = document.getElementById('confirmPin');
      const cancelPin = document.getElementById('cancelPin');
      const pickerStatus = document.getElementById('pickerStatus');

      const detailEmpty = document.getElementById('detailEmpty');
      const detailContent = document.getElementById('detailContent');
      const detailName = document.getElementById('detailName');
      const detailAddLink = document.getElementById('detailAddLink');
      const detailRegistros = document.getElementById('detailRegistros');

      function mediaTag(id, isVideo) {
        return isVideo
          ? '<video controls preload="metadata" src="/app/media?id=' + id + '"></video>'
          : '<img src="/app/media?id=' + id + '" alt="Foto">';
      }

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

      function renderRegistros(registros) {
        return registros.map(r => {
          const fotos = (r.fotos || []).map(id => mediaTag(id, false)).join('');
          const video = r.video ? mediaTag(r.video, true) : '';
          return '<div class="registro">'
            + '<div class="registro__head"><span class="registro__fecha">' + r.fecha + '</span></div>'
            + (r.nota ? '<p class="registro__nota">' + r.nota + '</p>' : '')
            + '<div class="registro__media">' + fotos + video + '</div>'
            + '</div>';
        }).join('');
      }

      let selectedWeekKey = null;

      function renderDetail(puntoId) {
        const punto = PUNTOS_DATA.find(p => p.id === puntoId);
        if (!punto) return;

        document.querySelectorAll('.pin').forEach(p => p.classList.toggle('pin--active', p.dataset.puntoId === puntoId));

        detailEmpty.style.display = 'none';
        detailContent.style.display = 'block';
        detailName.textContent = punto.nombre;
        detailAddLink.href = '/app/registrar?punto=' + encodeURIComponent(punto.nombre);

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

          detailRegistros.innerHTML = barsHtml + '<div id="weekRegistros">' + renderRegistros(current.registros) + '</div>';

          detailRegistros.querySelectorAll('.week-bar').forEach(btn => {
            btn.addEventListener('click', () => {
              selectedWeekKey = btn.dataset.weekKey;
              paintWeek();
            });
          });
        }
        paintWeek();
      }

      document.querySelectorAll('.pin, [data-punto-id].linklike').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          renderDetail(el.dataset.puntoId);
        });
      });

      let placing = false;
      let pendingCoords = null;

      placeBtn.addEventListener('click', () => {
        placing = !placing;
        stage.classList.toggle('placing', placing);
        placeHint.textContent = placing ? 'Ahora haz click sobre el plano.' : '';
      });

      stage.addEventListener('click', (e) => {
        if (!placing) return;
        const rect = planoImg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        pendingCoords = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
        picker.style.display = 'flex';
        placing = false;
        stage.classList.remove('placing');
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
            body: JSON.stringify({ puntoId: puntoId || null, nombre: nombre || null, x: pendingCoords.x, y: pendingCoords.y })
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          window.location.href = '/app/plano';
        } catch (err) {
          pickerStatus.className = 'status status--error';
          pickerStatus.textContent = err.message || 'No se pudo guardar.';
          confirmPin.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell("Plano interactivo", body)
  };
};
