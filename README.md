# AI Assistant Service

AI Assistant Service untuk Motor Sights International (MSI) yang menggunakan Large Language Model (LLM) dengan function calling untuk mengakses data dari berbagai microservice melalui API Gateway.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [AI Console (UI Admin)](#ai-console-ui-admin)
- [Update / Deploy AI Console](#update--deploy-ai-console-ke-server-existing)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Available Modules](#available-modules)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

## Overview

AI Assistant Service adalah backend service yang menyediakan kemampuan AI chat untuk mengakses dan memproses data dari berbagai module di sistem MSI. Service ini menggunakan:

- **LangChain** untuk integrasi dengan LLM (OpenAI/Sumopod)
- **Function Calling** untuk memanggil API internal secara dinamis
- **Redis** untuk menyimpan conversation history
- **PostgreSQL** untuk menyimpan system prompts, konfigurasi provider/model AI, dan log pemakaian AI
- **Express.js** sebagai web framework

### Use Cases

- Query data dari berbagai module (Quotation, CRM, HR, Power BI, dll)
- Natural language interface untuk sistem MSI
- Data summarization dan analysis
- Multi-turn conversation dengan context awareness

## Features

### Core Features

- **Natural Query Chat**: Pengguna dapat menanyakan pertanyaan dalam bahasa natural (Bahasa Indonesia)
- **Contextual Memory**: AI mengingat percakapan dalam sesi chat (disimpan di Redis)
- **Function Calling**: AI dapat memanggil fungsi API internal untuk menjawab pertanyaan
- **Multi-source Query**: AI dapat menggabungkan data dari beberapa service sekaligus
- **Data Summarization**: AI dapat melakukan ringkasan data yang diambil dari API
- **User Context via SSO Token**: AI mengenali identitas pengguna lewat JWT/SSO
- **Dynamic Prompt Management**: System prompt disimpan di database untuk easy management
- **Multiple LLM Support**: Provider OpenAI-compatible apa pun (OpenAI, Sumopod, OpenRouter, dll)
- **AI Console**: UI admin untuk mengganti provider, model, dan prompt lewat database tanpa rebuild, dengan fallback antar model dan dashboard monitoring

### Module Integration

- **Power BI**: Dashboard, Category, Management
- **Quotation**: Manage, Products, Accessory, Term Condition, Customer, Bank Account, Island
- **CRM**: Territory, IUP Management, Segmentation, IUP Customers, Transactions, Employee Data Access
- **Employee**: Management, Company, Department, Title
- **HR**: Candidates, Employees
- **eCatalog**: Products

**Total: 22 specialized tools + 1 generic gateway tool**

## Architecture

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

## Installation & Setup

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

# Seeder HANYA untuk database baru/kosong (insert default system prompt)
npm run seed
```

> **Peringatan: jangan jalankan `npm run seed` di database yang sudah berisi data.** Seeder `0001_examples_seeder` menghapus
> isi tabel `examples`, dan `0002_ai_prompts_seeder` **menimpa isi `system_prompt_default`** dengan versi bawaan
> (prompt yang sudah diedit, termasuk dari AI Console, akan hilang tanpa riwayat).

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

### Alternatif: Docker Compose

```bash
# Network eksternal yang dipakai compose (sekali saja)
docker network create infra_net

docker compose up -d --build
```

| Service | Port |
|---|---|
| `api` (REST API + listener RabbitMQ) | 9587 |
| `ai-assistant` (REST + MCP) | 9588 |
| `mem0` (memory server) | 9898 |

Untuk development lokal, buat `docker-compose.override.yml` (sudah di-`.gitignore`) untuk mengarahkan DB ke PostgreSQL host
(`DB_HOST_DEV=host.docker.internal` + `extra_hosts: ["host.docker.internal:host-gateway"]`) serta menambah container Redis/RabbitMQ.
Pastikan `pg_hba.conf` PostgreSQL mengizinkan subnet network `infra_net`, contoh:

```bash
echo "host all all 172.21.0.0/16 md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf
sudo systemctl reload postgresql
```

Jalankan migration dari dalam container:

```bash
docker compose exec api npx knex --knexfile src/knexfile.js migrate:latest
```

## AI Console (UI Admin)

UI untuk mengatur **provider AI, model AI, dan prompt** langsung dari database — perubahan berlaku tanpa rebuild/restart —
plus dashboard monitoring pemakaian AI.

### Akses

| Lingkungan | URL |
|---|---|
| Lokal (service `api`) | http://localhost:9587/api/mosa/ai-admin/ui/ |
| Lokal (service `ai-assistant`) | http://localhost:9588/api/mosa/ai-admin/ui/ |
| Server | `https://<domain-api>/api/mosa/ai-admin/ui/` |

**Login:** username & password diambil dari `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123   # nilai contoh — WAJIB diganti di server
```

Token login (JWT, ditandatangani `JWT_SECRET`) berlaku 12 jam. Percobaan login dibatasi 10 kali per 15 menit.
Mengganti username/password cukup ubah `.env` lalu `docker compose up -d` (tanpa rebuild).

### Halaman

| Halaman | Fungsi |
|---|---|
| **Dashboard** | Total panggilan, tingkat sukses, latency, token, urutan model aktif, grafik, error terbaru |
| **Provider AI** | Tambah/edit/nonaktifkan provider OpenAI-compatible; API key disimpan di DB atau diambil dari variabel `.env`; **Sync model** mengambil daftar model dari provider |
| **Model AI** | Tambah model, atur kegunaan, priority, temperature, max tokens, timeout; tombol **Tes** |
| **Prompt** | Edit prompt dengan riwayat versi & tombol kembalikan versi |
| **Log** | Semua panggilan model (termasuk percobaan fallback yang gagal) |
| **Pengaturan** | Pilih prompt yang dipakai chat, fallback on/off |

### Cara kerja singkat

- Tiap model punya kegunaan: **Chat asisten** (`/chat`, `/chat/stream`, validasi customer) dan/atau
  **Analisis transkrip** (terjemahan, ringkasan, analisis, `/summarize`, `/summarize-all`).
- Model aktif dengan **priority terkecil** dipakai lebih dulu; jika gagal, otomatis mencoba model berikutnya.
- Jika DB tidak bisa dibaca atau belum ada model aktif, sistem memakai konfigurasi `.env` (`AI_MODEL_PROVIDER`, `SUMOPOD_*`, `OPENAI_*`).
- Konfigurasi di-cache `AI_CONFIG_CACHE_TTL_MS` (default 15 detik), jadi perubahan berlaku di semua container paling lambat 15 detik.
- Tabel: `ai_providers`, `ai_models`, `ai_settings`, `ai_prompt_histories`, `ai_logs` (migration `20261025000001_create_ai_providers_models_logs.js`, data awal diisi dari `.env`).

Detail lengkap: [docs/AI_CONSOLE.md](./docs/AI_CONSOLE.md)

## Update / Deploy AI Console ke Server Existing

Panduan untuk server yang **sudah berjalan** (data existing tetap aman). Cukup **migration**, **tanpa seeder**.

### Ringkasan

| Langkah | Perlu? | Keterangan |
|---|---|---|
| Pull kode + rebuild image | Ya | UI & API admin ikut di image (tidak ada build frontend terpisah) |
| Migration | Ya, sekali | Membuat 5 tabel baru + data awal dari `.env` |
| Seeder (`npm run seed`) | **Tidak** | Data awal sudah diisi oleh migration. Seeder existing justru menimpa prompt & menghapus `examples` |
| Ubah `.env` | Disarankan | Tidak ada variabel wajib baru; ganti `ADMIN_PASSWORD` (lihat [bagian .env](#yang-perlu-diupdate-di-env)) |

### Kenapa aman untuk proses existing

- Migration **hanya menambah tabel baru** (`ai_providers`, `ai_models`, `ai_settings`, `ai_prompt_histories`, `ai_logs`).
  Tabel existing (`ai_prompts`, `ai_conversations`, `ai_transcriptions`, `ai_memories`, dll) **tidak diubah**.
- Data awal provider/model diambil dari `.env` server saat migration, sehingga model yang dipakai **sama persis** dengan sebelumnya
  (contoh: chat `SUMOPOD_MODEL`, analisis `STT_ANALYSIS_MODEL`, provider sesuai `AI_MODEL_PROVIDER`).
- Prompt chat tetap memakai `system_prompt_default` yang sudah ada (tidak ditimpa).
- Jika image baru sudah jalan tapi migration **belum** dijalankan, AI tetap berjalan memakai konfigurasi `.env`
  (fallback otomatis), jadi urutan deploy tidak menyebabkan downtime.

### Yang perlu diupdate di `.env`

**Tidak ada variabel wajib baru.** AI Console memakai variabel yang umumnya sudah ada:

| Variabel | Status | Keterangan |
|---|---|---|
| `ADMIN_USERNAME` | Sudah ada | Username login AI Console |
| `ADMIN_PASSWORD` | **Ganti** | Default contoh `admin123` — wajib diganti di server. Jika kosong, login AI Console dinonaktifkan |
| `JWT_SECRET` | Sudah ada | Untuk menandatangani token login AI Console. Wajib terisi |
| `AI_ADMIN_JWT_SECRET` | Opsional (baru) | Secret khusus AI Console agar terpisah dari `JWT_SECRET` |
| `AI_ADMIN_TOKEN_EXPIRES_IN` | Opsional (baru) | Masa berlaku login, default `12h` |
| `AI_CONFIG_CACHE_TTL_MS` | Opsional (baru) | Jeda perubahan dari UI berlaku di container lain, default `15000` (15 detik) |

Contoh tambahan di `.env` server:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<password-kuat>
# opsional
# AI_ADMIN_JWT_SECRET=<random-panjang>
# AI_CONFIG_CACHE_TTL_MS=15000
```

> **Jangan hapus** variabel AI lama (`AI_MODEL_PROVIDER`, `SUMOPOD_API_KEY`, `SUMOPOD_BASE_URL`, `SUMOPOD_MODEL`,
> `STT_ANALYSIS_MODEL`, `OPENAI_*`). Variabel ini dipakai: (1) sebagai data awal saat migration, (2) sebagai sumber
> API key — provider hasil migration membaca key dari `SUMOPOD_API_KEY` / `OPENAI_API_KEY` (kolom "Env API key"),
> dan (3) sebagai cadangan jika database tidak bisa dibaca. Mengganti model setelah ini cukup dari UI, bukan `.env`.

Setelah mengubah `.env`, cukup `docker compose up -d api ai-assistant` (tanpa rebuild).

### Langkah deploy

```bash
# 1. Masuk ke folder deploy di server, ambil kode terbaru
cd /deployment/public_html/<folder-ai-assistant>/
git pull origin develop            # atau main untuk production

# 2. (Disarankan) ganti password admin di .env
#    ADMIN_USERNAME=admin
#    ADMIN_PASSWORD=<password-kuat>
#    Opsional: AI_CONFIG_CACHE_TTL_MS=15000

# 3. Rebuild & restart container
docker compose up -d --build api ai-assistant

# 4. Jalankan migration (sekali). Wajib dari DALAM container agar data awal memakai .env server
docker compose exec api npx knex --knexfile src/knexfile.js migrate:latest
#    Output yang diharapkan: "Batch N run: 1 migrations"
#    Jika muncul "Already up to date" → migration sudah pernah dijalankan, tidak perlu apa-apa
```

> Jangan jalankan migration dari laptop/host yang `.env`-nya berbeda dengan server: data awal provider/model
> diambil dari `.env` tempat perintah dijalankan.

### Verifikasi setelah deploy

1. Cek migration tercatat:
   ```bash
   docker compose exec api npx knex --knexfile src/knexfile.js migrate:list
   # 20261025000001_create_ai_providers_models_logs.js harus ada di daftar "Completed"
   ```
2. Buka `https://<domain-api>/api/mosa/ai-admin/ui/`, login dengan `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. Di **Dashboard → Urutan model**, pastikan model chat & analisis sama dengan sebelumnya dan **tidak** ada peringatan
   "memakai konfigurasi .env".
4. Di **Model AI**, klik **Tes** pada model utama → harus `OK`.
5. Kirim satu chat dari aplikasi → muncul di halaman **Log**.

> Jika UI menampilkan **"Database tidak bisa dihubungi: no pg_hba.conf entry…"**, PostgreSQL belum mengizinkan subnet
> Docker container. Tambahkan rule di `pg_hba.conf` server, contoh untuk network `infra_net`:
> ```bash
> docker network inspect infra_net -f '{{range .IPAM.Config}}{{.Subnet}}{{end}}'   # cek subnet, mis. 172.21.0.0/16
> echo "host all all 172.21.0.0/16 md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf
> sudo systemctl reload postgresql
> ```
> Jalankan di terminal biasa (perintah `sudo` meminta password).

> Jika domain melewati reverse proxy / API gateway yang hanya meneruskan path tertentu, tambahkan route untuk
> `/api/mosa/ai-admin/` (termasuk `/api/mosa/ai-admin/ui/`).

### Update berikutnya (hanya perubahan UI/kode AI Console)

UI berupa file statis di dalam image (`src/modules/ai_admin/ui/`), jadi cukup:

```bash
git pull origin develop
docker compose up -d --build api ai-assistant
```

Migration hanya perlu dijalankan lagi jika ada file migration baru (`migrate:latest` aman diulang; jika tidak ada
yang baru, outputnya "Already up to date"). **Seeder tidak pernah diperlukan** untuk AI Console.

### Rollback

```bash
# Kembali ke kode sebelumnya
git checkout <commit-sebelumnya> && docker compose up -d --build api ai-assistant

# (Opsional) hapus tabel AI Console — sistem kembali memakai konfigurasi .env
docker compose exec api npx knex --knexfile src/knexfile.js migrate:rollback
```

> `migrate:rollback` membatalkan **batch terakhir**. Pastikan batch terakhir hanya berisi migration AI Console
> (cek dengan `migrate:list`) sebelum menjalankannya. Rollback menghapus juga log & riwayat prompt AI Console;
> isi tabel `ai_prompts` tidak terpengaruh.

## Configuration

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
| `AI_SYSTEM_PROMPT_KEY` | Key untuk system prompt di database (bisa diganti dari AI Console) | `system_prompt_default` |
| `AI_CONFIG_CACHE_TTL_MS` | Lama cache konfigurasi AI dari database (ms) | `15000` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Login AI Console | - |

> Provider & model sekarang diatur dari **AI Console** (database). Variabel `AI_MODEL_PROVIDER`, `SUMOPOD_*`, `OPENAI_*`
> hanya dipakai sebagai data awal saat migration dan sebagai cadangan jika database tidak tersedia.

### System Prompt Management

System prompt disimpan di database (tabel `ai_prompts`). Cara termudah: edit lewat halaman **Prompt** di
[AI Console](#ai-console-ui-admin) (otomatis menyimpan riwayat versi). Alternatif lewat SQL:

```sql
UPDATE ai_prompts 
SET content = 'Prompt baru...',
    version = '1.1.0',
    updated_at = NOW()
WHERE key = 'system_prompt_default' 
  AND is_active = true;
```

Lihat dokumentasi lengkap di [AI_PROMPTS_DATABASE.md](./AI_PROMPTS_DATABASE.md)

## API Documentation

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

## Available Modules

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

## Development Guide

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

## Troubleshooting

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

## Additional Documentation

- [Alur Proses AI Assistant](./ALUR_PROSES_AI_ASSISTANT.md) - Detail alur proses 8 langkah
- [Module Implementation Summary](./MODULE_IMPLEMENTATION_SUMMARY.md) - Dokumentasi semua module
- [AI Prompts Database](./AI_PROMPTS_DATABASE.md) - System prompt management
- [Update Status](./UPDATE_STATUS.md) - Status update implementasi

## Contributing

Contributions are welcome! Silakan buat pull request atau issue untuk saran dan perbaikan.

### Guidelines

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - lihat file [LICENSE](./LICENSE) untuk detail.

## Credits

**Developed by [abdulfalaq5](https://github.com/abdulfalaq5)**

---

Dibuat untuk Motor Sights International
