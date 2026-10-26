/**
 * Swagger Path Definitions untuk modul AI Admin
 * Base path: /ai-admin (mount di bawah /api/mosa/)
 * Semua endpoint kecuali /login wajib token dari /ai-admin/login (Bearer)
 */

const TAG_AUTH = 'AI Admin - Auth';
const TAG_MONITORING = 'AI Admin - Monitoring';
const TAG_PROVIDER = 'AI Admin - Provider';
const TAG_MODEL = 'AI Admin - Model';
const TAG_PROMPT = 'AI Admin - Prompt';
const TAG_SETTINGS = 'AI Admin - Settings';

const security = [{ bearerAuth: [] }];

const json = (description, schema) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` }
    }
  }
});

const body = (schema) => ({
  required: true,
  content: {
    'application/json': {
      schema: typeof schema === 'string' ? { $ref: `#/components/schemas/${schema}` } : schema
    }
  }
});

const error = (description) => json(description, 'AiAdminErrorResponse');

const unauthorized = error('Token tidak ada, tidak valid, atau kedaluwarsa');
const serverError = error('Terjadi kesalahan internal server / database tidak bisa dihubungi (503)');

const idParam = (description, example) => ({
  name: 'id',
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
  example
});

const providerId = idParam('ID provider (UUID)', '6f1c2d4e-8a9b-4c1d-9e2f-3a4b5c6d7e8f');
const modelId = idParam('ID model di tabel ai_models (UUID), bukan model_id provider', '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e');
const promptKey = {
  name: 'key',
  in: 'path',
  required: true,
  description: 'Key prompt',
  schema: { type: 'string' },
  example: 'system_prompt_default'
};

const aiAdminPaths = {
  // =============================================
  // Auth
  // =============================================
  '/ai-admin/login': {
    post: {
      tags: [TAG_AUTH],
      summary: 'Login admin AI',
      description: 'Login memakai ADMIN_USERNAME / ADMIN_PASSWORD dari .env. Dibatasi 10 percobaan per 15 menit per IP.',
      requestBody: body('AiAdminLoginRequest'),
      responses: {
        200: json('Login berhasil, token JWT dikembalikan', 'AiAdminLoginResponse'),
        401: error('Username atau password salah'),
        429: error('Terlalu banyak percobaan login'),
        503: error('Login admin belum dikonfigurasi (ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET)')
      }
    }
  },
  '/ai-admin/me': {
    get: {
      tags: [TAG_AUTH],
      summary: 'Info admin yang sedang login',
      security,
      responses: {
        200: json('Data admin', 'AiAdminMeResponse'),
        401: unauthorized
      }
    }
  },

  // =============================================
  // Monitoring
  // =============================================
  '/ai-admin/overview': {
    get: {
      tags: [TAG_MONITORING],
      summary: 'Ringkasan monitoring AI',
      description: 'Statistik panggilan model (total, sukses, latency, token), per model, timeline, error terbaru, transkripsi, percakapan, kandidat model aktif, pengaturan, dan cooldown.',
      security,
      parameters: [
        {
          name: 'range',
          in: 'query',
          required: false,
          description: 'Rentang waktu (default 24h)',
          schema: { type: 'string', enum: ['1h', '24h', '7d', '30d'], default: '24h' }
        }
      ],
      responses: {
        200: json('Ringkasan monitoring', 'AiAdminOverviewResponse'),
        401: unauthorized,
        500: serverError
      }
    }
  },
  '/ai-admin/logs': {
    get: {
      tags: [TAG_MONITORING],
      summary: 'Daftar log panggilan model AI',
      description: 'Log terbaru lebih dulu, dengan paginasi dan filter.',
      security,
      parameters: [
        { name: 'page', in: 'query', required: false, description: 'Halaman (default 1)', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', required: false, description: 'Jumlah per halaman (default 50, maks 200)', schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 } },
        { name: 'purpose', in: 'query', required: false, description: 'Filter kegunaan', schema: { type: 'string' }, example: 'chat' },
        { name: 'success', in: 'query', required: false, description: 'Filter status', schema: { type: 'string', enum: ['true', 'false'] } },
        { name: 'model', in: 'query', required: false, description: 'Cari model_id (case-insensitive, sebagian)', schema: { type: 'string' }, example: 'gpt' }
      ],
      responses: {
        200: json('Daftar log', 'AiAdminLogListResponse'),
        401: unauthorized,
        500: serverError
      }
    }
  },

  // =============================================
  // Providers
  // =============================================
  '/ai-admin/providers': {
    get: {
      tags: [TAG_PROVIDER],
      summary: 'List provider AI',
      description: 'Daftar provider beserta jumlah model. API key hanya ditampilkan 4 karakter terakhir.',
      security,
      responses: {
        200: json('Daftar provider', 'AiAdminProviderListResponse'),
        401: unauthorized,
        500: serverError
      }
    },
    post: {
      tags: [TAG_PROVIDER],
      summary: 'Tambah provider AI',
      description: 'Base URL OpenAI-compatible. Akhiran /chat/completions otomatis dibuang.',
      security,
      requestBody: body('AiAdminProviderRequest'),
      responses: {
        201: json('Provider ditambahkan', 'AiAdminProviderResponse'),
        400: error('Validasi gagal'),
        401: unauthorized,
        409: error('Kode provider sudah ada'),
        500: serverError
      }
    }
  },
  '/ai-admin/providers/{id}': {
    put: {
      tags: [TAG_PROVIDER],
      summary: 'Ubah provider AI',
      description: 'Hanya field yang dikirim yang diubah. api_key kosong = tidak berubah, clear_api_key = true untuk menghapus.',
      security,
      parameters: [providerId],
      requestBody: body('AiAdminProviderRequest'),
      responses: {
        200: json('Provider diperbarui', 'AiAdminProviderResponse'),
        400: error('Validasi gagal / format ID tidak valid'),
        401: unauthorized,
        404: error('Provider tidak ditemukan'),
        409: error('Kode provider sudah ada'),
        500: serverError
      }
    },
    delete: {
      tags: [TAG_PROVIDER],
      summary: 'Hapus provider AI',
      description: 'Menghapus provider beserta semua modelnya.',
      security,
      parameters: [providerId],
      responses: {
        200: json('Provider beserta modelnya dihapus', 'AiAdminSuccessResponse'),
        401: unauthorized,
        404: error('Provider tidak ditemukan'),
        500: serverError
      }
    }
  },
  '/ai-admin/providers/{id}/remote-models': {
    get: {
      tags: [TAG_PROVIDER],
      summary: 'Ambil daftar model dari provider',
      description: 'Memanggil GET {base_url}/models milik provider. Field exists menandakan model sudah terdaftar.',
      security,
      parameters: [providerId],
      responses: {
        200: json('Daftar model dari provider', 'AiAdminRemoteModelListResponse'),
        401: unauthorized,
        404: error('Provider tidak ditemukan'),
        502: error('Gagal mengambil daftar model dari provider'),
        500: serverError
      }
    }
  },

  // =============================================
  // Models
  // =============================================
  '/ai-admin/models': {
    get: {
      tags: [TAG_MODEL],
      summary: 'List model AI',
      description: 'Diurutkan berdasarkan priority (kecil dicoba lebih dulu saat fallback).',
      security,
      responses: {
        200: json('Daftar model', 'AiAdminModelListResponse'),
        401: unauthorized,
        500: serverError
      }
    },
    post: {
      tags: [TAG_MODEL],
      summary: 'Tambah model AI (satu atau banyak)',
      description: 'Body berupa satu objek atau array (1-200 item). Model yang sudah ada (provider_id + model_id sama) dilewati.',
      security,
      requestBody: body({
        oneOf: [
          { $ref: '#/components/schemas/AiAdminModelRequest' },
          { type: 'array', minItems: 1, maxItems: 200, items: { $ref: '#/components/schemas/AiAdminModelRequest' } }
        ]
      }),
      responses: {
        201: json('Model ditambahkan', 'AiAdminModelListResponse'),
        400: error('Validasi gagal / provider tidak ditemukan'),
        401: unauthorized,
        500: serverError
      }
    }
  },
  '/ai-admin/models/{id}': {
    put: {
      tags: [TAG_MODEL],
      summary: 'Ubah model AI',
      description: 'Hanya field yang dikirim yang diubah.',
      security,
      parameters: [modelId],
      requestBody: body('AiAdminModelRequest'),
      responses: {
        200: json('Model diperbarui', 'AiAdminModelResponse'),
        400: error('Validasi gagal / format ID tidak valid'),
        401: unauthorized,
        404: error('Model tidak ditemukan'),
        409: error('Model dengan provider dan model_id sama sudah ada'),
        500: serverError
      }
    },
    delete: {
      tags: [TAG_MODEL],
      summary: 'Hapus model AI',
      security,
      parameters: [modelId],
      responses: {
        200: json('Model dihapus', 'AiAdminSuccessResponse'),
        401: unauthorized,
        404: error('Model tidak ditemukan'),
        500: serverError
      }
    }
  },
  '/ai-admin/models/{id}/test': {
    post: {
      tags: [TAG_MODEL],
      summary: 'Tes model AI',
      description: 'Mengirim prompt singkat ke satu model tanpa fallback. Selalu HTTP 200 jika model ada; cek data.ok untuk hasil tes.',
      security,
      parameters: [modelId],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AiAdminModelTestRequest' }
          }
        }
      },
      responses: {
        200: json('Hasil tes model', 'AiAdminModelTestResponse'),
        400: error('Provider model ini belum punya API key'),
        401: unauthorized,
        404: error('Model tidak ditemukan'),
        500: serverError
      }
    }
  },

  // =============================================
  // Prompts
  // =============================================
  '/ai-admin/prompts': {
    get: {
      tags: [TAG_PROMPT],
      summary: 'List prompt',
      description: 'Daftar prompt (tanpa yang dihapus). Field used_for_chat menandakan prompt yang dipakai chat.',
      security,
      responses: {
        200: json('Daftar prompt', 'AiAdminPromptListResponse'),
        401: unauthorized,
        500: serverError
      }
    },
    post: {
      tags: [TAG_PROMPT],
      summary: 'Tambah prompt',
      description: 'Key yang pernah dihapus akan dihidupkan kembali.',
      security,
      requestBody: body('AiAdminPromptCreateRequest'),
      responses: {
        201: json('Prompt ditambahkan', 'AiAdminPromptResponse'),
        400: error('Validasi gagal'),
        401: unauthorized,
        409: error('Prompt dengan key sama sudah ada'),
        500: serverError
      }
    }
  },
  '/ai-admin/prompts/{key}': {
    put: {
      tags: [TAG_PROMPT],
      summary: 'Ubah prompt',
      description: 'Jika isi berubah, isi lama disimpan ke riwayat dan versi patch naik otomatis. Prompt yang dipakai chat tidak bisa dinonaktifkan.',
      security,
      parameters: [promptKey],
      requestBody: body('AiAdminPromptUpdateRequest'),
      responses: {
        200: json('Prompt disimpan', 'AiAdminPromptResponse'),
        400: error('Validasi gagal / prompt sedang dipakai chat'),
        401: unauthorized,
        404: error('Prompt tidak ditemukan'),
        500: serverError
      }
    },
    delete: {
      tags: [TAG_PROMPT],
      summary: 'Hapus prompt (soft delete)',
      description: 'Prompt yang sedang dipakai chat tidak bisa dihapus.',
      security,
      parameters: [promptKey],
      responses: {
        200: json('Prompt dihapus', 'AiAdminSuccessResponse'),
        400: error('Prompt sedang dipakai chat'),
        401: unauthorized,
        404: error('Prompt tidak ditemukan'),
        500: serverError
      }
    }
  },
  '/ai-admin/prompts/{key}/history': {
    get: {
      tags: [TAG_PROMPT],
      summary: 'Riwayat perubahan prompt',
      description: 'Maksimal 50 riwayat terbaru.',
      security,
      parameters: [promptKey],
      responses: {
        200: json('Riwayat prompt', 'AiAdminPromptHistoryListResponse'),
        401: unauthorized,
        500: serverError
      }
    }
  },
  '/ai-admin/prompts/{key}/restore/{historyId}': {
    post: {
      tags: [TAG_PROMPT],
      summary: 'Kembalikan prompt ke versi riwayat',
      description: 'Isi prompt diganti dengan isi riwayat; isi saat ini masuk riwayat dan versi naik.',
      security,
      parameters: [
        promptKey,
        {
          name: 'historyId',
          in: 'path',
          required: true,
          description: 'ID riwayat prompt (UUID)',
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: json('Prompt dikembalikan', 'AiAdminPromptResponse'),
        400: error('Format ID tidak valid'),
        401: unauthorized,
        404: error('Prompt atau riwayat tidak ditemukan'),
        500: serverError
      }
    }
  },

  // =============================================
  // Settings
  // =============================================
  '/ai-admin/settings': {
    get: {
      tags: [TAG_SETTINGS],
      summary: 'Ambil pengaturan runtime AI',
      security,
      responses: {
        200: json('Pengaturan', 'AiAdminSettingsResponse'),
        401: unauthorized,
        500: serverError
      }
    },
    put: {
      tags: [TAG_SETTINGS],
      summary: 'Ubah pengaturan runtime AI',
      description: 'Prompt chat dan mode fallback. Berlaku di container lain dalam AI_CONFIG_CACHE_TTL_MS.',
      security,
      requestBody: body('AiAdminSettingsRequest'),
      responses: {
        200: json('Pengaturan disimpan', 'AiAdminSettingsResponse'),
        400: error('Prompt chat harus prompt yang ada dan aktif'),
        401: unauthorized,
        500: serverError
      }
    }
  }
};

module.exports = aiAdminPaths;
