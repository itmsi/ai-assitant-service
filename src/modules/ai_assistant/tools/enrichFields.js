/**
 * Enrich Field Descriptions
 *
 * Utility untuk otomatis melengkapi description field pada tool parameters.
 * Masalah: 56% field tool tidak punya description → AI menampilkan nama field
 * mentah (candidate_name) dan tidak tahu field *_id butuh master data.
 *
 * Solusi: setelah semua tools diregistrasi, loop tiap parameter dan:
 * 1. Field *_id tanpa description → auto-description referensi master data
 * 2. Field lain tanpa description → label humanized (candidate_name → "Candidate Name")
 * 3. Field dengan enum tanpa description → tambahkan daftar pilihan
 * 4. Field required → tandai [WAJIB]
 *
 * Idempotent: hanya mengisi yang description-nya kosong, tidak merusak
 * description yang sudah ditulis manual.
 */

/**
 * Humanize snake_case key → "Candidate Name"
 */
const humanize = (key) => {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

/**
 * Deteksi apakah field butuh master data (biasanya *_id)
 */
const isReferenceField = (key) => {
  return key.endsWith('_id');
};

/**
 * Enrich satu field schema
 * @param {string} key - Nama field
 * @param {Object} schema - Schema field (di-mutate langsung)
 * @param {boolean} isRequired - Apakah field wajib
 */
const enrichField = (key, schema, isRequired) => {
  if (!schema || typeof schema !== 'object') return;

  // ── 1. Auto-description ──
  if (!schema.description) {
    if (isReferenceField(key)) {
      const entity = humanize(key.replace(/_id$/, ''));
      schema.description = `ID ${entity} — pilih dari data master. Cari dulu via tool search, lalu isi ID-nya.`;
    } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      schema.description = `Pilihan: ${schema.enum.join(', ')}`;
    } else {
      schema.description = humanize(key);
    }
  }

  // ── 2. Tandai required (hanya kalau belum ada label WAJIB) ──
  if (isRequired && schema.description && !schema.description.includes('[WAJIB]')) {
    schema.description = `${schema.description} [WAJIB]`;
  }
};

/**
 * Enrich semua field dalam satu tool
 * @param {Object} tool - Tool object (parameters akan di-mutate)
 */
const enrichToolFields = (tool) => {
  if (!tool || !tool.parameters || !tool.parameters.properties) return;

  const { properties, required } = tool.parameters;
  const requiredSet = new Set(Array.isArray(required) ? required : []);

  for (const [key, schema] of Object.entries(properties)) {
    enrichField(key, schema, requiredSet.has(key));
  }
};

/**
 * Enrich semua tools sekaligus
 * @param {Array|Object} tools - Array of tool objects, atau object registry { name: tool }
 */
const enrichAllTools = (tools) => {
  if (Array.isArray(tools)) {
    tools.forEach(enrichToolFields);
  } else if (tools && typeof tools === 'object') {
    Object.values(tools).forEach(enrichToolFields);
  }
};

module.exports = {
  enrichField,
  enrichToolFields,
  enrichAllTools,
  humanize,
  isReferenceField,
};
