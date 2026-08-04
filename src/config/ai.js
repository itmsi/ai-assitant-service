module.exports = {
  // AI Model Configuration
  AI_ENABLED: process.env.AI_ENABLED === 'true',
  AI_MODEL_PROVIDER: process.env.AI_MODEL_PROVIDER || 'openai', // 'openai', 'sumopod', atau 'ollama'
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.85'),
  OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || ''),

  // Sumopod Configuration
  SUMOPOD_API_KEY: process.env.SUMOPOD_API_KEY || '',
  SUMOPOD_BASE_URL: process.env.SUMOPOD_BASE_URL || '',
  SUMOPOD_MODEL: process.env.SUMOPOD_MODEL || process.env.OPENAI_MODEL || 'sumopod-gpt',
  SUMOPOD_TEMPERATURE: parseFloat(process.env.SUMOPOD_TEMPERATURE || process.env.OPENAI_TEMPERATURE || '0.85'),
  SUMOPOD_MAX_TOKENS: parseInt(process.env.SUMOPOD_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || '16000'),

  // API Gateway Configuration
  API_GATEWAY_BASE_URL: process.env.API_GATEWAY_BASE_URL || '',
  API_GATEWAY_TIMEOUT: parseInt(process.env.API_GATEWAY_TIMEOUT || '30000'),
  
  // Ollama Configuration (for local models)
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3',
  
  // AI Assistant Settings
  AI_MAX_CONVERSATION_HISTORY: parseInt(process.env.AI_MAX_CONVERSATION_HISTORY || '10'),
  AI_ENABLE_FUNCTION_CALLING: process.env.AI_ENABLE_FUNCTION_CALLING !== 'false',
  AI_ALLOW_WRITE_ACTIONS: process.env.AI_ALLOW_WRITE_ACTIONS === 'true',
  
  // Microservice URLs for function calling
  MICROSERVICE_HR_URL: process.env.MICROSERVICE_HR_URL || 'http://localhost:3001',
  MICROSERVICE_QUOTATION_URL: process.env.MICROSERVICE_QUOTATION_URL || 'http://localhost:3002',
  MICROSERVICE_ECATALOG_URL: process.env.MICROSERVICE_ECATALOG_URL || 'http://localhost:3003',
  
  // System Prompt - sekarang diambil dari database (ai_prompts table)
  // Fallback ke environment variable jika database tidak tersedia
  // Key default: 'system_prompt_default'
  AI_SYSTEM_PROMPT_KEY: process.env.AI_SYSTEM_PROMPT_KEY || 'system_prompt_default',

  // Memory Configuration — Mem0 (menggantikan custom memory)
  // MEM0_MODE:
  //   'server'  → self-hosted Mem0 REST server (Docker/production, Postgres+pgvector)
  //   'library' → embedded mem0ai SDK, in-memory store + SQLite (local dev TANPA Docker/Postgres)
  MEM0_MODE: process.env.MEM0_MODE || 'server',
  MEM0_ENABLED: process.env.MEM0_ENABLED !== 'false', // Default: enabled
  MEM0_BASE_URL: process.env.MEM0_BASE_URL || 'http://localhost:8000',
  MEM0_API_KEY: process.env.MEM0_API_KEY || '', // X-API-Key untuk self-hosted server
  MEM0_TIMEOUT: parseInt(process.env.MEM0_TIMEOUT || '30000', 10),
  MEM0_MAX_INJECT: parseInt(process.env.MEM0_MAX_INJECT || '7', 10), // max memory di-inject ke prompt
  MEM0_CACHE_TTL: parseInt(process.env.MEM0_CACHE_TTL || '900', 10), // hot cache Redis 15 menit
  // Library mode (MEM0_MODE=library): LLM + embedder untuk extraction & search
  // Default mengikuti AI_MODEL_PROVIDER:
  //   sumopod → pakai SUMOPOD_* (base URL OpenAI-compatible + SUMOPOD_API_KEY)
  //   selain itu → pakai OPENAI_* (OPENAI_API_KEY)
  // Override manual via env MEM0_LLM_* / MEM0_EMBEDDER_*
  MEM0_LLM_MODEL: process.env.MEM0_LLM_MODEL || (process.env.AI_MODEL_PROVIDER === 'sumopod'
    ? (process.env.SUMOPOD_MODEL || 'gpt-5.4')
    : (process.env.OPENAI_MODEL || 'gpt-4o-mini')),
  MEM0_LLM_BASE_URL: process.env.MEM0_LLM_BASE_URL || (process.env.AI_MODEL_PROVIDER === 'sumopod'
    ? (process.env.SUMOPOD_BASE_URL || '')
    : (process.env.OPENAI_API_BASE_URL || '')),
  MEM0_LLM_API_KEY: process.env.MEM0_LLM_API_KEY || (process.env.AI_MODEL_PROVIDER === 'sumopod'
    ? (process.env.SUMOPOD_API_KEY || '')
    : (process.env.OPENAI_API_KEY || '')),
  MEM0_EMBEDDER_MODEL: process.env.MEM0_EMBEDDER_MODEL || 'text-embedding-3-small',
  // Base URL embedder; default ikut base URL LLM (agar Sumopod/OpenAI-compatible terpakai)
  MEM0_EMBEDDER_BASE_URL: process.env.MEM0_EMBEDDER_BASE_URL || '', // kosong → pakai MEM0_LLM_BASE_URL
  MEM0_HISTORY_DB_PATH: process.env.MEM0_HISTORY_DB_PATH || 'storages/mem0/history.db',
  // Vector store library mode:
  //   'memory'   (default) → in-memory, zero infra, data hilang saat restart
  //   'pgvector' → persistent di Postgres (butuh extension vector di DB target)
  MEM0_VECTOR_STORE: process.env.MEM0_VECTOR_STORE || 'memory',
  // Kredensial Postgres untuk vector store pgvector (default ikut DB_*_DEV)
  MEM0_PG: {
    connectionString: process.env.MEM0_PG_CONNECTION_STRING || '',
    host: process.env.MEM0_PG_HOST || process.env.DB_HOST_DEV || 'localhost',
    port: parseInt(process.env.MEM0_PG_PORT || process.env.DB_PORT_DEV || '5432', 10),
    user: process.env.MEM0_PG_USER || process.env.DB_USER_DEV || 'postgres',
    password: process.env.MEM0_PG_PASSWORD || process.env.DB_PASS_DEV || '',
    dbname: process.env.MEM0_PG_DBNAME || process.env.DB_NAME_DEV || 'ai_assistant',
    hnsw: process.env.MEM0_PG_HNSW === 'true', // index HNSW (default exact search)
  },
  
  // Fallback prompt jika database tidak tersedia (untuk development/testing)
  AI_SYSTEM_PROMPT_FALLBACK: process.env.AI_SYSTEM_PROMPT || `Kamu adalah Mosa, asisten virtual resmi Motor Sights International (MSI).

🌟 **Kepribadian**
Bersikaplah hangat, profesional, dan penuh perhatian. Gunakan bahasa alami seperti ngobrol dengan rekan kerja — jangan kaku. Tunjukkan antusiasme membantu.

🌐 **Bahasa**
Kamu bisa berbahasa Indonesia (default), English, dan 中文 (Mandarin). Deteksi bahasa pengguna dan jawab dengan bahasa yang sama. Jika ditanya terjemahan, terjemahkan seluruh jawaban ke bahasa yang diminta.

🎯 **Scope**
Kamu spesialis sistem MSI — module-module: SSO, Quotation, Power BI, CRM, HR/Interview, Employee, eCatalog, EPC, Public, Island, Customers, Bank Accounts.
Jika ditanya di luar scope, tolak dengan sopan pakai bahasamu sendiri dan tawarkan bantuan terkait MSI.

🛠️ **Tool & Data**
• Gunakan tool yang relevan untuk mengambil data dari microservice MSI.
• Prioritaskan POST ke endpoint /get.
• Gunakan pagination (limit=5 untuk preview, limit=100 untuk lengkap).
• Untuk perhitungan total/akumulasi, gunakan tool aggregation yang sesuai.
• Sertakan Bearer token dari sistem.

📊 **Struktur Territory CRM (Referensi)**
Territory → Island/Pulau → Group → Area (iup_zone_name) → Zona (area_name) → IUP
• Group adalah bagian dari hierarchy territory, BUKAN segmentasi.
• Segmentation adalah kategori bisnis terpisah (NIKEL, BATUBARA, EMAS).
• Untuk data IUP & territory, gunakan data dari CRM module.

📝 **Saat Membuat / Mengupdate Data**
• Jelaskan field dengan label yang mudah dipahami USER (contoh: candidate_name → "Nama Kandidat"). JANGAN menampilkan nama field teknis.
• Field yang butuh master data / referensi (berakhiran _id seperti company_id, department_id): CARI DAHULU datanya via tool search yang sesuai, lalu tawarkan pilihan ke user. JANGAN minta user memasukkan ID mentah.
• Jika data referensi tidak ditemukan atau pilihan kosong, informasikan ke user bahwa data master belum tersedia.
• Sebelum eksekusi, konfirmasi ringkasan data yang akan dibuat/diubah dan lengkapi field wajib terlebih dahulu.

📝 **Gaya Jawaban**
• Mulai dengan rangkuman singkat, lalu detail (poin/tabel bila perlu).
• Sebut sumber data secara ringkas.
• Jika error, jelaskan penyebab & solusi dengan ramah.
• Akhiri dengan nada suportif, siap membantu lagi.
• Jadilah natural — jangan gunakan template kaku.`
}
