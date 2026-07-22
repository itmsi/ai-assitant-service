# AI Prompts Database Implementation

Dokumentasi implementasi penyimpanan System Prompt AI Assistant ke database.

## 📋 Overview

System prompt untuk AI Assistant sekarang disimpan di database (tabel `ai_prompts`) bukan lagi di file config atau environment variable. Ini memungkinkan:
- Update prompt tanpa restart server
- Versioning prompt
- Multiple prompt variants
- Management melalui admin panel (future)

## 🗄️ Database Schema

### Tabel: `ai_prompts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `key` | VARCHAR(100) | Unique key untuk identifikasi prompt (e.g., 'system_prompt_default') |
| `content` | TEXT | Isi prompt |
| `version` | VARCHAR(20) | Version prompt (default: '1.0.0') |
| `is_active` | BOOLEAN | Status aktif/tidak aktif (default: true) |
| `description` | VARCHAR(255) | Deskripsi prompt (optional) |
| `metadata` | JSON | Metadata tambahan (optional) |
| `created_at` | TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | Waktu diupdate |
| `deleted_at` | TIMESTAMP | Soft delete (nullable) |

### Indexes
- `idx_ai_prompts_key` - Index pada `key`
- `idx_ai_prompts_is_active` - Index pada `is_active`
- `idx_ai_prompts_version` - Index pada `version`
- `idx_ai_prompts_deleted_at` - Index pada `deleted_at`
- `idx_ai_prompts_created_at` - Index pada `created_at`

## 🚀 Setup

### 1. Run Migration

```bash
npm run migrate
```

Ini akan membuat tabel `ai_prompts` di database.

### 2. Run Seeder

```bash
npm run seed
```

Ini akan insert default system prompt dengan key `system_prompt_default`.

### 3. Verify

```sql
SELECT key, version, is_active, LEFT(content, 50) as content_preview 
FROM ai_prompts 
WHERE key = 'system_prompt_default';
```

## 📝 Usage

### Menggunakan Default Prompt

System prompt otomatis di-load dari database saat `processChat()` dipanggil. Tidak perlu konfigurasi tambahan.

### Mengubah Prompt

#### Via Database (Recommended)

```sql
UPDATE ai_prompts 
SET content = 'Prompt baru di sini...',
    version = '1.1.0',
    updated_at = NOW()
WHERE key = 'system_prompt_default' 
  AND is_active = true;
```

Setelah update, cache akan otomatis expire dalam 5 menit, atau bisa clear cache secara manual.

#### Via Repository (Programmatic)

```javascript
const { updatePromptByKey } = require('./src/modules/ai_assistant/ai_prompts_repository');

await updatePromptByKey('system_prompt_default', {
  content: 'Prompt baru...',
  version: '1.1.0',
});
```

### Membuat Prompt Baru

```javascript
const { createPrompt } = require('./src/modules/ai_assistant/ai_prompts_repository');

await createPrompt({
  key: 'system_prompt_custom',
  content: 'Custom prompt...',
  version: '1.0.0',
  is_active: true,
  description: 'Custom prompt untuk use case tertentu',
});
```

### Menggunakan Prompt Custom

```javascript
const { getSystemPrompt } = require('./src/modules/ai_assistant/service');

// Gunakan prompt custom
const customPrompt = await getSystemPrompt('system_prompt_custom');
```

## ⚙️ Configuration

### Environment Variables

File `.env`:

```env
# Key untuk system prompt default (optional, default: 'system_prompt_default')
AI_SYSTEM_PROMPT_KEY=system_prompt_default

# Fallback prompt jika database tidak tersedia (optional)
AI_SYSTEM_PROMPT=Fallback prompt di sini...
```

### Cache

System prompt di-cache selama 5 menit untuk menghindari query berulang ke database. Cache otomatis expire setelah 5 menit.

Untuk clear cache manual:

```javascript
const { clearSystemPromptCache } = require('./src/modules/ai_assistant/service');
clearSystemPromptCache();
```

## 🔄 Fallback Mechanism

Sistem menggunakan fallback mechanism:

1. **Database** - Coba load dari database (table `ai_prompts`)
2. **Environment Variable** - Jika database gagal, gunakan `AI_SYSTEM_PROMPT` dari `.env`
3. **Hardcoded Fallback** - Jika semua gagal, gunakan fallback hardcoded di config

Urutan prioritas:
```
Database (ai_prompts) > Environment Variable (AI_SYSTEM_PROMPT) > Hardcoded Fallback
```

## 📚 Repository Functions

### `getActivePromptByKey(key)`
Mengambil prompt aktif berdasarkan key.

```javascript
const prompt = await getActivePromptByKey('system_prompt_default');
// Returns: { id, key, content, version, is_active, ... }
```

### `getPromptByKey(key)`
Mengambil prompt berdasarkan key (any status).

### `getAllActivePrompts()`
Mengambil semua prompt yang aktif.

### `createPrompt(data)`
Membuat prompt baru.

### `updatePromptByKey(key, data)`
Update prompt berdasarkan key.

### `deactivatePromptByKey(key)`
Deactivate prompt (soft delete).

### `deletePromptByKey(key)`
Delete prompt (hard delete dengan soft delete).

## 🔍 Troubleshooting

### Prompt tidak ter-update

1. **Clear cache:**
   ```javascript
   const { clearSystemPromptCache } = require('./src/modules/ai_assistant/service');
   clearSystemPromptCache();
   ```

2. **Check database:**
   ```sql
   SELECT * FROM ai_prompts WHERE key = 'system_prompt_default';
   ```

3. **Check logs:**
   - Cari log "System prompt loaded from database"
   - Atau "Using fallback system prompt from config"

### Database connection error

Sistem akan otomatis fallback ke environment variable atau hardcoded prompt. Check logs untuk detail error.

### Migration error

```bash
# Rollback migration
npm run migrate:rollback

# Run migration lagi
npm run migrate
```

## 📊 Monitoring

### Check Prompt Usage

```sql
-- Lihat semua prompt aktif
SELECT key, version, is_active, created_at, updated_at 
FROM ai_prompts 
WHERE is_active = true AND deleted_at IS NULL;

-- Lihat history perubahan prompt
SELECT key, version, created_at, updated_at 
FROM ai_prompts 
WHERE key = 'system_prompt_default' 
ORDER BY version DESC;
```

## 🔐 Best Practices

1. **Versioning**: Selalu update version saat mengubah prompt
2. **Testing**: Test prompt baru sebelum set sebagai active
3. **Backup**: Backup prompt sebelum update besar
4. **Documentation**: Update description saat membuat prompt baru
5. **Cache**: Clear cache setelah update prompt penting

## 🚀 Future Enhancements

- [ ] Admin panel untuk manage prompts
- [ ] A/B testing untuk prompt variants
- [ ] Prompt templates
- [ ] Prompt analytics (usage, performance)
- [ ] Multi-language prompts
- [ ] Prompt scheduling (active at specific times)

---

**Dibuat**: 2025-01-20  
**Versi**: 1.0.0

