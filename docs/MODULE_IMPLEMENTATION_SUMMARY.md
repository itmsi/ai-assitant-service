# Ringkasan Implementasi Module AI Assistant

Dokumentasi ini menjelaskan semua module yang telah diimplementasikan untuk AI Assistant Service, memungkinkan AI untuk mengakses data dari berbagai module di sistem SSO.

## 📊 Status Implementasi

### ✅ Module yang Sudah Diimplementasikan

1. **Power BI** - 3 tools
2. **Quotation** - 7 tools (termasuk yang sudah ada sebelumnya)
3. **CRM** - 6 tools
4. **Employee** - 3 tools
5. **HR** - 2 tools (sudah ada sebelumnya)
6. **eCatalog** - 1 tool (sudah ada sebelumnya)

**Total: 22 tools khusus + 1 tool generic (`call_gateway_endpoint`)**

---

## 🔧 Detail Implementasi

### 1. Power BI Module

#### Tools yang Tersedia:

1. **`search_powerbi_dashboard`**
   - **Deskripsi**: Mencari data Power BI dashboard berdasarkan status
   - **Endpoint**: `POST /api/powerbi/dashboard`
   - **Parameters**:
     - `status` (string): Status dashboard (active, inactive)
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 1000)
   - **Contoh penggunaan**: "Tampilkan dashboard Power BI yang aktif"

2. **`search_powerbi_category`**
   - **Deskripsi**: Mencari kategori Power BI
   - **Endpoint**: `POST /api/categories/get`
   - **Parameters**:
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 1000)
   - **Contoh penggunaan**: "Tampilkan semua kategori Power BI"

3. **`search_powerbi_manage`**
   - **Deskripsi**: Mencari data manajemen Power BI
   - **Endpoint**: `POST /api/powerbi/get`
   - **Parameters**:
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 1000)
   - **Contoh penggunaan**: "Tampilkan pengaturan Power BI"

---

### 2. Quotation Module

#### Tools yang Tersedia:

1. **`search_quotations`** (sudah ada sebelumnya)
   - **Deskripsi**: Mencari data quotation berdasarkan nomor, status, atau periode
   - **Endpoint**: `POST /api/quotation/manage-quotation/get`
   - **Parameters**:
     - `quotationNumber` (string): Nomor quotation
     - `status` (string): Status quotation
     - `startDate` (string): Tanggal mulai (YYYY-MM-DD)
     - `endDate` (string): Tanggal akhir (YYYY-MM-DD)
     - `limit` (number): Jumlah maksimal hasil (default: 10)
   - **Contoh penggunaan**: "Tampilkan 5 quotation terbaru minggu ini"

2. **`search_quotation_products`** (BARU)
   - **Deskripsi**: Mencari data produk quotation (component product)
   - **Endpoint**: `POST /api/quotation/componen_product/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian produk
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Cari produk quotation dengan keyword 'engine'"

3. **`search_quotation_accessory`** (BARU)
   - **Deskripsi**: Mencari data aksesori quotation
   - **Endpoint**: `POST /api/quotation/accessory/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian aksesori
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Tampilkan aksesori quotation"

4. **`search_quotation_term_condition`** (BARU)
   - **Deskripsi**: Mencari data term dan condition quotation
   - **Endpoint**: `POST /api/quotation/term_content/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian term condition
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Tampilkan term condition quotation"

5. **`search_quotation_customer`** (BARU)
   - **Deskripsi**: Mencari data customer quotation
   - **Endpoint**: `POST /api/customers/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian customer
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Cari customer quotation dengan nama 'PT ABC'"

6. **`search_quotation_bank_account`** (BARU)
   - **Deskripsi**: Mencari data bank account quotation
   - **Endpoint**: `POST /api/bank_accounts/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian bank account
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Tampilkan bank account untuk quotation"

7. **`search_quotation_island`** (BARU)
   - **Deskripsi**: Mencari data pulau (island) untuk quotation
   - **Endpoint**: `POST /api/island/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian island
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Tampilkan daftar pulau untuk quotation"

---

### 3. CRM Module

#### Tools yang Tersedia:

1. **`search_crm_territory`** (BARU)
   - **Deskripsi**: Mencari data territory management CRM
   - **Endpoint**: `POST /api/crm/territory/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian territory
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
     - `is_admin` (string): Filter admin (true/false)
   - **Contoh penggunaan**: "Tampilkan data territory management CRM"

2. **`search_crm_iup_management`** (BARU)
   - **Deskripsi**: Mencari data IUP (Izin Usaha Pertambangan) management CRM
   - **Endpoint**: `POST /api/crm/iup_management/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian IUP
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 1000)
     - `sort_by` (string): Field untuk sorting (default: updated_at)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
     - `status` (string): Status IUP
     - `is_admin` (string): Filter admin (true/false)
     - `segmentation_id` (string): ID segmentasi
   - **Contoh penggunaan**: "Cari data IUP management dengan status aktif"

3. **`search_crm_segmentation`** (BARU)
   - **Deskripsi**: Mencari data segmentasi CRM
   - **Endpoint**: `POST /api/crm/segmentation/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian segmentasi
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
     - `is_admin` (string): Filter admin (true/false)
   - **Contoh penggunaan**: "Tampilkan segmentasi customer CRM"

4. **`search_crm_iup_customers`** (BARU)
   - **Deskripsi**: Mencari data customer atau contractor IUP CRM
   - **Endpoint**: `POST /api/crm/iup_customers/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian customer
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
     - `mine_type` (string): Jenis tambang
     - `status` (string): Status customer
     - `is_admin` (string): Filter admin (true/false)
   - **Contoh penggunaan**: "Cari customer IUP dengan jenis tambang batubara"

5. **`search_crm_transactions`** (BARU)
   - **Deskripsi**: Mencari data transaksi atau aktivitas CRM
   - **Endpoint**: `POST /api/crm/transactions/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian transaksi
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_by` (string): Field untuk sorting (default: updated_at)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
   - **Contoh penggunaan**: "Tampilkan transaksi CRM terbaru"

6. **`search_crm_employee_data_access`** (BARU)
   - **Deskripsi**: Mencari data akses employee CRM (User Management)
   - **Endpoint**: `POST /api/crm/employee-data-access/get`
   - **Parameters**:
     - `search` (string): Keyword pencarian employee
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_order` (string): Urutan sorting (asc/desc, default: desc)
     - `is_admin` (string): Filter admin (true/false)
   - **Contoh penggunaan**: "Tampilkan user management CRM"

---

### 4. Employee Module

#### Tools yang Tersedia:

1. **`search_hr_employees`** (sudah ada sebelumnya)
   - **Deskripsi**: Mencari data karyawan dari modul HR
   - **Endpoint**: `POST /api/employees/get`
   - **Parameters**:
     - `name` (string): Nama karyawan
     - `department` (string): Departemen karyawan
     - `status` (string): Status karyawan
     - `limit` (number): Jumlah maksimal hasil (default: 10)
   - **Contoh penggunaan**: "Tampilkan 10 employee terbaru"

2. **`search_employee_company`** (BARU)
   - **Deskripsi**: Mencari data company employee
   - **Endpoint**: `POST /api/companies/get`
   - **Parameters**:
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_by` (string): Field untuk sorting (default: created_at)
   - **Contoh penggunaan**: "Tampilkan daftar company"

3. **`search_employee_department`** (BARU)
   - **Deskripsi**: Mencari data department employee
   - **Endpoint**: `POST /api/departments/get`
   - **Parameters**:
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 100)
     - `sort_by` (string): Field untuk sorting (default: created_at)
   - **Contoh penggunaan**: "Tampilkan semua departemen"

4. **`search_employee_title`** (BARU)
   - **Deskripsi**: Mencari data title/jabatan employee
   - **Endpoint**: `POST /api/titles/get`
   - **Parameters**:
     - `page` (number): Nomor halaman (default: 1)
     - `limit` (number): Jumlah maksimal hasil (default: 1000)
   - **Contoh penggunaan**: "Tampilkan semua jabatan employee"

---

## 📝 Endpoint yang Ditambahkan ke GATEWAY_ALLOWED_PREFIXES

Berikut endpoint baru yang ditambahkan ke daftar allowed prefixes:

```javascript
// Power BI endpoints
'/api/powerbi/dashboard',

// CRM endpoints
'/api/crm/territory',
'/api/crm/territory/get',
'/api/crm/iup_management',
'/api/crm/iup_management/get',
'/api/crm/segmentation',
'/api/crm/segmentation/get',
'/api/crm/iup_customers',
'/api/crm/iup_customers/get',
'/api/crm/transactions',
'/api/crm/transactions/get',
'/api/crm/employee-data-access',
'/api/crm/employee-data-access/get',

// Island endpoint
'/api/island',
'/api/island/get',
```

**Catatan**: Endpoint untuk Quotation, Employee, dan Power BI lainnya sudah ada sebelumnya di daftar.

---

## 🚀 Cara Menggunakan

### Melalui AI Assistant Chat

User dapat bertanya dalam bahasa natural, dan AI akan otomatis memilih tool yang sesuai:

**Contoh pertanyaan:**
- "Tampilkan 5 quotation terbaru minggu ini"
- "Cari dashboard Power BI yang aktif"
- "Tampilkan data IUP management CRM"
- "Cari customer quotation dengan nama 'PT ABC'"
- "Tampilkan semua departemen employee"
- "Cari transaksi CRM terbaru"

### Melalui API Call Langsung

Semua tools juga dapat diakses melalui tool `call_gateway_endpoint`:

```json
{
  "path": "/api/powerbi/dashboard",
  "method": "POST",
  "body": {
    "page": 1,
    "limit": 1000,
    "status": "active"
  }
}
```

---

## ✅ Checklist Implementasi

- [x] Update `GATEWAY_ALLOWED_PREFIXES` dengan endpoint baru
- [x] Buat tools khusus untuk Power BI (3 tools)
- [x] Buat tools khusus untuk Quotation (6 tools baru)
- [x] Buat tools khusus untuk CRM (6 tools)
- [x] Buat tools khusus untuk Employee (3 tools)
- [x] Update `getToolsForLangChain()` untuk menambahkan semua tools baru
- [x] Update `executeTool()` untuk mapping tools baru
- [x] Update system prompt untuk menjelaskan module-module baru
- [x] Export semua tools baru di module.exports
- [x] Buat dokumentasi lengkap

---

## 🔍 Testing

Untuk menguji implementasi, gunakan curl request berikut:

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

Atau coba pertanyaan lain:
- "Tampilkan dashboard Power BI yang aktif"
- "Cari data IUP management CRM"
- "Tampilkan semua departemen employee"

---

## 📌 Catatan Penting

1. **Semua tools menggunakan POST method** untuk endpoint yang berakhiran `/get`
2. **Authorization token** otomatis ditambahkan dari header request user
3. **Default limit** diset untuk mencegah response yang terlalu besar
4. **Error handling** sudah diimplementasikan di setiap tool
5. **Logging** dilakukan untuk debugging dan monitoring

---

## 🔄 Update Selanjutnya

Jika ada module baru yang perlu ditambahkan:

1. Tambahkan endpoint ke `GATEWAY_ALLOWED_PREFIXES`
2. Buat tool baru dengan format yang sama
3. Tambahkan ke `getToolsForLangChain()`
4. Tambahkan ke `executeTool()` mapping
5. Update system prompt jika perlu
6. Update dokumentasi ini

---

**Dibuat**: 2025-01-XX  
**Versi**: 1.0.0  
**Status**: ✅ Selesai

