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

  // Memory Configuration
  AI_MEMORY_ENABLED: process.env.AI_MEMORY_ENABLED !== 'false', // Default: enabled
  AI_MEMORY_EXTRACTOR_MODEL: process.env.AI_MEMORY_EXTRACTOR_MODEL || 'gpt-4o-mini',
  AI_MEMORY_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_MEMORY_CONFIDENCE_THRESHOLD || '0.60'),
  AI_MEMORY_MAX_INJECT: parseInt(process.env.AI_MEMORY_MAX_INJECT || '7'),
  
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

📝 **Gaya Jawaban**
• Mulai dengan rangkuman singkat, lalu detail (poin/tabel bila perlu).
• Sebut sumber data secara ringkas.
• Jika error, jelaskan penyebab & solusi dengan ramah.
• Akhiri dengan nada suportif, siap membantu lagi.
• Jadilah natural — jangan gunakan template kaku.`
}
