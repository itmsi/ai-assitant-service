# AI Assistant Module

Modul AI Assistant yang menggunakan OpenAI API dan LangChain untuk memberikan kemampuan chat berbasis AI dengan function calling ke berbagai microservice.

## Fitur

- ✅ **Natural Query Chat**: Pengguna dapat menanyakan pertanyaan dalam bahasa natural
- ✅ **Contextual Memory**: AI mengingat percakapan dalam sesi chat (disimpan di Redis)
- ✅ **Command Routing**: AI mampu menerjemahkan kalimat pengguna menjadi action ke modul tertentu
- ✅ **Data Summarization**: AI dapat melakukan ringkasan data yang diambil dari API
- ✅ **Multi-source Query**: AI dapat menggabungkan data dari beberapa service sekaligus
- ✅ **User Context via SSO Token**: AI mengenali identitas pengguna lewat JWT/SSO
- ✅ **AI Function Calling**: AI dapat memanggil fungsi API internal untuk menjawab pertanyaan
- ✅ **Configurable Model Source**: Bisa menggunakan OpenAI API atau Ollama (future)

## Endpoints

### POST `/api/v1/ai-assistant/chat`

Mengirim pesan ke AI Assistant.

**Request Body:**
```json
{
  "message": "Tampilkan kandidat terbaru bulan ini",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Chat berhasil diproses",
  "data": {
    "message": "Berikut adalah kandidat terbaru bulan ini...",
    "sessionId": "session_123_1234567890",
    "conversationHistory": [...]
  }
}
```

### GET `/api/v1/ai-assistant/history/:sessionId`

Mengambil riwayat percakapan berdasarkan session ID.

**Response:**
```json
{
  "status": true,
  "message": "Riwayat percakapan berhasil diambil",
  "data": {
    "sessionId": "session_123_1234567890",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Tampilkan kandidat terbaru",
        "timestamp": "2025-01-15T10:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Berikut adalah kandidat terbaru...",
        "timestamp": "2025-01-15T10:00:01.000Z"
      }
    ]
  }
}
```

### DELETE `/api/v1/ai-assistant/history/:sessionId`

Menghapus riwayat percakapan berdasarkan session ID.

**Response:**
```json
{
  "status": true,
  "message": "Riwayat percakapan berhasil dihapus",
  "data": {
    "sessionId": "session_123_1234567890"
  }
}
```

## Function Tools

AI Assistant dapat memanggil function tools berikut untuk mengakses data dari microservice:

### 1. `search_hr_candidates`
Mencari kandidat dari modul HR.

**Parameters:**
- `month` (string, optional): Bulan pencarian format YYYY-MM
- `status` (string, optional): Status kandidat
- `keyword` (string, optional): Keyword pencarian
- `limit` (number, optional): Jumlah maksimal hasil (default: 10)

### 2. `search_hr_employees`
Mencari data karyawan dari modul HR.

**Parameters:**
- `name` (string, optional): Nama karyawan
- `department` (string, optional): Departemen
- `status` (string, optional): Status karyawan
- `limit` (number, optional): Jumlah maksimal hasil (default: 10)

### 3. `search_quotations`
Mencari data quotation.

**Parameters:**
- `quotationNumber` (string, optional): Nomor quotation
- `status` (string, optional): Status quotation
- `startDate` (string, optional): Tanggal mulai YYYY-MM-DD
- `endDate` (string, optional): Tanggal akhir YYYY-MM-DD
- `limit` (number, optional): Jumlah maksimal hasil (default: 10)

### 4. `search_ecatalog_products`
Mencari produk dari eCatalog.

**Parameters:**
- `name` (string, optional): Nama produk
- `category` (string, optional): Kategori produk
- `keyword` (string, optional): Keyword pencarian
- `limit` (number, optional): Jumlah maksimal hasil (default: 10)

### 5. `summarize_data`
Merangkum dan menganalisis data.

**Parameters:**
- `data` (object): Data yang akan dirangkum
- `summaryType` (string, optional): Jenis ringkasan (count, statistics, key_points)

## Konfigurasi

Tambahkan konfigurasi berikut ke file `.env`:

```env
# AI Assistant Configuration
AI_ENABLED=true
AI_MODEL_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000
AI_MAX_CONVERSATION_HISTORY=10
AI_ENABLE_FUNCTION_CALLING=true

# Redis Configuration (required for memory)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Microservice URLs
MICROSERVICE_HR_URL=http://localhost:3001
MICROSERVICE_QUOTATION_URL=http://localhost:3002
MICROSERVICE_ECATALOG_URL=http://localhost:3003
```

## Contoh Penggunaan

### Contoh 1: Mencari Kandidat

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Tampilkan kandidat terbaru bulan ini"
  }'
```

### Contoh 2: Mencari Quotation

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Berapa total quotation yang disetujui bulan ini?"
  }'
```

### Contoh 3: Multi-source Query

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Bandingkan jumlah kandidat bulan ini dengan jumlah karyawan aktif"
  }'
```

## Struktur File

```
src/modules/ai_assistant/
├── handler.js      # Request handlers
├── service.js      # AI processing logic dengan LangChain
├── tools.js        # Function tools untuk LangChain
├── index.js        # Routes
└── README.md       # Dokumentasi
```

## Catatan Penting

1. **Redis**: Modul ini memerlukan Redis untuk menyimpan conversation history. Pastikan Redis sudah running dan dikonfigurasi dengan benar.

2. **JWT Token**: Untuk mengakses microservice lain, AI Assistant akan menggunakan JWT token dari user. Pastikan token valid dan memiliki akses ke microservice yang diperlukan.

3. **OpenAI API Key**: Pastikan API key OpenAI sudah dikonfigurasi dengan benar di file `.env`.

4. **Microservice URLs**: Pastikan URL microservice sudah dikonfigurasi dengan benar. AI Assistant akan memanggil endpoint di microservice tersebut.

5. **Error Handling**: Jika microservice tidak tersedia atau error, AI Assistant akan memberikan response yang informatif kepada user.

## Troubleshooting

### Error: "AI Assistant is not enabled"
- Pastikan `AI_ENABLED=true` di file `.env`

### Error: "OpenAI API key is not configured"
- Pastikan `OPENAI_API_KEY` sudah dikonfigurasi di file `.env`

### Error: "Redis connection error"
- Pastikan Redis sudah running
- Periksa konfigurasi Redis di file `.env`
- Pastikan `REDIS_ENABLED=true`

### AI tidak memanggil function tools
- Pastikan `AI_ENABLE_FUNCTION_CALLING=true` di file `.env`
- Pastikan model OpenAI yang digunakan mendukung function calling (gpt-4, gpt-4-turbo-preview, dll)
