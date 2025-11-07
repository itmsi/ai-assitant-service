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
  
  // Ollama Configuration (for local models)
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3',
  
  // AI Assistant Settings
  AI_MAX_CONVERSATION_HISTORY: parseInt(process.env.AI_MAX_CONVERSATION_HISTORY || '10'),
  AI_ENABLE_FUNCTION_CALLING: process.env.AI_ENABLE_FUNCTION_CALLING !== 'false',
  
  // Microservice URLs for function calling
  MICROSERVICE_HR_URL: process.env.MICROSERVICE_HR_URL || 'http://localhost:3001',
  MICROSERVICE_QUOTATION_URL: process.env.MICROSERVICE_QUOTATION_URL || 'http://localhost:3002',
  MICROSERVICE_ECATALOG_URL: process.env.MICROSERVICE_ECATALOG_URL || 'http://localhost:3003',
  
  // System Prompt
  AI_SYSTEM_PROMPT: process.env.AI_SYSTEM_PROMPT || `Kamu adalah AI Assistant yang membantu pengguna mengakses dan mengelola data dari berbagai microservice.
Kamu dapat:
- Mencari data dari modul HR (kandidat, karyawan, dll)
- Mengakses data Quotation
- Mengakses e-Catalog
- Merangkum dan menganalisis data
- Menjawab pertanyaan berdasarkan data yang ada

Gunakan bahasa Indonesia dalam komunikasi dan berikan jawaban yang jelas dan informatif.`
}
