# Customer Validation Module

Module untuk validasi duplikat nama customer menggunakan AI.

## 📁 Struktur File

```
src/modules/customer_validation/
├── handler.js              # Request handlers / Controllers
├── service.js              # Business logic (database & AI integration)
├── validation.js           # Input validation rules
├── index.js               # Route definitions
└── README.md              # Dokumentasi module (ini)
```

## 🎯 Fitur

Module ini menyediakan:
- ✅ Validasi duplikat nama customer menggunakan AI
- ✅ Query data customer dari database external menggunakan dblink
- ✅ Deteksi nama yang identik, menyerupai, atau kembar
- ✅ Input validation dengan express-validator
- ✅ Error handling yang konsisten
- ✅ Response format yang standar
- ✅ Swagger/OpenAPI documentation

## 🔌 API Endpoints

### Validate Duplicate Customer Names

```http
POST /api/customer-validation/validate-duplicate
```

**Request Body:**
```json
{
  "customer_name": [
    "PT Motor Sights International",
    "PT MSI",
    "Motor Sights"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasDuplicates": true,
    "duplicates": [
      {
        "requestName": "PT Motor Sights International",
        "matchedName": "PT Motor Sights Intl",
        "matchType": "similar",
        "similarity": "85%"
      }
    ],
    "message": "Ditemukan 1 nama customer yang duplikat",
    "requestCount": 3
  },
  "message": "Ditemukan 1 nama customer yang duplikat"
}
```

## ⚙️ Konfigurasi

Module ini memerlukan konfigurasi berikut di file `.env`:

```env
# Database Gate SSO Configuration (untuk dblink)
DB_GATE_SSO_HOST=localhost
DB_GATE_SSO_PORT=5432
DB_GATE_SSO_NAME=gate_sso
DB_GATE_SSO_USER=msiserver
DB_GATE_SSO_PASSWORD=your_password

# AI Configuration (sudah ada di config/ai.js)
AI_ENABLED=true
AI_MODEL_PROVIDER=openai
OPENAI_API_KEY=your_api_key
```

## 🔧 Prerequisites

1. **PostgreSQL dblink Extension**: 
   - Extension `dblink` harus diaktifkan di database utama
   - Jalankan: `CREATE EXTENSION IF NOT EXISTS dblink;` (jika belum ada)

2. **Database Access**:
   - Database utama harus memiliki akses ke database `gate_sso`
   - User database harus memiliki permission untuk menggunakan dblink

3. **AI Service**:
   - AI service harus dikonfigurasi dan aktif
   - Bisa menggunakan OpenAI atau Sumopod

## 📊 Proses Validasi

1. **Get Data dari Database**: 
   - Module akan mengambil data customer dari database `gate_sso` menggunakan dblink
   - Query: `SELECT customer_name FROM customers WHERE is_delete = false`

2. **AI Validation**:
   - Data dari request dibandingkan dengan data dari database
   - AI akan mengidentifikasi:
     - Nama yang **identik** (sama persis)
     - Nama yang **menyerupai** (hampir sama, typo, variasi)
     - Nama yang **kembar** (duplikat dengan variasi kecil)

3. **Response**:
   - Sistem akan mengembalikan list nama customer yang duplikat beserta tipe match-nya

## 🛠️ Error Handling

Module ini menangani berbagai error:
- Database connection error
- dblink extension error
- AI service error
- Invalid input validation
- JSON parsing error dari AI response

## 📝 Catatan

- Module ini menggunakan AI untuk validasi, sehingga hasilnya bisa bervariasi
- Untuk hasil yang lebih akurat, pastikan AI model yang digunakan sudah terlatih dengan baik
- dblink memerlukan akses network ke database target
- Pastikan kredensial database sudah benar dan aman

