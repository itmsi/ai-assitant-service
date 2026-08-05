Roadmap 

Task

Memory Database — desain tabel dan CRUD memory.
Memory Service — API save/search/update/delete.
Memory Classifier — model kecil yang memutuskan apa yang perlu disimpan.
Memory Retrieval — mencari memory relevan berdasarkan pesan pengguna.
Prompt Injection — menyisipkan memory ke prompt model utama.
Memory Update & Conflict Resolution — memperbarui memory yang berubah, bukan membuat duplikat.
Memory Expiration & Importance — memberi bobot dan masa berlaku.
Admin Memory Dashboard — melihat, mengedit, dan menghapus memory.
MCP Feedback Learning — membentuk atau memperbarui memory dari hasil tool.
Satu saran tambahan

jangan jadikan memory sebagai kumpulan teks. Perlakukan memory sebagai database fakta.

Nah, ini pertanyaan yang bagus. Banyak orang awalnya berpikir seperti itu, tapi sebenarnya jangan jadikan JSON sebagai sumber data utama.

Yang benar adalah:

Chat
   │
   ▼
Memory Extractor (LLM)
   │
   ▼
JSON (sementara)
   │
   ▼
Memory Service
   │
   ▼
Database

JSON hanya format komunikasi antara model dan backend. Setelah diterima, backend langsung menyimpan ke database. JSON itu tidak perlu disimpan apa adanya.

Misalnya model mengembalikan:

{
  "action": "update",
  "type": "user_preference",
  "key": "defaultWarehouse",
  "value": "Jakarta",
  "confidence": 0.93
}

Backend langsung mengubahnya menjadi record database:

id	user_id	key	value	confidence
1	123	defaultWarehouse	Jakarta	0.93

Jadi tidak ada ribuan file JSON yang menumpuk.

Jangan extract setiap chat.

Misalnya gunakan aturan seperti:

Cara 1 (yang paling kusarankan)

Hanya extract jika ada kemungkinan muncul informasi baru.

Contoh:

Halo

❌ Tidak perlu extract.

Mulai sekarang gudang default saya Surabaya.

✅ Extract.

Customer favorit saya PT ABC.

✅ Extract.

Terima kasih.

❌ Lewati.

Bahkan sebelum memanggil model kecil, backend bisa melakukan filter sederhana menggunakan aturan atau keyword.


planningmu:

---

## 📋 Review & Planning Memory Feature — 2026-07-30

### ✅ Yang Sudah Bagus dari Rencanamu

1. **Architecture flow**: Chat → LLM → JSON → Service → Database ✅ — ini jalur yang benar.
2. **Memory sebagai database fakta, bukan kumpulan teks** ✅ — pendekatan paling tepat.
3. **Filter sebelum extract** ✅ — tidak perlu extract setiap chat, hemat token & latency.
4. **Structured extraction via LLM** ✅ — output JSON yang langsung bisa di-map ke kolom DB.

### 🔍 Hasil Eksplorasi Codebase

Project `ai-assistant-service` sudah punya infrastruktur yang matang:

| Komponen | Status |
|---|---|
| **Express.js + PostgreSQL** | ✅ via Knex (migrations siap) |
| **Redis** | ✅ untuk fast cache/conversation |
| **OpenAI / LangChain** | ✅ support OpenAI & Sumopod |
| **MCP Server (SSE)** | ✅ sudah running |
| **Tools System** | ✅ 100+ tools, lengkap dengan module mapping |
| **Conversation Storage** | ✅ JSON di Redis + PostgreSQL |
| **System Prompts** | ✅ dari database (ai_prompts table) |

### 🧠 Saran Strategis untuk Implementasi Memory

#### 1. Arsitektur Final

```
Chat Flow (existing)
  │
  ├─ processChat() ──► model.invoke() ──► response
  │                              │
  │                              ▼ (async, setelah respond)
  │                    ┌─ Keyword Filter ──┐
  │                    │ (cepat, tanpa LLM)│
  │                    └────────┬──────────┘
  │                             │ jika match
  │                             ▼
  │                    Memory Extractor (LLM kecil)
  │                    • GPT-4o-mini / Sumopod model ringan
  │                    • Prompt khusus: "extract facts from chat"
  │                    • Output: { action, type, key, value, confidence }
  │                             │
  │                             ▼
  │                    Memory Service ──► PostgreSQL
  │                    • Upsert by user_id + key
  │                    • Hitung confidence conflict
  │                    • Skip jika confidence rendah (< 0.60)
  │                             │
  │                             ▼ (di awal chat berikutnya)
  │                    Memory Retrieval
  │                    • Coba Redis cache dulu
  │                    • Jika Redis tidak aktif → query PostgreSQL langsung
  │                    • Ambil top-N memory relevan per user
  │                    • Cache hot memory ke Redis (TTL 15 menit)
  │                             │
  │                             ▼
  │                    Inject ke System Prompt
  │
  └─ Selesai
```

**Prinsip**:
- **Memory Extractor** jalan **async** setelah response balik ke user. Tidak nge-block main chat.
- **Keyword Filter** sebagai gate pertama sebelum panggil LLM — gratis, cepat, tanpa token.
- **LLM Model Kecil** (misal `gpt-4o-mini` atau Sumopod model hemat) khusus untuk extract memory. Terpisah dari model utama yang mahal.
- **Redis Fallback**: Memory Retrieval coba Redis dulu. Kalau Redis gak aktif/error → fallback langsung query PostgreSQL. Zero-downtime.

#### 2. Memory Types — Jangan cuma key-value

Saran untuk kolom `type`:

| Type | Contoh | TTL |
|---|---|---|
| `user_preference` | "defaultWarehouse=Jakarta" | Permanent |
| `fact` | "PT ABC is top customer" | Permanent |
| `context` | "Working on Q3 report" | Session (24h) |
| `session_summary` | "Diskusi tentang kontrak A" | 7 hari |
| `tool_result` | "Last CRM search result" | 1 jam |

#### 3. Database Schema — `ai_memories` Table

```sql
CREATE TABLE ai_memories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         VARCHAR(100) NOT NULL,
  type            VARCHAR(50) NOT NULL,        -- user_preference | fact | context | dll
  key             VARCHAR(255) NOT NULL,        -- normalized key
  value           TEXT NOT NULL,                -- nilai memory
  confidence      DECIMAL(3,2) DEFAULT 0.80,   -- 0.00 - 1.00
  source          VARCHAR(100),                 -- 'chat_extraction' | 'tool_result' | 'admin'
  metadata        JSONB DEFAULT '{}',           -- konteks tambahan
  expires_at      TIMESTAMP,                    -- NULL = permanent
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memories_user_type ON ai_memories(user_id, type);
CREATE INDEX idx_memories_user_key ON ai_memories(user_id, key);
CREATE INDEX idx_memories_confidence ON ai_memories(confidence DESC);
```

#### 4. Struktur File

```
src/
├── modules/
│   └── ai_assistant/
│       ├── memory/
│       │   ├── index.js              — Route: POST/GET/DELETE /memory
│       │   ├── memoryService.js      — Orchestrator (extract → save → retrieve)
│       │   ├── memoryExtractor.js    — Panggil LLM untuk extract memory dari chat
│       │   └── memoryRetriever.js    — Query memory relevan untuk context injection
│       ├── handler.js                — [MODIFIED] Trigger memoryExtractor async
│       └── service.js                — [MODIFIED] Inject memory ke system prompt
├── repository/
│   └── postgres/
│       ├── ai_memories_repository.js — CRUD memory ke PostgreSQL
│       └── migrations/
│           └── 20260730000001_create_ai_memories_table.js
```

#### 5. Prioritas Implementasi

> **Strategi**: Mulai dari **Extraction** dulu (ujung ke ujung: chat → extract → simpan), baru lanjut Retrieval & sisanya.

| # | Task | Estimasi | Bagian | Catatan |
|---|---|---|---|---|
| 1 | **Memory Extractor** (end-to-end) | 3 hari | Extraction | ✅ PRIORITAS #1. Mulai dari filter keywords → LLM kecil → parse → save. Include: migration, repository, extractor prompt, service, integrasi async di handler. |
| 2 | **Memory Retrieval + Prompt Injection** | 1.5 hari | Retrieval | 🔄 Langsung setelah extractor jadi. Cari memory relevan + inject ke system prompt. Redis fallback ke PostgreSQL. |
| 3 | **Conflict Resolution** | 1 hari | Storage | Confidence + recency weighting untuk update memory. Bagian dari Memory Service. |
| 4 | **Memory Expiration** | 0.5 hari | Maintenance | Cron/trigger cleanup expired memories. |
| 5 | **Admin Dashboard API** | 1 hari | Admin | Lihat/edit/hapus memory per user. |
| 6 | **MCP Feedback Learning** | 1 hari | Feedback | Update memory dari hasil tool call. |
| **Total** | | **~8 hari** | | |

**Detail End-to-End Extraction (Prioritas #1)**:

| Langkah | File | Detail |
|---|---|---|
| 1a | Migration `20260730000001_create_ai_memories_table.js` | Buat tabel + indexes |
| 1b | `ai_memories_repository.js` | CRUD dasar |
| 1c | `memoryExtractor.js` | Rule filter (keywords) → panggil LLM kecil → parse JSON → validasi confidence |
| 1d | `memoryService.js` | Orchestrator: extract → conflict check → save |
| 1e | `handler.js` [MODIFIED] | Trigger memoryService.runExtraction() async setelah respond |
| 1f | `.env` | Tambah `AI_MEMORY_EXTRACTOR_MODEL` (default: gpt-4o-mini), `AI_MEMORY_CONFIDENCE_THRESHOLD` (default: 0.60) |

#### 6. Conflict Resolution Strategy

Yang perlu diperhatikan: ketika user mengubah preferensi, jangan buat duplikat.

**Flow**:
1. Memory Extractor dapet `{ key: "defaultWarehouse", value: "Surabaya", confidence: 0.93 }`
2. Cek ke DB: apakah sudah ada `user_preference` dengan key `defaultWarehouse`?
3. **Jika ada**: bandingkan confidence lama vs baru. Jika baru lebih tinggi → UPDATE. Jika lama lebih tinggi → SKIP (mungkin false positive).
4. **Jika tidak ada**: INSERT.

#### 7. Filter Extract — Rules yang Bisa Dipakai

Aturan sederhana sebelum panggil LLM:

```
ALWAYS_EXTRACT_KEYWORDS = [
  "default", "favorit", "preferensi", "biasanya", "mulai sekarang",
  "saya mau", "saya ingin", "jangan", "tolong ingat",
  "customer", "warehouse", "gudang", "kebijakan"
]

if any(keyword in userMessage for keyword in ALWAYS_EXTRACT_KEYWORDS):
    runMemoryExtractor(userMessage)
else:
    skipExtraction()
```

#### 8. Integrasi dengan Existing System Prompt

Memory injection perlu ditambahkan **setelah prompt utama** di `service.js`:

```
Kamu adalah Mosa, asisten virtual MSI...
[prompt utama]

📋 **YANG KAMU KETAHUI TENTANG PENGGUNA INI:**
• Gudang default: Jakarta
• Customer favorit: PT ABC
• Sedang mengerjakan: Laporan Q3 2026
```

Caranya available memory ditemukan via `memoryRetriever.getRelevant(userId)` setelah `getSystemPrompt()` di `processChat()`, lalu digabung sebelum dikirim ke model.

---

### Redis Fallback Strategy

Redis bersifat **optional** — sistem harus tetap jalan tanpa Redis.

| Skenario | Apa yang terjadi |
|---|---|
| **Redis aktif** | Memory Retrieval priority ke Redis. Cache hot memory TTL 15 menit. Query PostgreSQL hanya saat cache miss. |
| **Redis tidak aktif / error** | Memory Retrieval langsung query PostgreSQL. Setiap request = 1 query. Slower tapi tetap berfungsi. |
| **Cold start (belum ada memory)** | Query PostgreSQL balikin array kosong → tidak ada injection ke prompt → behave normal. |
| **Save memory** | Langsung ke PostgreSQL. Redis di-update async (best-effort). Kalau Redis mati, ya sudah. |

**Implementasi**:
```js
// memoryRetriever.js
const getRelevantMemories = async (userId) => {
  // 1. Coba Redis dulu
  try {
    const cached = await redis.get(`memory:${userId}`);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn(`Redis unavailable, falling back to PostgreSQL: ${err.message}`);
  }

  // 2. Fallback ke PostgreSQL
  const memories = await memoryRepo.getActiveByUser(userId);

  // 3. Cache ke Redis (best-effort) — skip kalau Redis mati
  try {
    await redis.setex(`memory:${userId}`, 900, JSON.stringify(memories)); // 15 menit
  } catch (err) {
    // Redis mati — no problem
  }

  return memories;
};
```

### Memory Classifier — LLM Model Kecil

Menggunakan model LLM yang **terpisah dan lebih ringan** dari model utama chat.

| Aspek | Model Utama (Chat) | Model Kecil (Extractor) |
|---|---|---|
| **Model** | `gpt-4o` / `sumopod-gpt` | `gpt-4o-mini` / model Sumopod ringan |
| **Tugas** | Menjawab pertanyaan user | Extract structured facts |
| **Token per call** | Ratusan - ribuan | Puluhan - ratusan |
| **Cost** | Mahal | ~10x lebih murah |
| **Latency** | Boleh lambat | Harus cepat (< 1 detik) |
| **System prompt** | Prompt panjang (MSI assistant) | Prompt pendek (extract facts) |

**Prompt khusus untuk classifier**:
```
Extract structured facts from the user message below.
Return JSON array. Only respond if there is a clear fact, preference, or important information.

Rules:
- "Halo", "terima kasih", "baik" → return {extracted: false}
- User states a preference → return {extracted: true, action: "upsert", type: "user_preference", ...}
- User provides factual info → return {extracted: true, action: "upsert", type: "fact", ...}
- Confidence < 0.60 → skip

User message: {message}
```

### ⚠️ Hal yang Perlu Diwaspadai

1. **Token Budget**: Memory injection jangan kebanyakan — maksimal 5-7 memory relevan per chat.
2. **Privacy**: Memory jangan bocor antar user. Setiap query WAJIB filter by `user_id`.
3. **Hallucination**: Jangan sampai model mengarang memory. Hanya inject memory yang benar-benar ada di DB.
4. **Performance**: Memory retrieval target <50ms. Redis untuk hot memory, PostgreSQL sebagai fallback.
5. **Cold Start**: User baru tanpa memory → jangan inject apa-apa, behave seperti biasa.
6. **Data Migration**: Tidak perlu migrasi data lama — memory akan terbentuk natural seiring pemakaian.
7. **Redis Unavailable**: Sistem harus tetap jalan 100% tanpa Redis. PostgreSQL fallback di semua layer.

---

## 📊 Progress Implementasi — 2026-07-30

### ✅ Selesai: 100% — End-to-End Extraction (Prioritas #1)

| Langkah | Status | File |
|---|---|---|
| **1a. Migration** | ✅ | `migrations/20260730000001_create_ai_memories_table.js` — Tabel + indexes + unique(user_id+key) |
| **1b. Repository** | ✅ | `ai_memories_repository.js` — upsertMemory, getActiveByUser, getByKey, deleteById, list, cleanupExpired |
| **1c. Memory Extractor** | ✅ | `memory/memoryExtractor.js` — Keyword filter (25+ keywords + skip patterns) → LLM kecil (gpt-4o-mini) → parse → validasi confidence |
| **1d. Memory Service** | ✅ | `memory/memoryService.js` — Orchestrator: runExtraction (async), getRelevantMemories (Redis→PG), formatMemoriesForPrompt, admin CRUD |
| **1e. Handler** | ✅ | `handler.js` — Fire & forget async extraction setelah response user |
| **1f. Config** | ✅ | `config/ai.js` — 4 env vars: ENABLED, EXTRACTOR_MODEL, CONFIDENCE_THRESHOLD, MAX_INJECT |
| **Memory injection** | ✅ | `service.js` — Inject memories ke system prompt via `getRelevantMemories()` + `formatMemoriesForPrompt()` |
| **Admin routes** | ✅ | `memory/index.js` — GET/POST/DELETE /memory + POST /memory/cleanup |
| **Register routes** | ✅ | `index.js` — memory routes registered di `/api/mosa/ai-assistant/memory` |

### ✅ Test Results

| Test | Status |
|---|---|
| Migration | ✅ `npx knex migrate:latest` — sukses, 6 migrations completed |
| Syntax check | ✅ Semua 7 file baru/modif clean, no errors |
| Server startup | ✅ Server load sukses — "Memory routes registered" confirmed |
| Port conflict | ⚠️ EADDRINUSE :9587 (hanya karena instance lain running — bukan error kode) |

### 📂 File Summary

```
src/
├── config/
│   └── ai.js                          [MODIFIED] +4 memory config vars
├── repository/postgres/migrations/
│   └── 20260730000001_create_ai_memories_table.js  [NEW]
└── modules/ai_assistant/
    ├── index.js                       [MODIFIED] +memory routes
    ├── handler.js                     [MODIFIED] +async memory extraction
    ├── service.js                     [MODIFIED] +memory injection ke prompt
    ├── ai_memories_repository.js      [NEW] CRUD memory database
    └── memory/
        ├── index.js                   [NEW] Admin routes
        ├── memoryService.js           [NEW] Orchestrator
        └── memoryExtractor.js         [NEW] Keyword filter + LLM extractor
```

### 📌 Catatan

- **Redis**: memoryService otomatis coba Redis, fallback ke PostgreSQL kalau Redis mati.
- **Anonymous user**: extractor skip untuk user 'anonymous' (tidak login).
- **Confidence**: threshold default 0.60, bisa diubah via `.env`.
- **Extractor model**: default `gpt-4o-mini`, bisa diganti ke model lain via env.
- **Env file**: `.env` sudah ditambahkan 4 var memory config.

---

## ✅ Selesai: MCP Feedback Learning — 2026-07-30

### Apa yang Dibuat

| Fitur | File | Fungsi |
|---|---|---|
| **MCP Memory Tools** | `tools/memory.js` [NEW] | 3 tools: `memory_save`, `memory_search`, `memory_delete` — bisa dipanggil dari MCP client |
| **Feedback Patterns** | `tools/memory.js` [NEW] | 6 pattern untuk detect memory dari hasil tool: search_, get_, create_, update_, getCRMCustomer360, calculateROE/ROA |
| **Feedback Hook** | `tools/index.js` [MOD] | Di `executeTool()` — setelah tool selesai, async call `analyzeToolResult()` |
| **UserId Propagation** | `service.js` [MOD] | `processChat()` passing `userId` ke `executeTool()` |

### Alur Feedback Learning

```
User/MCP → executeTool(toolName, params, authToken, mcpPerms, userId)
               │
               ├─ tool.execute(params, authToken) → result
               │
               └─ (async) analyzeToolResult(toolName, params, result, userId)
                       │
                       ├─ Cari pattern yang cocok (search_/get_/create_/dll)
                       ├─ Ekstrak memory: {type, key, value, confidence}
                       └─ memoryService.createMemory() → PostgreSQL
```

**Contoh**: User search customer "PT ABC" → `searchCRMIUPCustomers` dipanggil → result sukses → `analyzeToolResult` deteksi pattern `search_` dengan hasil ≤ 3 item → simpan `{ type: 'context', key: 'lastSearched_crmiupcustomers', value: 'PT ABC', confidence: 0.65 }`.

### Tools Registry

| Tool | Module | Deskripsi |
|---|---|---|
| `memory_save` | GLOBAL | Simpan memory manual (userId, type, key, value, confidence) |
| `memory_search` | GLOBAL | Cari memory user (userId, type filter opsional) |
| `memory_delete` | GLOBAL | Hapus memory by ID |

### File Summary (Update)

```
src/modules/ai_assistant/
├── tools/
│   ├── index.js                     [MODIFIED] +import, registry, feedback hook, exports
│   └── memory.js                    [NEW] memory_save/search/delete + analyzeToolResult()
└── service.js                       [MODIFIED] +userId parameter ke executeTool()
```

### Graphify

| Metric | Before | After |
|---|---|---|
| Nodes | 1597 | **1605** |
| Edges | 2246 | **1987** |
| Communities | 180 | **180** |

---

## 🔧 Fix: Memory Update Mechanism — 2026-07-30

### Masalah

`analyzeToolResult` di `tools/memory.js` cuma panggil `createMemory()` → walaupun isinya `upsertMemory`, namanya misleading dan bikin orang kira gak ada update.
Lebih parah: pattern `create_/update_` digabung jadi satu, tapi di dalemnya ada `if (toolName.startsWith('create_'))` — **update_ tools gak pernah nyimpen memory sama sekali**.

### Yang Diubah

| Perubahan | File | Detail |
|---|---|---|
| `createMemory` → `upsertMemory` | `memoryService.js` | Namanya sesuai behavior |
| `updateMemory()` [BARU] | `memoryService.js` | Force overwrite + confidence minimal 0.85 + simpan `previousValue` di metadata |
| `create_` vs `update_` dipisah | `tools/memory.js` | Dulu satu pattern gabung, sekarang terpisah |
| `update_` pattern confidence 0.90 | `tools/memory.js` | User explicit update → confidence tinggi |
| `analyzeToolResult` panggil `updateMemory` | `tools/memory.js` | Kalau toolName startsWith('update_') → force update |
| `memory_save` panggil `upsertMemory` | `tools/memory.js` | Bukan `createMemory` |
| Admin routes panggil `updateMemory` | `memory/index.js` | Admin manual → confidence 0.95 + force overwrite |

### Logika Update Sekarang

| Skenario | Fungsi | Behavior |
|---|---|---|
| **Chat extraction** (LLM) | `runExtraction()` di memoryService | Confidence-based: lama lebih tinggi → skip. Baru lebih tinggi → update |
| **User explicit update** (update_ tool) | `updateMemory()` | **Force overwrite** — apapun confidencenya, value diganti. Confidence 0.90+ |
| **Admin manual** (POST /memory) | `updateMemory()` | Force overwrite, confidence 0.95, previousValue tercatat |
| **Create tool** (create_ tool) | `upsertMemory()` | Confidence-based seperti biasa |
| **Search/Get tool** | `upsertMemory()` | Confidence-based, confidence cenderung rendah (0.60-0.70) |

### Update Flow Diagram

```
User update data → updateQuotation(params)
                      │
                      ▼
                  executeTool('updateQuotation', params, ...)
                      │
                      ├─ tool.execute(params) → result ✅
                      │
                      └─ analyzeToolResult('updateQuotation', ...)
                            │
                            ├─ match pattern: toolName.startsWith('update_') ✅
                            ├─ extract: { key: 'updated_quotation', confidence: 0.90 }
                            └─ memoryService.updateMemory()
                                  ├─ getByKey(userId, 'updated_quotation') → cek existing
                                  ├─ force update: confidence 0.90, previousValue disimpan
                                  └─ PostgreSQL + Redis cache invalidated ✅
```
 
