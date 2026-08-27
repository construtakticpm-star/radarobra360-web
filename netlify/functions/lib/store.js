const { getStore } = require("@netlify/blobs");
const { hashPassword } = require("./session");

const DATA_KEY = "data";

// Zero-config getStore(name) needs Netlify to auto-inject a Blobs context,
// which didn't happen on the sibling construtaktic-web site — go straight
// to explicit config this time instead of hitting the same wall twice.
// SITE_ID is auto-provided by Netlify on every function invocation.
// NETLIFY_BLOBS_TOKEN is a Personal Access Token set as an env var (the
// same one already created for construtaktic-web can be reused here).
function storeOpts(name) {
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (!siteID || !token) {
    throw new Error("Netlify Blobs no configurado: falta SITE_ID o NETLIFY_BLOBS_TOKEN.");
  }
  return { name, siteID, token };
}

function dataStore() {
  return getStore(storeOpts("radarobra-data"));
}

function mediaStore() {
  return getStore(storeOpts("radarobra-media"));
}

function emptyData() {
  return { empresas: [], proyectos: [], usuarios: [], sugerencias: [], eventos: [] };
}

// Empresa "puente" a la que se migra todo lo que ya existía antes del
// modelo multiempresa, para que nada desaparezca ni se rompa el login que
// ya estaba en uso. Usa las credenciales RADAROBRA_USER/PASS que ya
// existían como variables de entorno, así que el acceso actual sigue
// funcionando igual tras la migración.
function legacyEmpresa() {
  const usuario = process.env.RADAROBRA_USER || "construtaktic";
  const pass = process.env.RADAROBRA_PASS || null;
  return {
    id: "construtaktic",
    nombre: "CONSTRUTAKTIC",
    usuario,
    passwordHash: pass ? hashPassword(pass) : null,
    activo: true,
    creadoEn: new Date().toISOString()
  };
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || Math.random().toString(36).slice(2, 10);
}

async function getData() {
  try {
    const store = dataStore();
    const existing = await store.get(DATA_KEY, { type: "json" });
    if (existing) {
      if (Array.isArray(existing.proyectos)) {
        // Backfill fields saved before this app version existed.
        let changed = false;
        if (!Array.isArray(existing.usuarios)) { existing.usuarios = []; changed = true; }
        if (!Array.isArray(existing.sugerencias)) { existing.sugerencias = []; changed = true; }
        if (!Array.isArray(existing.eventos)) { existing.eventos = []; changed = true; }
        if (!Array.isArray(existing.empresas)) {
          // Primera vez que corre el modelo multiempresa: todo lo que ya
          // existía se migra a una empresa "puente" con las credenciales
          // que ya estaban en uso (RADAROBRA_USER/PASS), para que el
          // acceso actual no se rompa.
          const empresa = legacyEmpresa();
          existing.empresas = [empresa];
          existing.proyectos.forEach(p => { if (!p.empresaId) p.empresaId = empresa.id; });
          existing.usuarios.forEach(u => { if (!u.empresaId) u.empresaId = empresa.id; });
          existing.sugerencias.forEach(s => { if (!s.empresaId) s.empresaId = empresa.id; });
          changed = true;
        }
        if (changed) await saveData(existing);
        return existing;
      }
      // Legacy single-project shape { puntos, plano } -> wrap as the first
      // proyecto so nothing already uploaded gets lost when multi-proyecto
      // support rolls out.
      const empresa = legacyEmpresa();
      const migrated = {
        empresas: [empresa],
        proyectos: [{
          id: "obra-1",
          nombre: "Obra 1",
          empresaId: empresa.id,
          puntos: existing.puntos || [],
          plano: existing.plano || null
        }],
        usuarios: [],
        sugerencias: [],
        eventos: []
      };
      await saveData(migrated);
      return migrated;
    }
  } catch (e) {
    // Degrade to an empty board instead of crashing the page.
    return emptyData();
  }
  // Store realmente vacío (primer arranque del sitio): siembra la empresa
  // "puente" de una vez para que el login ya funcione desde el inicio.
  const empresa = legacyEmpresa();
  const seeded = { empresas: [empresa], proyectos: [], usuarios: [], sugerencias: [], eventos: [] };
  try { await saveData(seeded); } catch (e) { /* se reintentará en la siguiente carga */ }
  return seeded;
}

async function saveData(data) {
  const store = dataStore();
  await store.setJSON(DATA_KEY, data);
}

function findProyecto(data, proyectoId) {
  return (data.proyectos || []).find(p => p.id === proyectoId);
}

function findUsuario(data, usuarioId) {
  return (data.usuarios || []).find(u => u.id === usuarioId);
}

function findEmpresa(data, empresaId) {
  return (data.empresas || []).find(e => e.id === empresaId);
}

function findEmpresaByUsuario(data, usuario) {
  return (data.empresas || []).find(e => e.usuario === usuario);
}

// Lookups "con dueño": además de encontrar el registro, verifican que
// pertenezca a la empresa dada. Se usan en TODAS las funciones que reciben
// un proyectoId/usuarioId desde el cliente, para que una empresa nunca
// pueda leer ni tocar los datos de otra aunque adivine o reutilice un id.
function findProyectoForEmpresa(data, proyectoId, empresaId) {
  const p = findProyecto(data, proyectoId);
  return (p && p.empresaId === empresaId) ? p : null;
}

function findUsuarioForEmpresa(data, usuarioId, empresaId) {
  const u = findUsuario(data, usuarioId);
  return (u && u.empresaId === empresaId) ? u : null;
}

function empresaProyectos(data, empresaId) {
  return (data.proyectos || []).filter(p => p.empresaId === empresaId);
}

function empresaUsuarios(data, empresaId) {
  return (data.usuarios || []).filter(u => u.empresaId === empresaId);
}

function empresaSugerencias(data, empresaId) {
  return (data.sugerencias || []).filter(s => s.empresaId === empresaId);
}

async function saveMedia(id, base64, contentType, empresaId) {
  const store = mediaStore();
  const buffer = Buffer.from(base64, "base64");
  await store.set(id, buffer, { metadata: { contentType, empresaId } });
}

async function getMedia(id) {
  const store = mediaStore();
  const entry = await store.getWithMetadata(id, { type: "arrayBuffer" });
  if (!entry) return null;
  return {
    buffer: Buffer.from(entry.data),
    contentType: (entry.metadata && entry.metadata.contentType) || "application/octet-stream",
    empresaId: entry.metadata && entry.metadata.empresaId
  };
}

async function deleteMedia(id) {
  const store = mediaStore();
  await store.delete(id);
}

module.exports = {
  getData, saveData, saveMedia, getMedia, deleteMedia, slugify,
  findProyecto, findUsuario, findEmpresa, findEmpresaByUsuario,
  findProyectoForEmpresa, findUsuarioForEmpresa,
  empresaProyectos, empresaUsuarios, empresaSugerencias
};
