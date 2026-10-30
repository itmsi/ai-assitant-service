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

// ============================================================
// SINONYM_MAP — Entity Inggris → sinonim Indonesia
// Dipakai agar model mengenali istilah bahasa Indonesia yang
// dipakai user (kandidat, wawancara, penawaran, dll).
// ============================================================
const SINONYM_MAP = {
  candidate: ['kandidat', 'calon karyawan'],
  interview: ['wawancara'],
  background_check: ['pemeriksaan latar belakang'],
  on_board_doc: ['dokumen onboarding'],
  schedule_interview: ['jadwal wawancara'],
  note: ['catatan'],
  employee: ['karyawan'],
  company: ['perusahaan'],
  department: ['departemen', 'divisi'],
  title: ['jabatan', 'posisi'],
  group: ['grup'],
  system: ['sistem', 'aplikasi'],
  menu: ['menu'],
  quotation: ['penawaran'],
  quote: ['penawaran'],
  customer: ['pelanggan', 'konsumen'],
  product: ['produk', 'barang'],
  vendor: ['pemasok', 'supplier'],
  supplier: ['pemasok'],
  subsidiary: ['anak perusahaan'],
  reference: ['referensi'],
  location: ['lokasi'],
  classes: ['kelas'],
  terms: ['ketentuan', 'syarat'],
  item: ['barang'],
  accessory: ['aksesori'],
  bank_account: ['rekening bank'],
  term_content: ['syarat dan ketentuan'],
  daily_task_activity: ['tugas harian'],
  work_order: ['perintah kerja'],
  transaction: ['transaksi'],
  project: ['proyek'],
  territory: ['wilayah'],
  island: ['pulau'],
  zone: ['zona'],
  segmentation: ['segmentasi'],
  survey: ['survei'],
  contractor: ['kontraktor'],
  rkab: ['RKAB'],
  hauling_price: ['harga pengangkutan'],
  unit_purchase: ['pembelian unit'],
  dashboard: ['dashboard'],
  category: ['kategori'],
  ecatalog: ['e-katalog'],
  attach_file: ['lampiran'],
  master_category: ['kategori master'],
  master_item: ['item master'],
  item_category: ['kategori item'],
  type_category: ['kategori tipe'],
  parts_catalog: ['katalog suku cadang'],
  dokumen: ['dokumen'],
  status: ['status'],
  sales_order: ['pesanan penjualan'],
  purchase_order: ['pesanan pembelian'],
  invoice: ['faktur'],
  roe: ['ROE'],
  po_status: ['status PO'],
  item_type: ['tipe item'],
  iup: ['IUP'],
  area: ['area'],
  brand: ['merek'],
  sales: ['sales', 'penjual'],
  term: ['ketentuan'],
  list_compare: ['daftar perbandingan'],
};

// Prefix CRUD pada nama tool yang di-strip saat ekstrak entity
const CRUD_PREFIXES = ['create_', 'update_', 'delete_', 'search_', 'get_', 'calculate_', 'sync_', 'list_', 'view_'];

/**
 * Ekstrak token entity dari nama tool
 * create_hr_candidate → ['hr', 'candidate'] → normalize plural → ['hr', 'candidate']
 */
const extractTokens = (toolName) => {
  if (!toolName || typeof toolName !== 'string') return [];
  let name = toolName;
  for (const p of CRUD_PREFIXES) {
    if (name.startsWith(p)) {
      name = name.slice(p.length);
      break;
    }
  }
  return name
    .split('_')
    .map((t) => t.replace(/s$/, '')) // normalisasi plural: candidates → candidate
    .filter((t) => t.length > 1);
};

/**
 * Tambahkan sinonim Indonesia ke description tool (idempotent)
 * Contoh: "Membuat Candidate HRM." → "Membuat Candidate HRM. (Kandidat, Calon karyawan)"
 */
const enrichToolDescription = (tool) => {
  if (!tool || typeof tool.description !== 'string') return;

  const desc = tool.description;
  const add = new Set();

  // 1. Dari token nama tool (create_hr_candidate → candidate)
  for (const token of extractTokens(tool.name)) {
    const syns = SINONYM_MAP[token];
    if (!syns) continue;
    for (const s of syns) {
      if (!desc.toLowerCase().includes(s.toLowerCase())) add.add(s);
    }
  }

  // 2. Dari description (untuk entity yang tidak muncul di nama tool)
  for (const [en, syns] of Object.entries(SINONYM_MAP)) {
    if (!new RegExp(`\\b${en}\\b`, 'i').test(desc)) continue;
    for (const s of syns) {
      if (!desc.toLowerCase().includes(s.toLowerCase())) add.add(s);
    }
  }

  if (add.size > 0) {
    tool.description = `${desc} (${[...add].join(', ')})`;
  }
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
 * - Field descriptions (parameter)
 * - Description tool (sinonim bahasa Indonesia)
 * @param {Array|Object} tools - Array of tool objects, atau object registry { name: tool }
 */
const enrichAllTools = (tools) => {
  if (Array.isArray(tools)) {
    tools.forEach((t) => {
      enrichToolFields(t);
      enrichToolDescription(t);
    });
  } else if (tools && typeof tools === 'object') {
    Object.values(tools).forEach((t) => {
      enrichToolFields(t);
      enrichToolDescription(t);
    });
  }
};

module.exports = {
  enrichField,
  enrichToolFields,
  enrichAllTools,
  enrichToolDescription,
  humanize,
  isReferenceField,
  SINONYM_MAP,
};
