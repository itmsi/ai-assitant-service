# AI Assistant - Fix & Testing Guide

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Fix `bindTools is not a function` Error
- **Masalah**: Method `bindTools` tidak tersedia di versi LangChain yang digunakan
- **Solusi**: Menggunakan `model.bind({ tools: tools })` sebagai gantinya
- **File**: `src/modules/ai_assistant/service.js`

### 2. Update Model OpenAI
- **Masalah**: Model `gpt-4-turbo-preview` tidak tersedia
- **Solusi**: Mengubah default model ke `gpt-3.5-turbo` (lebih umum tersedia)
- **File**: 
  - `src/config/ai.js` (default)
  - `.env` (override dengan `OPENAI_MODEL=gpt-3.5-turbo`)

### 3. Error Handling
- Menambahkan fallback jika tools binding gagal
- AI Assistant tetap bisa berjalan tanpa function calling

## 🔧 Konfigurasi yang Diperlukan

### File `.env` harus memiliki:

```env
# AI Assistant Configuration
AI_ENABLED=true
AI_MODEL_PROVIDER=openai
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000
AI_MAX_CONVERSATION_HISTORY=10
AI_ENABLE_FUNCTION_CALLING=true

# Redis Configuration (optional but recommended)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Microservice URLs (untuk function calling)
MICROSERVICE_HR_URL=http://localhost:3001
MICROSERVICE_QUOTATION_URL=http://localhost:3002
MICROSERVICE_ECATALOG_URL=http://localhost:3003
```

## 🚀 Cara Testing

### 1. Pastikan Server Sudah Restart

**PENTING**: Setelah mengubah `.env`, **WAJIB restart server** agar perubahan ter-load!

```bash
# Stop server (Ctrl+C)
# Lalu start lagi
npm run dev
```

### 2. Test dengan Curl

```bash
# Test sederhana
curl --location 'http://localhost:9587/api/ai-assistant/chat' \
--header 'Content-Type: application/json' \
--data '{"message": "Halo, siapa kamu dan apa yang bisa kamu bantu?"}'
```

### 3. Test dengan Script

```bash
# Jalankan test script
./test-ai-assistant.sh
```

### 4. Test Manual

```bash
# Test 1: Greeting
curl --location 'http://localhost:9587/api/ai-assistant/chat' \
--header 'Content-Type: application/json' \
--data '{"message": "Halo, siapa kamu?"}'

# Test 2: Capabilities
curl --location 'http://localhost:9587/api/ai-assistant/chat' \
--header 'Content-Type: application/json' \
--data '{"message": "Apa yang bisa kamu lakukan?"}'

# Test 3: Dengan session ID
curl --location 'http://localhost:9587/api/ai-assistant/chat' \
--header 'Content-Type: application/json' \
--data '{"message": "Halo", "sessionId": "test-123"}'
```

## 📝 Contoh Pesan untuk Testing

### Pertanyaan Umum (Tanpa Function Calling)
1. "Halo, siapa kamu?"
2. "Apa yang bisa kamu lakukan?"
3. "Ceritakan tentang dirimu"
4. "Apa itu AI Assistant?"

### Pertanyaan dengan Function Calling (Butuh JWT Token)
1. "Tampilkan data karyawan"
2. "Tampilkan kandidat terbaru bulan ini"
3. "Berapa jumlah quotation yang disetujui?"
4. "Cari produk dari eCatalog"

**Note**: Untuk function calling, perlu header `Authorization: Bearer YOUR_JWT_TOKEN`

## 🔍 Troubleshooting

### Error: "AI Assistant is not enabled"
- ✅ Pastikan `AI_ENABLED=true` di `.env`
- ✅ Restart server setelah mengubah `.env`

### Error: "bindTools is not a function"
- ✅ Sudah diperbaiki di versi terbaru
- ✅ Pastikan file `src/modules/ai_assistant/service.js` sudah di-update

### Error: "404 The model `gpt-4-turbo-preview` does not exist"
- ✅ Sudah diperbaiki dengan mengubah ke `gpt-3.5-turbo`
- ✅ Pastikan `OPENAI_MODEL=gpt-3.5-turbo` di `.env`
- ✅ Restart server

### Error: "OpenAI API key is not configured"
- ✅ Pastikan `OPENAI_API_KEY` ada di `.env`
- ✅ Pastikan API key valid

### Response lambat
- ✅ Normal, karena menggunakan OpenAI API
- ✅ Bisa menggunakan model yang lebih cepat (gpt-3.5-turbo)

### Function calling tidak bekerja
- ✅ Pastikan `AI_ENABLE_FUNCTION_CALLING=true`
- ✅ Pastikan microservice URLs sudah benar
- ✅ Pastikan JWT token valid (jika diperlukan)

## 📊 Status Testing

Setelah perbaikan, endpoint seharusnya:
- ✅ Bisa menerima request
- ✅ Bisa memproses pesan
- ✅ Bisa mengembalikan response dari AI
- ✅ Bisa menyimpan conversation history (jika Redis enabled)

## 🎯 Next Steps

1. **Restart server** dengan konfigurasi baru
2. **Test endpoint** dengan curl atau script
3. **Monitor logs** untuk melihat apakah ada error
4. **Test function calling** jika microservice sudah tersedia

## 📞 Support

Jika masih ada masalah:
1. Check log server untuk error detail
2. Pastikan semua konfigurasi di `.env` sudah benar
3. Pastikan server sudah restart setelah mengubah `.env`
4. Pastikan OpenAI API key valid dan memiliki quota

