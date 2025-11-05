# AI Assistant Service - Quick Setup Guide

## 🚀 Setup Cepat

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Environment

Copy file `environment.example` ke `.env` dan update konfigurasi berikut:

```env
# Enable AI Assistant
AI_ENABLED=true

# OpenAI Configuration
AI_MODEL_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Enable Redis untuk memory
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Microservice URLs (sesuaikan dengan environment Anda)
MICROSERVICE_HR_URL=http://localhost:3001
MICROSERVICE_QUOTATION_URL=http://localhost:3002
MICROSERVICE_ECATALOG_URL=http://localhost:3003
```

### 3. Start Redis (jika belum running)

```bash
# Menggunakan Docker
docker run -d -p 6379:6379 redis:latest

# Atau install Redis lokal
# macOS: brew install redis && redis-server
# Ubuntu: sudo apt-get install redis-server && sudo service redis-server start
```

### 4. Start Server

```bash
npm run dev
```

## 📝 Testing

### Test Chat Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tampilkan kandidat terbaru bulan ini"
  }'
```

### Test dengan JWT Token

```bash
curl -X POST http://localhost:3000/api/v1/ai-assistant/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Berapa jumlah quotation yang disetujui bulan ini?"
  }'
```

## 📚 Dokumentasi Lengkap

Lihat `src/modules/ai_assistant/README.md` untuk dokumentasi lengkap.

## ✅ Checklist

- [ ] Dependencies terinstall (`npm install`)
- [ ] File `.env` sudah dikonfigurasi
- [ ] Redis running dan dikonfigurasi
- [ ] OpenAI API key sudah di-set
- [ ] Microservice URLs sudah dikonfigurasi
- [ ] Server berjalan tanpa error

## 🎯 Fitur yang Tersedia

- ✅ Natural Query Chat
- ✅ Contextual Memory (Redis)
- ✅ Function Calling ke HR, Quotation, eCatalog
- ✅ Data Summarization
- ✅ Multi-source Query
- ✅ User Context via JWT Token

## 🔧 Troubleshooting

### Redis connection error
```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Check Redis logs
redis-cli monitor
```

### OpenAI API error
- Pastikan API key valid
- Check quota OpenAI Anda
- Pastikan model yang digunakan tersedia

### Function calling tidak bekerja
- Pastikan `AI_ENABLE_FUNCTION_CALLING=true`
- Pastikan model mendukung function calling (gpt-4, gpt-4-turbo-preview)
- Check logs untuk detail error
