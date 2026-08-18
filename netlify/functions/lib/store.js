const { getStore } = require("@netlify/blobs");

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
  return { proyectos: [], usuarios: [] };
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
        // Backfill usuarios[] for data saved before this field existed.
        if (!Array.isArray(existing.usuarios)) {
          existing.usuarios = [];
          await saveData(existing);
        }
        return existing;
      }
      // Legacy single-project shape { puntos, plano } -> wrap as the first
      // proyecto so nothing already uploaded gets lost when multi-proyecto
      // support rolls out.
      const migrated = {
        proyectos: [{
          id: "obra-1",
          nombre: "Obra 1",
          puntos: existing.puntos || [],
          plano: existing.plano || null
        }],
        usuarios: []
      };
      await saveData(migrated);
      return migrated;
    }
  } catch (e) {
    // Degrade to an empty board instead of crashing the page.
  }
  return emptyData();
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

async function saveMedia(id, base64, contentType) {
  const store = mediaStore();
  const buffer = Buffer.from(base64, "base64");
  await store.set(id, buffer, { metadata: { contentType } });
}

async function getMedia(id) {
  const store = mediaStore();
  const entry = await store.getWithMetadata(id, { type: "arrayBuffer" });
  if (!entry) return null;
  return {
    buffer: Buffer.from(entry.data),
    contentType: (entry.metadata && entry.metadata.contentType) || "application/octet-stream"
  };
}

async function deleteMedia(id) {
  const store = mediaStore();
  await store.delete(id);
}

module.exports = { getData, saveData, saveMedia, getMedia, deleteMedia, findProyecto, findUsuario, slugify };
