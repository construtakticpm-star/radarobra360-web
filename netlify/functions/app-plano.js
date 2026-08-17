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
    <a class="pin" href="/app/punto?id=${esc(p.id)}" style="left:${p.x}%; top:${p.y}%;" title="${esc(p.nombre)}">
      <span class="pin__dot"></span>
      <span class="pin__label">${esc(p.nombre)}</span>
    </a>`).join("");

  const unplacedOptionsHtml = unplaced.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join("");

  const unplacedListHtml = unplaced.length ? `
    <p class="eyebrow" style="margin-top:32px;">Sin ubicar todavía</p>
    <div class="unplaced-list">
      ${unplaced.map(p => `<div class="unplaced-item">${esc(p.nombre)} — <a href="/app/punto?id=${esc(p.id)}" style="color:var(--cyan);">ver</a></div>`).join("")}
    </div>` : "";

  const body = `
    ${topbar()}
    <div class="wrap">
      <p class="eyebrow">Plano de obra</p>
      <h1>Plano interactivo</h1>
      <p class="lead">Click en "Colocar punto", luego click en el plano donde corresponda.</p>

      <div class="plano-toolbar">
        <button class="btn btn--primary" id="placeBtn">📍 Colocar punto</button>
        <span class="hint" id="placeHint"></span>
      </div>

      <div class="plano-stage" id="stage">
        <img src="/app/media?id=${esc(data.plano.mediaId)}" alt="Plano de obra" id="planoImg">
        ${pinsHtml}
      </div>

      ${unplacedListHtml}
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
