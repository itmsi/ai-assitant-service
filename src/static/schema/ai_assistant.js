/**
 * Swagger Schemas untuk modul AI Assistant
 */

const aiAssistantSchemas = {
  AiConversationMessage: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['user', 'assistant'],
        example: 'assistant'
      },
      content: {
        type: 'string',
        example: 'Berikut ringkasan data yang kamu minta...'
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        example: '2025-11-07T08:15:30.000Z'
      }
    }
  },
  AiChatRequest: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'string',
        description: 'Pesan atau pertanyaan user',
        example: 'Tampilkan 5 quotation terbaru minggu ini'
      },
      system: {
        type: 'array',
        description: 'Opsional. Array berisi nama-nama modul yang akan digunakan oleh AI Assistant',
        example: [
          "CRM",
          "User Management",
          "Quotation",
          "ROA ROE Calculate",
          "Power BI"
        ]
      },
      sessionId: {
        type: 'string',
        description: 'Opsional. Jika tidak diisi, backend otomatis membuat session berdasarkan identitas pengguna',
        example: 'session_user123_1730967435000'
      }
    },
    example: {
      message: 'Tampilkan 5 quotation terbaru minggu ini',
      system: [
        "CRM",
        "User Management",
        "Quotation",
        "ROA ROE Calculate",
        "Power BI"
      ]
    }
  },
  AiChatResponseData: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        example: 'Berikut adalah quotation terbaru minggu ini...'
      },
      sessionId: {
        type: 'string',
        description: 'Session ID aktif yang digunakan oleh backend',
        example: 'session_user123'
      },
      conversationHistory: {
        type: 'array',
        items: { $ref: '#/components/schemas/AiConversationMessage' }
      }
    }
  },
  AiChatResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Chat berhasil diproses'
      },
      data: {
        $ref: '#/components/schemas/AiChatResponseData'
      }
    }
  },
  AiHistoryResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Riwayat percakapan berhasil diambil' },
      data: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', example: 'session_user123_1730967435000' },
          conversationHistory: {
            type: 'array',
            items: { $ref: '#/components/schemas/AiConversationMessage' }
          }
        }
      }
    }
  },
  AiClearHistoryResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Riwayat percakapan berhasil dihapus' },
      data: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', example: 'session_user123_1730967435000' }
        }
      }
    }
  },
  AiErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Terjadi kesalahan saat memproses chat' }
    }
  },
  AiHistorySessionItem: {
    type: 'object',
    properties: {
      session_id: { type: 'string', example: 'session_user123_1730967435000' },
      user_id: { type: 'string', example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5' },
      message_count: { type: 'integer', example: 12 },
      last_message_at: { type: 'string', format: 'date-time' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  AiHistoryListResponseData: {
    type: 'object',
    properties: {
      userId: { type: 'string', example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5' },
      total: { type: 'integer', example: 5 },
      conversations: {
        type: 'array',
        items: { $ref: '#/components/schemas/AiHistorySessionItem' }
      }
    }
  },
  AiHistoryListResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Daftar riwayat percakapan berhasil diambil' },
      data: { $ref: '#/components/schemas/AiHistoryListResponseData' }
    }
  },
  AiSpeechToTextRequest: {
    type: 'object',
    required: ['audio_url'],
    properties: {
      audio_url: {
        type: 'string',
        format: 'uri',
        description: 'Link file audio (http/https, host publik). Format: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac. Maks 25MB',
        example: 'https://example.com/rekaman.mp3'
      },
      language: {
        type: 'string',
        description: 'Opsional. Kode bahasa ISO-639-1 (id, en, zh). Jika kosong dideteksi otomatis',
        example: 'id'
      },
      include_segments: {
        type: 'boolean',
        default: false,
        description: 'Opsional. true = sertakan teks per segmen dengan timestamp start/end (detik)'
      },
      analyze: {
        type: 'boolean',
        default: false,
        description: 'Opsional. true = tambahkan analisis AI pada field `analysis`'
      },
      instruction: {
        type: 'string',
        maxLength: 1000,
        description: 'Opsional, hanya dipakai jika analyze=true. Pertanyaan/instruksi analisis tambahan, jawabannya di `analysis.custom_answer`',
        example: 'Apakah customer menyetujui penawaran?'
      },
      async: {
        type: 'boolean',
        default: false,
        description: 'Opsional. true = proses lewat antrian RabbitMQ: langsung dibalas 202 + id dengan status pending, lalu ambil hasilnya lewat GET /speech-to-text/{id}. Butuh RABBITMQ_ENABLED=true. Jika hasil identik sudah ada di cache, tetap dibalas 200 langsung'
      },
      force_refresh: {
        type: 'boolean',
        default: false,
        description: 'Opsional. true = abaikan cache dan proses ulang. Default: request identik (user + audio_url + language + output_language + analyze + instruction) dalam 24 jam (STT_CACHE_TTL_HOURS) diambil dari DB'
      },
      output_language: {
        type: 'string',
        description: 'Opsional. Kode ISO-639-1 bahasa output (id, en, zh). Bahasa audio dideteksi otomatis oleh AI; jika berbeda dari output_language, teks diterjemahkan ke field `translation`. Jika sama, tidak diterjemahkan. Jika diisi dan analyze=true, hasil analisis juga memakai bahasa ini',
        example: 'en'
      }
    },
    example: {
      audio_url: 'https://example.com/rekaman.mp3',
      language: 'id'
    }
  },
  AiSpeechToTextSegment: {
    type: 'object',
    properties: {
      start: { type: 'number', example: 0.0 },
      end: { type: 'number', example: 4.2 },
      text: { type: 'string', example: 'Selamat pagi pak,' }
    }
  },
  AiSpeechToTextAnalysis: {
    type: 'object',
    nullable: true,
    description: 'Hanya terisi jika analyze=true',
    properties: {
      summary: { type: 'string' },
      key_points: { type: 'array', items: { type: 'string' } },
      action_items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            owner: { type: 'string', nullable: true },
            due: { type: 'string', nullable: true }
          }
        }
      },
      topics: { type: 'array', items: { type: 'string' } },
      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
      participants: { type: 'array', items: { type: 'string' } },
      custom_answer: { type: 'string', nullable: true }
    }
  },
  AiSpeechToTextResponseData: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['pending', 'processing', 'success', 'failed'], description: 'Status job. Mode sinkron selalu success; mode async mulai dari pending' },
      error_message: { type: 'string', description: 'Alasan gagal, hanya muncul jika status=failed' },
      id: { type: 'string', format: 'uuid', nullable: true, description: 'ID record di riwayat (dipakai untuk GET /speech-to-text/{id}). null jika gagal disimpan' },
      cached: { type: 'boolean', description: 'true jika hasil diambil dari cache DB, bukan diproses ulang', example: false },
      created_at: { type: 'string', format: 'date-time', description: 'Waktu record dibuat (pada detail/cache hit)' },
      audio_url: { type: 'string', example: 'https://example.com/rekaman.mp3' },
      size_bytes: { type: 'integer', example: 482133 },
      language: { type: 'string', nullable: true, description: 'Bahasa audio hasil deteksi AI (ISO-639-1)', example: 'id' },
      output_language: { type: 'string', nullable: true, description: 'Bahasa output yang diminta (null jika tidak dikirim)', example: 'en' },
      translated: { type: 'boolean', description: 'true jika output_language berbeda dari bahasa terdeteksi sehingga diterjemahkan', example: true },
      translation: { type: 'string', nullable: true, description: 'Hasil terjemahan transcript ke output_language. null jika tidak perlu diterjemahkan', example: 'Hello, my name is Adam...' },
      duration: { type: 'number', nullable: true, example: 42.3 },
      transcript: {
        type: 'string',
        example: 'Selamat pagi pak, saya mau menanyakan penawaran unit...'
      },
      segments: {
        type: 'array',
        description: 'Hanya muncul jika include_segments=true',
        items: { $ref: '#/components/schemas/AiSpeechToTextSegment' }
      },
      analysis: { $ref: '#/components/schemas/AiSpeechToTextAnalysis' },
      processing_ms: { type: 'integer', example: 3120 }
    }
  },
  AiSpeechToTextQueuedResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Speech to text diterima dan masuk antrian' },
      data: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing'], example: 'pending' },
          audio_url: { type: 'string' },
          queued: { type: 'boolean', example: true }
        }
      }
    }
  },
  AiSpeechToTextResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Speech to text berhasil diproses' },
      data: { $ref: '#/components/schemas/AiSpeechToTextResponseData' }
    }
  }
};

module.exports = aiAssistantSchemas;

