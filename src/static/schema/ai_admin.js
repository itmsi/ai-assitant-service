/**
 * Swagger Schemas untuk modul AI Admin (provider, model, prompt, settings, monitoring)
 */

const aiAdminSchemas = {
  // =============================================
  // Umum
  // =============================================
  AiAdminSuccessResponse: {
    type: 'object',
    description: 'Response sukses tanpa data (contoh: hapus)',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Provider beserta modelnya dihapus' },
      data: { nullable: true, example: null }
    }
  },
  AiAdminErrorResponse: {
    type: 'object',
    description: 'Response error modul AI Admin',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Provider tidak ditemukan' }
    }
  },

  // =============================================
  // Auth
  // =============================================
  AiAdminLoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    description: 'Kredensial admin (ADMIN_USERNAME / ADMIN_PASSWORD di .env)',
    properties: {
      username: { type: 'string', example: 'admin' },
      password: { type: 'string', format: 'password', example: 'rahasia' }
    }
  },
  AiAdminLoginResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT dengan scope ai-admin (default berlaku 12 jam, AI_ADMIN_TOKEN_EXPIRES_IN)',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          username: { type: 'string', example: 'admin' }
        }
      }
    }
  },
  AiAdminMeResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'admin' }
        }
      }
    }
  },

  // =============================================
  // Providers
  // =============================================
  AiAdminProvider: {
    type: 'object',
    description: 'Provider AI OpenAI-compatible. API key tidak pernah dikirim utuh',
    properties: {
      id: { type: 'string', format: 'uuid', example: '6f1c2d4e-8a9b-4c1d-9e2f-3a4b5c6d7e8f' },
      code: { type: 'string', description: 'Kode unik huruf kecil, dipakai di log', example: 'sumopod' },
      name: { type: 'string', example: 'Sumopod' },
      base_url: { type: 'string', description: 'Base URL tanpa /chat/completions', example: 'https://ai.sumopod.com/v1' },
      api_key_env: { type: 'string', nullable: true, description: 'Nama variabel .env yang berisi API key', example: 'SUMOPOD_API_KEY' },
      requires_key: { type: 'boolean', example: true },
      enabled: { type: 'boolean', example: true },
      extra_headers: { type: 'object', additionalProperties: { type: 'string' }, example: { 'X-Title': 'MSI' } },
      notes: { type: 'string', nullable: true, example: 'Seed dari .env (SUMOPOD_*)' },
      model_count: { type: 'integer', description: 'Jumlah model (hanya di list)', example: 2 },
      has_key: { type: 'boolean', description: 'API key tersedia (DB atau env)', example: true },
      key_source: { type: 'string', nullable: true, enum: ['database', 'env', null], example: 'env' },
      key_preview: { type: 'string', nullable: true, description: '4 karakter terakhir API key', example: '…a1b2' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  AiAdminProviderRequest: {
    type: 'object',
    required: ['code', 'name', 'base_url'],
    description: 'Body tambah/ubah provider. Saat update (PUT) semua field opsional',
    properties: {
      code: { type: 'string', description: 'Huruf kecil, angka, - atau _ (maks 50)', example: 'openrouter' },
      name: { type: 'string', example: 'OpenRouter' },
      base_url: { type: 'string', description: 'Harus diawali http:// atau https://', example: 'https://openrouter.ai/api/v1' },
      api_key: { type: 'string', description: 'Isi = simpan ke DB, kosong/tidak dikirim = tidak berubah', example: 'sk-or-xxxx' },
      clear_api_key: { type: 'boolean', description: 'true = hapus API key yang tersimpan di DB', example: false },
      api_key_env: { type: 'string', nullable: true, description: 'Nama variabel .env berisi API key', example: 'OPENROUTER_API_KEY' },
      requires_key: { type: 'boolean', default: true, example: true },
      enabled: { type: 'boolean', default: true, example: true },
      extra_headers: { type: 'object', additionalProperties: { type: 'string' }, example: { 'X-Title': 'MSI' } },
      notes: { type: 'string', nullable: true, example: 'Provider cadangan' }
    }
  },
  AiAdminProviderResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Provider ditambahkan' },
      data: { $ref: '#/components/schemas/AiAdminProvider' }
    }
  },
  AiAdminProviderListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: { type: 'array', items: { $ref: '#/components/schemas/AiAdminProvider' } }
    }
  },
  AiAdminRemoteModelListResponse: {
    type: 'object',
    description: 'Daftar model dari GET {base_url}/models milik provider',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'gpt-5.4' },
            exists: { type: 'boolean', description: 'Model sudah terdaftar di provider ini', example: false }
          }
        }
      }
    }
  },

  // =============================================
  // Models
  // =============================================
  AiAdminModel: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' },
      provider_id: { type: 'string', format: 'uuid', example: '6f1c2d4e-8a9b-4c1d-9e2f-3a4b5c6d7e8f' },
      model_id: { type: 'string', description: 'ID model persis seperti di provider', example: 'gpt-5.4' },
      label: { type: 'string', nullable: true, example: 'Model utama Sumopod' },
      purposes: { type: 'array', items: { type: 'string', enum: ['chat', 'analysis'] }, example: ['chat', 'analysis'] },
      enabled: { type: 'boolean', example: true },
      priority: { type: 'integer', description: 'Urutan fallback, kecil dicoba lebih dulu', example: 10 },
      temperature: { type: 'number', nullable: true, example: 0.85 },
      max_tokens: { type: 'integer', nullable: true, example: 16000 },
      timeout_ms: { type: 'integer', example: 120000 },
      provider_name: { type: 'string', description: 'Hanya di list', example: 'Sumopod' },
      provider_code: { type: 'string', description: 'Hanya di list', example: 'sumopod' },
      provider_enabled: { type: 'boolean', description: 'Hanya di list', example: true },
      provider_has_key: { type: 'boolean', description: 'Hanya di list', example: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  AiAdminModelRequest: {
    type: 'object',
    required: ['provider_id', 'model_id'],
    description: 'Body tambah/ubah model. Saat update (PUT) semua field opsional',
    properties: {
      provider_id: { type: 'string', format: 'uuid', example: '6f1c2d4e-8a9b-4c1d-9e2f-3a4b5c6d7e8f' },
      model_id: { type: 'string', example: 'gpt-5.4' },
      label: { type: 'string', nullable: true, example: 'Model utama' },
      purposes: {
        type: 'array',
        items: { type: 'string', enum: ['chat', 'analysis'] },
        default: ['chat'],
        example: ['chat']
      },
      enabled: { type: 'boolean', default: true, example: true },
      priority: { type: 'integer', minimum: 0, maximum: 100000, default: 100, example: 10 },
      temperature: { type: 'number', nullable: true, minimum: 0, maximum: 2, example: 0.7 },
      max_tokens: { type: 'integer', nullable: true, minimum: 1, maximum: 2000000, example: 16000 },
      timeout_ms: { type: 'integer', minimum: 1000, maximum: 600000, default: 120000, example: 120000 }
    }
  },
  AiAdminModelResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Model diperbarui' },
      data: { $ref: '#/components/schemas/AiAdminModel' }
    }
  },
  AiAdminModelListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: '2 model ditambahkan' },
      data: { type: 'array', items: { $ref: '#/components/schemas/AiAdminModel' } }
    }
  },
  AiAdminModelTestRequest: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Prompt uji (default: "Balas hanya dengan kata: OK")', example: 'Halo, siapa kamu?' }
    }
  },
  AiAdminModelTestResponse: {
    type: 'object',
    description: 'Hasil tes model. Selalu HTTP 200; cek data.ok untuk hasilnya',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          ms: { type: 'integer', description: 'Waktu respons (ms)', example: 842 },
          text: { type: 'string', description: 'Jawaban model (maks 500 karakter, hanya jika ok)', example: 'OK' },
          usage: {
            type: 'object',
            nullable: true,
            example: { prompt_tokens: 12, completion_tokens: 1, total_tokens: 13 }
          },
          error: { type: 'string', description: 'Pesan error (hanya jika gagal)', example: 'HTTP 401: Invalid API key' }
        }
      }
    }
  },

  // =============================================
  // Prompts
  // =============================================
  AiAdminPrompt: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      key: { type: 'string', example: 'system_prompt_default' },
      version: { type: 'string', example: '1.0.3' },
      is_active: { type: 'boolean', example: true },
      description: { type: 'string', nullable: true, example: 'System prompt utama chat' },
      content: { type: 'string', example: 'Kamu adalah asisten AI Motor Sights...' },
      used_for_chat: { type: 'boolean', description: 'Prompt dipakai chat saat ini (hanya di list)', example: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  AiAdminPromptCreateRequest: {
    type: 'object',
    required: ['key', 'content'],
    properties: {
      key: { type: 'string', description: 'Huruf kecil, angka, titik, - atau _ (maks 100)', example: 'system_prompt_sales' },
      content: { type: 'string', example: 'Kamu adalah asisten penjualan...' },
      description: { type: 'string', nullable: true, maxLength: 255, example: 'Prompt untuk tim sales' },
      is_active: { type: 'boolean', default: true, example: true },
      version: { type: 'string', description: 'Format x.y.z', default: '1.0.0', example: '1.0.0' }
    }
  },
  AiAdminPromptUpdateRequest: {
    type: 'object',
    description: 'Semua field opsional. Jika content berubah, isi lama masuk riwayat dan versi naik otomatis (kecuali version dikirim)',
    properties: {
      content: { type: 'string', example: 'Kamu adalah asisten penjualan yang ramah...' },
      description: { type: 'string', nullable: true, maxLength: 255, example: 'Prompt untuk tim sales' },
      is_active: { type: 'boolean', example: true },
      version: { type: 'string', description: 'Format x.y.z', example: '1.1.0' }
    }
  },
  AiAdminPromptResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Prompt disimpan' },
      data: { $ref: '#/components/schemas/AiAdminPrompt' }
    }
  },
  AiAdminPromptListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: { type: 'array', items: { $ref: '#/components/schemas/AiAdminPrompt' } }
    }
  },
  AiAdminPromptHistory: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      version: { type: 'string', nullable: true, example: '1.0.2' },
      changed_by: { type: 'string', nullable: true, example: 'admin' },
      created_at: { type: 'string', format: 'date-time' },
      content: { type: 'string', example: 'Isi prompt sebelum diubah...' }
    }
  },
  AiAdminPromptHistoryListResponse: {
    type: 'object',
    description: 'Maksimal 50 riwayat terbaru',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: { type: 'array', items: { $ref: '#/components/schemas/AiAdminPromptHistory' } }
    }
  },

  // =============================================
  // Settings
  // =============================================
  AiAdminSettings: {
    type: 'object',
    properties: {
      chat_prompt_key: { type: 'string', description: 'Key prompt yang dipakai chat', example: 'system_prompt_default' },
      use_fallback: { type: 'boolean', description: 'true = jika model gagal, lanjut ke model berikutnya', example: true }
    }
  },
  AiAdminSettingsRequest: {
    type: 'object',
    description: 'Semua field opsional',
    properties: {
      chat_prompt_key: { type: 'string', description: 'Harus prompt yang ada dan aktif', example: 'system_prompt_default' },
      use_fallback: { type: 'boolean', example: true }
    }
  },
  AiAdminSettingsResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Pengaturan disimpan' },
      data: { $ref: '#/components/schemas/AiAdminSettings' }
    }
  },

  // =============================================
  // Monitoring
  // =============================================
  AiAdminActiveCandidate: {
    type: 'object',
    properties: {
      provider: { type: 'string', example: 'sumopod' },
      model: { type: 'string', example: 'gpt-5.4' },
      source: { type: 'string', enum: ['db', 'env'], description: 'env = fallback dari .env jika tidak ada model di DB', example: 'db' },
      has_key: { type: 'boolean', example: true }
    }
  },
  AiAdminOverviewResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['1h', '24h', '7d', '30d'], example: '24h' },
          bucket: { type: 'string', enum: ['minute', 'hour', 'day'], example: 'hour' },
          totals: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 120 },
              success: { type: 'integer', example: 117 },
              avg_latency_ms: { type: 'integer', nullable: true, example: 2350 },
              prompt_tokens: { type: 'string', description: 'bigint (dikirim sebagai string)', example: '154320' },
              completion_tokens: { type: 'string', description: 'bigint (dikirim sebagai string)', example: '40210' }
            }
          },
          by_model: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                purpose: { type: 'string', example: 'chat' },
                provider_code: { type: 'string', example: 'sumopod' },
                model_id: { type: 'string', example: 'gpt-5.4' },
                total: { type: 'integer', example: 100 },
                success: { type: 'integer', example: 98 },
                avg_latency_ms: { type: 'integer', nullable: true, example: 2100 },
                last_used_at: { type: 'string', format: 'date-time' }
              }
            }
          },
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bucket: { type: 'string', format: 'date-time' },
                success: { type: 'integer', example: 10 },
                failed: { type: 'integer', example: 0 }
              }
            }
          },
          recent_errors: {
            type: 'array',
            description: '10 error terbaru (tidak dibatasi range)',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '1024' },
                purpose: { type: 'string', example: 'analysis' },
                provider_code: { type: 'string', example: 'openai' },
                model_id: { type: 'string', example: 'gpt-4o' },
                error: { type: 'string', example: '429 Rate limit reached' },
                created_at: { type: 'string', format: 'date-time' }
              }
            }
          },
          transcriptions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'completed' },
                total: { type: 'integer', example: 15 }
              }
            }
          },
          conversations: { type: 'integer', description: 'Percakapan yang aktif dalam range', example: 42 },
          active: {
            type: 'object',
            description: 'Urutan kandidat model yang dipakai saat ini',
            properties: {
              chat: { type: 'array', items: { $ref: '#/components/schemas/AiAdminActiveCandidate' } },
              analysis: { type: 'array', items: { $ref: '#/components/schemas/AiAdminActiveCandidate' } }
            }
          },
          settings: { $ref: '#/components/schemas/AiAdminSettings' },
          cooldowns: {
            type: 'array',
            description: 'Model yang sedang cooldown setelah gagal',
            items: {
              type: 'object',
              properties: {
                model_pk: { type: 'string', description: 'ID model (UUID) atau env:<purpose>', example: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e' },
                until: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  },
  AiAdminLog: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'bigint (dikirim sebagai string)', example: '1024' },
      purpose: { type: 'string', example: 'chat' },
      provider_code: { type: 'string', example: 'sumopod' },
      model_id: { type: 'string', example: 'gpt-5.4' },
      success: { type: 'boolean', example: true },
      streaming: { type: 'boolean', example: true },
      latency_ms: { type: 'integer', nullable: true, example: 1830 },
      prompt_tokens: { type: 'integer', nullable: true, example: 1200 },
      completion_tokens: { type: 'integer', nullable: true, example: 350 },
      error: { type: 'string', nullable: true, example: null },
      created_at: { type: 'string', format: 'date-time' }
    }
  },
  AiAdminLogListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'OK' },
      data: {
        type: 'object',
        properties: {
          rows: { type: 'array', items: { $ref: '#/components/schemas/AiAdminLog' } },
          total: { type: 'integer', example: 1024 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 50 }
        }
      }
    }
  }
};

module.exports = aiAdminSchemas;
