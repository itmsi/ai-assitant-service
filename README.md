# AI Assistant Service

AI Assistant Service untuk Motor Sights International (MSI) yang menggunakan Large Language Model (LLM) dengan function calling untuk mengakses data dari berbagai microservice melalui API Gateway.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Available Modules](#-available-modules)
- [Development Guide](#-development-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)
- [Credits](#-credits)

## 🎯 Overview

AI Assistant Service adalah backend service yang menyediakan kemampuan AI chat untuk mengakses dan memproses data dari berbagai module di sistem MSI. Service ini menggunakan:

- **LangChain** untuk integrasi dengan LLM (OpenAI/Sumopod)
- **Function Calling** untuk memanggil API internal secara dinamis
- **Redis** untuk menyimpan conversation history
- **PostgreSQL** untuk menyimpan system prompts
- **Express.js** sebagai web framework

### Use Cases

- Query data dari berbagai module (Quotation, CRM, HR, Power BI, dll)
- Natural language interface untuk sistem MSI
- Data summarization dan analysis
- Multi-turn conversation dengan context awareness

## ✨ Features

### Core Features

- ✅ **Natural Query Chat**: Pengguna dapat menanyakan pertanyaan dalam bahasa natural (Bahasa Indonesia)
- ✅ **Contextual Memory**: AI mengingat percakapan dalam sesi chat (disimpan di Redis)
- ✅ **Function Calling**: AI dapat memanggil fungsi API internal untuk menjawab pertanyaan
- ✅ **Multi-source Query**: AI dapat menggabungkan data dari beberapa service sekaligus
- ✅ **Data Summarization**: AI dapat melakukan ringkasan data yang diambil dari API
- ✅ **User Context via SSO Token**: AI mengenali identitas pengguna lewat JWT/SSO
- ✅ **Dynamic Prompt Management**: System prompt disimpan di database untuk easy management
- ✅ **Multiple LLM Support**: Support OpenAI, Sumopod, dan Ollama (future)

### Module Integration

- ✅ **Power BI**: Dashboard, Category, Management
- ✅ **Quotation**: Manage, Products, Accessory, Term Condition, Customer, Bank Account, Island
- ✅ **CRM**: Territory, IUP Management, Segmentation, IUP Customers, Transactions, Employee Data Access
- ✅ **Employee**: Management, Company, Department, Title
- ✅ **HR**: Candidates, Employees
- ✅ **eCatalog**: Products

**Total: 22 specialized tools + 1 generic gateway tool**

## 🏗️ Architecture

### Alur Proses (8 Langkah)

```
User
 │
 │  (1) Pertanyaan
 ▼
Chat UI / Frontend
 │
 │  (2) POST /api/mosa/ai-assistant/chat
 ▼
AI Service (Express.js)
 │
 │  (3) Kirim prompt + tools
 ▼
LLM (OpenAI/Sumopod)
 │
 │  (4) Pilih tool + parameter
 ▼
AI Service (Express.js)
 │
 │  (5) Panggil service domain
 ▼
Internal API (SSO / CRM / HR / Quotation)
 │
 │  (6) Data JSON
 ▼
AI Service (Express.js)
 │
 │  (7) Kirim data ke LLM
 ▼
LLM (OpenAI/Sumopod)
 │
 │  (8) Jawaban natural language
 ▼
User
```

### Komponen Utama

1. **Handler** (`src/modules/ai_assistant/handler.js`)
   - Menerima HTTP request
   - Validasi input
   - Extract JWT token
   - Generate session ID

2. **Service** (`src/modules/ai_assistant/service.js`)
   - Initialize LLM model
   - Load system prompt dari database
   - Process chat dengan function calling
   - Manage conversation history

3. **Tools** (`src/modules/ai_assistant/tools.js`)
   - Definisi function tools untuk LLM
   - Execute API calls ke microservice
   - Handle error dan response formatting

4. **Repository** (`src/modules/ai_assistant/ai_prompts_repository.js`)
   - CRUD operations untuk system prompts
   - Cache management

5. **Config** (`src/config/ai.js`)
   - Konfigurasi AI model
   - Environment variables
   - Fallback prompts

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v14 atau lebih baru)
- PostgreSQL (v12 atau lebih baru)
- Redis (untuk conversation history)
- API Gateway access (untuk akses microservice)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd ai-assistant-service
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Setup

Copy file environment example:

```bash
cp environment.example .env
```

Edit file `.env` dan sesuaikan konfigurasi:

```env
# Application
APP_NAME=AI Assistant Service
APP_PORT=9587
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=ai_assistant_db

# AI Configuration
AI_ENABLED=true
AI_MODEL_PROVIDER=sumopod  # atau 'openai'
SUMOPOD_API_KEY=sk-sumo-your-api-key
SUMOPOD_BASE_URL=https://ai.sumopod.com/v1
SUMOPOD_MODEL=gpt-4o

# API Gateway
API_GATEWAY_BASE_URL=https://dev-gateway.motorsights.com
API_GATEWAY_TIMEOUT=30000

# Redis (untuk conversation history)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Settings
AI_MAX_CONVERSATION_HISTORY=10
AI_ENABLE_FUNCTION_CALLING=true
AI_ALLOW_WRITE_ACTIONS=false
AI_SYSTEM_PROMPT_KEY=system_prompt_default
```

### Step 4: Database Setup

```bash
# Run migrations
npm run migrate

# Run seeders (untuk insert default system prompt)
npm run seed
```

### Step 5: Start Redis

```bash
# Menggunakan Docker
docker run -d -p 6379:6379 redis:latest

# Atau install Redis lokal
# macOS: brew install redis && redis-server
# Ubuntu: sudo apt-get install redis-server && sudo service redis-server start
```

### Step 6: Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server akan berjalan di `http://localhost:9587`

## ⚙️ Configuration

### AI Model Configuration

**File:** `src/config/ai.js`

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_ENABLED` | Enable/disable AI | `false` |
| `AI_MODEL_PROVIDER` | Provider (openai/sumopod/ollama) | `openai` |
| `SUMOPOD_API_KEY` | API key untuk Sumopod | - |
| `SUMOPOD_BASE_URL` | Base URL Sumopod | - |
| `OPENAI_API_KEY` | API key untuk OpenAI | - |
| `API_GATEWAY_BASE_URL` | Base URL API Gateway | - |
| `AI_ENABLE_FUNCTION_CALLING` | Enable function calling | `true` |
| `AI_ALLOW_WRITE_ACTIONS` | Allow write operations | `false` |
| `AI_MAX_CONVERSATION_HISTORY` | Max conversation history | `10` |
| `AI_SYSTEM_PROMPT_KEY` | Key untuk system prompt di database | `system_prompt_default` |

### System Prompt Management

System prompt sekarang disimpan di database (tabel `ai_prompts`). Untuk update prompt:

```sql
UPDATE ai_prompts 
SET content = 'Prompt baru...',
    version = '1.1.0',
    updated_at = NOW()
WHERE key = 'system_prompt_default' 
  AND is_active = true;
```

Lihat dokumentasi lengkap di [AI_PROMPTS_DATABASE.md](./AI_PROMPTS_DATABASE.md)

## 📡 API Documentation

### Base URL

```
http://localhost:9587/api/mosa/ai-assistant
```

### Endpoints

#### POST `/chat`

Mengirim pesan ke AI Assistant.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Tampilkan 5 quotation terbaru minggu ini",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat berhasil diproses",
  "data": {
    "message": "Berikut adalah 5 quotation terbaru minggu ini...",
    "sessionId": "session_f0b57258-5f33-4e03-81f7-cd70d833b5c5",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Tampilkan 5 quotation terbaru minggu ini",
        "timestamp": "2025-01-20T10:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Berikut adalah 5 quotation terbaru...",
        "timestamp": "2025-01-20T10:00:05.000Z"
      }
    ]
  }
}
```

**Contoh Request:**
```bash
curl -X 'POST' \
  'http://localhost:9587/api/mosa/ai-assistant/chat' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "message": "Tampilkan 5 quotation terbaru minggu ini"
}'
```

#### GET `/history/:sessionId`

Mengambil riwayat percakapan berdasarkan session ID.

**Response:**
```json
{
  "success": true,
  "message": "Riwayat percakapan berhasil diambil",
  "data": {
    "sessionId": "session_123",
    "conversationHistory": [...]
  }
}
```

#### DELETE `/history/:sessionId`

Menghapus riwayat percakapan berdasarkan session ID.

## 📦 Available Modules

### Power BI Module

- `search_powerbi_dashboard` - Dashboard Power BI
- `search_powerbi_category` - Kategori Power BI
- `search_powerbi_manage` - Manajemen Power BI

**Contoh:** "Tampilkan dashboard Power BI yang aktif"

### Quotation Module

- `search_quotations` - Mencari quotation
- `search_quotation_products` - Produk quotation
- `search_quotation_accessory` - Aksesori quotation
- `search_quotation_term_condition` - Term dan condition
- `search_quotation_customer` - Customer quotation
- `search_quotation_bank_account` - Bank account
- `search_quotation_island` - Island data

**Contoh:** "Tampilkan 5 quotation terbaru minggu ini"

### CRM Module

- `search_crm_territory` - Territory management
- `search_crm_iup_management` - IUP management
- `search_crm_segmentation` - Segmentasi CRM
- `search_crm_iup_customers` - IUP customers/contractors
- `search_crm_transactions` - Transaksi/aktivitas CRM
- `search_crm_employee_data_access` - Employee data access

**Contoh:** "Cari data IUP management dengan status aktif"

### Employee Module

- `search_hr_employees` - Data karyawan
- `search_employee_company` - Company employee
- `search_employee_department` - Department employee
- `search_employee_title` - Title/jabatan employee

**Contoh:** "Tampilkan 10 employee terbaru"

### HR Module

- `search_hr_candidates` - Kandidat HR
- `search_hr_employees` - Karyawan HR

**Contoh:** "Tampilkan kandidat terbaru bulan ini"

### eCatalog Module

- `search_ecatalog_products` - Produk eCatalog

**Contoh:** "Cari produk dengan keyword 'engine'"

### Generic Gateway Tool

- `call_gateway_endpoint` - Akses generik ke API Gateway untuk endpoint yang diizinkan

Lihat dokumentasi lengkap di [MODULE_IMPLEMENTATION_SUMMARY.md](./MODULE_IMPLEMENTATION_SUMMARY.md)

## 🛠️ Development Guide

### Menambah Module Baru

1. **Tambahkan endpoint ke `GATEWAY_ALLOWED_PREFIXES`** di `src/modules/ai_assistant/tools.js`

```javascript
const GATEWAY_ALLOWED_PREFIXES = [
  // ... existing endpoints
  '/api/module-baru',
  '/api/module-baru/get',
  '/api/module-baru/create',
];
```

2. **Buat tool khusus (opsional)** jika perlu logic khusus:

```javascript
const searchNewModule = {
  name: 'search_new_module',
  description: 'Mencari data dari module baru',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      limit: { type: 'number', default: 10 }
    }
  },
  execute: async ({ search, limit = 10 }, authToken) => {
    // Implementation
  }
};
```

3. **Tambahkan ke `getToolsForLangChain()`** dan `executeTool()`

4. **Update system prompt** di database jika perlu

### Project Structure

```
src/
├── modules/
│   └── ai_assistant/
│       ├── handler.js              # HTTP handlers
│       ├── service.js              # AI processing logic
│       ├── tools.js                 # Function tools definitions
│       ├── ai_prompts_repository.js # Prompt database operations
│       └── README.md                # Module documentation
├── config/
│   └── ai.js                       # AI configuration
├── repository/
│   └── postgres/
│       ├── migrations/             # Database migrations
│       └── seeders/                # Database seeders
└── utils/
    └── redis.js                    # Redis utilities
```

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with nodemon
npm run migrate        # Run database migrations
npm run migrate:rollback  # Rollback last migration
npm run migrate:make <name>  # Create new migration
npm run seed           # Run database seeders
npm run seed:make <name>  # Create new seeder
npm test               # Run tests
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Problem:** Error saat connect ke PostgreSQL

**Solution:**
- Check database credentials di `.env`
- Pastikan PostgreSQL running
- Check network/firewall settings

#### 2. Redis Connection Error

**Problem:** Conversation history tidak tersimpan

**Solution:**
- Check Redis running: `redis-cli ping`
- Check Redis config di `.env`
- Service akan tetap berjalan tanpa Redis (tanpa memory)

#### 3. LLM API Error

**Problem:** Error saat memanggil LLM API

**Solution:**
- Check API key valid
- Check base URL correct
- Check network connectivity
- Check API quota/limits

#### 4. Function Calling Tidak Berfungsi

**Problem:** AI tidak memanggil tools

**Solution:**
- Check `AI_ENABLE_FUNCTION_CALLING=true` di `.env`
- Check tools sudah terdaftar di `getToolsForLangChain()`
- Check logs untuk error details

#### 5. Prompt Tidak Ter-update

**Problem:** Perubahan prompt di database tidak terlihat

**Solution:**
- Clear cache: `clearSystemPromptCache()` (atau tunggu 5 menit)
- Check prompt `is_active=true` di database
- Check `AI_SYSTEM_PROMPT_KEY` sesuai dengan key di database

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
DEBUG_ENABLED=true
```

Check logs di `logs/application/`

## 📚 Additional Documentation

- [Alur Proses AI Assistant](./ALUR_PROSES_AI_ASSISTANT.md) - Detail alur proses 8 langkah
- [Module Implementation Summary](./MODULE_IMPLEMENTATION_SUMMARY.md) - Dokumentasi semua module
- [AI Prompts Database](./AI_PROMPTS_DATABASE.md) - System prompt management
- [Update Status](./UPDATE_STATUS.md) - Status update implementasi

## 🤝 Contributing

Contributions are welcome! Silakan buat pull request atau issue untuk saran dan perbaikan.

### Guidelines

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - lihat file [LICENSE](./LICENSE) untuk detail.

## 👨‍💻 Credits

**Developed by [abdulfalaq5](https://github.com/abdulfalaq5)**

---

Made with ❤️ for Motor Sights International
