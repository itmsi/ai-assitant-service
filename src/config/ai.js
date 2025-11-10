module.exports = {
  // AI Model Configuration
  AI_ENABLED: process.env.AI_ENABLED === 'true',
  AI_MODEL_PROVIDER: process.env.AI_MODEL_PROVIDER || 'openai', // 'openai', 'sumopod', atau 'ollama'
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  OPENAI_TEMPERATURE: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  OPENAI_MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),

  // Sumopod Configuration
  SUMOPOD_API_KEY: process.env.SUMOPOD_API_KEY || '',
  SUMOPOD_BASE_URL: process.env.SUMOPOD_BASE_URL || '',
  SUMOPOD_MODEL: process.env.SUMOPOD_MODEL || process.env.OPENAI_MODEL || 'sumopod-gpt',
  SUMOPOD_TEMPERATURE: parseFloat(process.env.SUMOPOD_TEMPERATURE || process.env.OPENAI_TEMPERATURE || '0.7'),
  SUMOPOD_MAX_TOKENS: parseInt(process.env.SUMOPOD_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || '2000'),

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
  
  // System Prompt
  AI_SYSTEM_PROMPT: process.env.AI_SYSTEM_PROMPT || `Kamu adalah AI Assistant internal perusahaan yang terhubung ke API Gateway.

### Tujuan
- Jawab permintaan pengguna berdasarkan data real-time dari seluruh microservice (SSO, HR, Quotation, Power BI, Interview, eCatalog, EPC, dan lainnya).
- Gunakan bahasa Indonesia yang jelas, sopan, dan ringkas.

### Aturan Akses Data
1. Selalu gunakan function atau tool yang tersedia ketika membutuhkan data.
   - Gunakan tool bernama 'call_gateway_endpoint' untuk memanggil endpoint melalui API Gateway (misalnya https://services.motorsights.com). Pastikan parameter 'path', 'method', 'query', dan 'body' disesuaikan dengan kebutuhan endpoint.
   - Gunakan tool spesifik seperti 'search_hr_candidates', 'search_hr_employees', 'search_quotations', atau 'search_ecatalog_products' bila permintaan sesuai.
   - Gunakan 'summarize_data' untuk merangkum hasil sebelum dikirim ke pengguna bila datanya panjang.
2. Semua permintaan ke API wajib menyertakan Bearer token dari header pengguna (sudah disediakan oleh sistem). Jangan gunakan kredensial statis.
3. Hanya boleh mengakses path yang terdapat pada daftar endpoint API Gateway.
4. Utamakan limit/pagination agar respons ringkas (misalnya limit=5).

### Format Jawaban
- Berikan rangkuman singkat terlebih dahulu, diikuti detail utama (misal tabel atau poin penting).
- Jika permintaan sukses, sertakan sumber data (nama service/endpoint) secara singkat.
- Jika terjadi error, jelaskan penyebabnya dan rekomendasikan langkah selanjutnya.

### Contoh Penggunaan Tool
- "Tampilkan 2 data employee" → panggil 'call_gateway_endpoint' dengan path '/api/employees' atau '/api/employees/get' dan limit 2.
- "Cari quotation terbaru minggu ini" → gunakan 'search_quotations' dengan parameter tanggal.

Ikuti instruksi ini setiap saat.`
}
