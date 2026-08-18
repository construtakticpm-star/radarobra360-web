const { checkAuth } = require("./lib/auth");
const { getData, findProyecto } = require("./lib/store");
const { esc, shell, topbar } = require("./lib/ui");

exports.handler = async (event) => {
  const auth = checkAuth(event, "RadarObra360 — registrar");
  if (!auth.ok) return auth.response;

  const params = event.queryStringParameters || {};
  const proyectoId = params.proyecto;
  const data = await getData();
  const proyecto = findProyecto(data, proyectoId);

  if (!proyecto) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: shell("No encontrado", `${topbar()}<div class="wrap"><p>Proyecto no encontrado. <a href="/app">Volver</a></p></div>`)
    };
  }

  const puntosOptions = (proyecto.puntos || []).map(p => `<option value="${esc(p.nombre)}">`).join("");
  const today = new Date().toISOString().slice(0, 10);
  const puntoPrefill = params.punto || "";
  const usuarios = data.usuarios || [];
  const responsableOptions = usuarios.map(u => `<option value="${esc(u.id)}">${esc(u.nombre)}</option>`).join("");

  const body = `
    ${topbar(proyectoId, proyecto.nombre)}
    <div class="wrap wrap--narrow">
      <a class="back" href="/app?proyecto=${esc(proyectoId)}">← Volver</a>
      <div class="card">
        <p class="eyebrow">Nuevo registro</p>
        <h1>${puntoPrefill ? "Fotos y video" : "Registrar avance"}</h1>
        ${puntoPrefill
          ? `<p class="hint" style="margin-bottom:10px;">📍 Frente: <strong>${esc(puntoPrefill)}</strong></p>`
          : `<p class="hint" style="margin-bottom:10px;">Fotos y video quedan organizados por punto y fecha. Peso combinado máximo recomendado: ~3.5&nbsp;MB por registro (limitación técnica actual).</p>`}

        <form id="f">
          ${puntoPrefill
            ? `<input type="hidden" id="punto" value="${esc(puntoPrefill)}">`
            : `<label for="punto">Punto / frente</label>
          <input type="text" id="punto" list="puntos-list" required placeholder="Ej. Cimentación, Fachada Norte...">
          <datalist id="puntos-list">${puntosOptions}</datalist>
          <div class="hint">Si ya existe, se agrega ahí. Si es nuevo, se crea.</div>`}

          <label for="fecha">Fecha</label>
          <input type="date" id="fecha" value="${today}" required>

          <label for="nota">Nota (opcional)</label>
          <textarea id="nota" rows="2" placeholder="Ej. Avance de armado, incidencia detectada..."></textarea>

          <label for="estatus">Estatus</label>
          <select id="estatus">
            <option value="pendiente">Pendiente</option>
            <option value="en-proceso">En proceso</option>
            <option value="listo">Listo</option>
          </select>

          <label for="responsable">Responsable (opcional)</label>
          <select id="responsable">
            <option value="">— Sin asignar —</option>
            ${responsableOptions}
          </select>
          ${usuarios.length ? "" : `<div class="hint">Todavía no hay usuarios cargados. <a href="/app/usuarios" style="color:var(--cyan);">Agrégalos aquí</a>.</div>`}

          <label for="fotos">Fotos</label>
          <input type="file" id="fotos" accept="image/*" multiple>
          <div class="hint" id="fotos-hint"></div>

          <label for="video">Video (opcional, clip corto)</label>
          <input type="file" id="video" accept="video/*">
          <div class="hint" id="video-hint"></div>

          <button type="submit" class="btn btn--primary btn--block" id="submitBtn" style="margin-top:22px;">Guardar registro</button>
          <div class="status" id="status"></div>
        </form>
      </div>
    </div>

    <script>
      const PROYECTO_ID = ${JSON.stringify(proyectoId)};
      const form = document.getElementById('f');
      const fotosInput = document.getElementById('fotos');
      const videoInput = document.getElementById('video');
      const fotosHint = document.getElementById('fotos-hint');
      const videoHint = document.getElementById('video-hint');
      const statusEl = document.getElementById('status');
      const submitBtn = document.getElementById('submitBtn');
      const MAX_TOTAL = 3.5 * 1024 * 1024;

      function sumSize() {
        let total = 0;
        Array.from(fotosInput.files).forEach(f => total += f.size);
        if (videoInput.files[0]) total += videoInput.files[0].size;
        return total;
      }

      function updateHints() {
        const total = sumSize();
        const mb = (total / (1024*1024)).toFixed(2);
        const over = total > MAX_TOTAL;
        fotosHint.textContent = fotosInput.files.length + ' foto(s) seleccionadas';
        videoHint.textContent = videoInput.files[0] ? (videoInput.files[0].name + ' — ' + Math.round(videoInput.files[0].size/1024) + ' KB') : '';
        statusEl.className = 'status' + (over ? ' status--error' : '');
        statusEl.textContent = over ? ('Peso total ' + mb + ' MB — reduce fotos/video, el máximo es ~3.5 MB por registro.') : '';
        submitBtn.disabled = over;
      }
      fotosInput.addEventListener('change', updateHints);
      videoInput.addEventListener('change', updateHints);

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
        if (sumSize() > MAX_TOTAL) { updateHints(); return; }
        submitBtn.disabled = true;
        statusEl.className = 'status';
        statusEl.textContent = 'Guardando...';

        const payload = {
          proyectoId: PROYECTO_ID,
          punto: document.getElementById('punto').value,
          fecha: document.getElementById('fecha').value,
          nota: document.getElementById('nota').value,
          estatus: document.getElementById('estatus').value,
          responsableId: document.getElementById('responsable').value || null,
          fotos: [],
          video: null
        };

        for (const file of fotosInput.files) {
          payload.fotos.push({ base64: await fileToBase64(file), contentType: file.type });
        }
        if (videoInput.files[0]) {
          payload.video = { base64: await fileToBase64(videoInput.files[0]), contentType: videoInput.files[0].type };
        }

        try {
          const res = await fetch('/app/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((body.error || 'Error del servidor') + (body.debug ? ' — ' + body.debug : ''));
          statusEl.className = 'status status--ok';
          statusEl.textContent = '¡Guardado! Redirigiendo...';
          setTimeout(() => { window.location.href = '/app?proyecto=' + encodeURIComponent(PROYECTO_ID); }, 700);
        } catch (err) {
          statusEl.className = 'status status--error';
          statusEl.textContent = err.message || 'No se pudo guardar.';
          submitBtn.disabled = false;
        }
      });
    </script>
  `;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    body: shell(puntoPrefill ? "Fotos y video — " + puntoPrefill : "Registrar avance", body)
  };
};
