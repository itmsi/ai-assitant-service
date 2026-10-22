/**
 * Swagger Path Definitions untuk modul AI Assistant
 */

const aiAssistantPaths = {
  '/ai-assistant/chat': {
    post: {
      tags: ['AI Assistant'],
      summary: 'Kirim pesan ke AI Assistant',
      description: 'Mengirim pertanyaan atau perintah ke AI Assistant. Jika body tidak menyertakan `sessionId`, backend akan membuatnya otomatis berdasarkan identitas pengguna.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AiChatRequest' },
            examples: {
              simpleMessage: {
                summary: 'Kirim pesan tanpa sessionId',
                value: {
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
              customSession: {
                summary: 'Kirim pesan dengan sessionId khusus',
                value: {
                  message: 'Lanjutkan percakapan sebelumnya',
                  sessionId: 'session_custom_001',
                  system: [
                    "CRM",
                    "User Management",
                    "Quotation",
                    "ROA ROE Calculate",
                    "Power BI"
                  ]
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Chat berhasil diproses',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiChatResponse' }
            }
          }
        },
        400: {
          description: 'Validasi gagal (misal pesan kosong)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan saat memproses chat',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/history/{sessionId}': {
    get: {
      tags: ['AI Assistant'],
      summary: 'Ambil riwayat percakapan',
      description: 'Mengambil riwayat percakapan berdasarkan session ID.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          description: 'Session ID percakapan',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Riwayat percakapan ditemukan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiHistoryResponse' }
            }
          }
        },
        400: {
          description: 'Session ID tidak valid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan saat mengambil riwayat',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['AI Assistant'],
      summary: 'Hapus riwayat percakapan',
      description: 'Menghapus riwayat percakapan untuk session ID tertentu.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          description: 'Session ID percakapan',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Riwayat percakapan berhasil dihapus',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiClearHistoryResponse' }
            }
          }
        },
        400: {
          description: 'Session ID tidak valid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan saat menghapus riwayat',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/history/list': {
    post: {
      tags: ['AI Assistant'],
      summary: 'List semua session percakapan user',
      description: 'Mengambil daftar semua session percakapan milik user yang sedang login (berdasarkan SSO token atau user_id di body).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'Opsional. Override user ID' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Daftar riwayat berhasil diambil',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiHistoryListResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/chat/stream': {
    post: {
      tags: ['AI Assistant'],
      summary: 'Kirim pesan dengan streaming response (SSE)',
      description: 'Sama seperti /chat tetapi response dikirim token-by-token via Server-Sent Events.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AiChatRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Streaming response (text/event-stream) — token muncul bertahap'
        },
        400: {
          description: 'Validasi gagal',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/speech-to-text': {
    post: {
      tags: ['AI Assistant'],
      summary: 'Speech to text dari link audio',
      description: 'Mengunduh file audio dari `audio_url` lalu mengubah ucapan menjadi teks. Secara default hanya mengembalikan transkrip. Isi `analyze: true` untuk menambahkan analisis AI (ringkasan, poin penting, action item, dll). Format: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac. Maksimal 25MB.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AiSpeechToTextRequest' },
            examples: {
              transcriptOnly: {
                summary: 'Transkrip saja (paling minimal)',
                value: {
                  audio_url: 'https://example.com/rekaman.mp3'
                }
              },
              withLanguageAndSegments: {
                summary: 'Dengan bahasa dan segmen bertimestamp',
                value: {
                  audio_url: 'https://example.com/rekaman.mp3',
                  language: 'id',
                  include_segments: true
                }
              },
              fullPayload: {
                summary: 'Full payload (semua field)',
                value: {
                  audio_url: 'https://cloud.inlinegroupdc.com/s/fDXpz7H7LsH9NwX',
                  language: 'id',
                  include_segments: true,
                  analyze: true,
                  instruction: 'Apakah customer menyetujui penawaran?',
                  output_language: 'id'
                }
              },
              withSummary: {
                summary: 'Transkrip + ringkasan',
                value: {
                  audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                  summarize: true
                }
              },
              asyncQueue: {
                summary: 'Lewat antrian RabbitMQ (balas 202 + id, ambil hasil via GET /speech-to-text/{id})',
                value: {
                  audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                  output_language: 'en',
                  async: true
                }
              },
              withTranslation: {
                summary: 'Terjemahkan ke bahasa lain (bahasa audio dideteksi otomatis)',
                value: {
                  audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                  output_language: 'en'
                }
              },
              nextcloudShareLink: {
                summary: 'Link share Nextcloud (otomatis diubah ke link download)',
                value: {
                  audio_url: 'https://cloud.inlinegroupdc.com/s/fDXpz7H7LsH9NwX'
                }
              },
              withAnalysis: {
                summary: 'Transkrip + analisis AI',
                value: {
                  audio_url: 'https://example.com/rekaman.mp3',
                  language: 'id',
                  analyze: true,
                  instruction: 'Apakah customer menyetujui penawaran?',
                  output_language: 'id'
                }
              }
            }
          }
        }
      },
      responses: {
        202: {
          description: 'Mode async: job diterima dan masuk antrian RabbitMQ. Ambil hasil lewat GET /ai-assistant/speech-to-text/{id} sampai status=success atau failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiSpeechToTextQueuedResponse' },
              example: {
                success: true,
                message: 'Speech to text diterima dan masuk antrian',
                data: { id: '3f2b1c0e-8a4d-4c1a-9b5e-1d2f3a4b5c6d', status: 'pending', audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t', queued: true }
              }
            }
          }
        },
        503: {
          description: 'Mode async diminta tetapi RabbitMQ tidak aktif / tidak terjangkau',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        },
        200: {
          description: 'Audio berhasil diubah menjadi teks',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiSpeechToTextResponse' },
              examples: {
                withSummary: {
                  summary: 'summarize = true',
                  value: {
                    success: true,
                    message: 'Speech to text berhasil diproses',
                    data: {
                      id: '3f2b1c0e-8a4d-4c1a-9b5e-1d2f3a4b5c6d',
                      audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                      size_bytes: 625771,
                      language: 'id',
                      duration: 38.8,
                      transcript: 'Halo, perkenalkan nama saya Adam, saya lulusan baru dari Universitas Jayabaya...',
                      output_language: null,
                      translated: false,
                      translation: null,
                      summary: 'Adam memperkenalkan diri sebagai lulusan baru Universitas Jayabaya yang kini berkarier sebagai management trainee di bidang sales.',
                      analysis: null,
                      cached: false,
                      processing_ms: 6900
                    }
                  }
                },
                transcriptOnly: {
                  summary: 'Transkrip saja',
                  value: {
                    success: true,
                    message: 'Speech to text berhasil diproses',
                    data: {
                      audio_url: 'https://cloud.inlinegroupdc.com/s/fDXpz7H7LsH9NwX',
                      size_bytes: 482133,
                      language: 'id',
                      duration: null,
                      transcript: 'Selamat pagi pak, saya mau menanyakan penawaran unit excavator yang kemarin.',
                      analysis: null,
                      processing_ms: 3120
                    }
                  }
                },
                withTranslation: {
                  summary: 'output_language = en (audio berbahasa Indonesia, diterjemahkan)',
                  value: {
                    success: true,
                    message: 'Speech to text berhasil diproses',
                    data: {
                      audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                      size_bytes: 625771,
                      language: 'id',
                      duration: null,
                      transcript: 'Halo, perkenalkan nama saya Adam. Saya lulusan baru dari Universitas Jayabaya.',
                      output_language: 'en',
                      translated: true,
                      translation: 'Hello, let me introduce myself, my name is Adam. I am a fresh graduate from Jayabaya University.',
                      analysis: null,
                      processing_ms: 8828
                    }
                  }
                },
                withSegments: {
                  summary: 'include_segments = true (mode whisper)',
                  value: {
                    success: true,
                    message: 'Speech to text berhasil diproses',
                    data: {
                      audio_url: 'https://example.com/rekaman.mp3',
                      size_bytes: 482133,
                      language: 'indonesian',
                      duration: 9.8,
                      transcript: 'Selamat pagi pak, saya mau menanyakan penawaran unit.',
                      segments: [
                        { start: 0.0, end: 4.2, text: 'Selamat pagi pak,' },
                        { start: 4.2, end: 9.8, text: 'saya mau menanyakan penawaran unit.' }
                      ],
                      analysis: null,
                      processing_ms: 2840
                    }
                  }
                },
                withAnalysis: {
                  summary: 'analyze = true',
                  value: {
                    success: true,
                    message: 'Speech to text berhasil diproses',
                    data: {
                      audio_url: 'https://example.com/rekaman.mp3',
                      size_bytes: 482133,
                      language: 'id',
                      duration: null,
                      transcript: 'Selamat pagi pak, saya mau menanyakan penawaran unit excavator. Saya perlu waktu satu minggu untuk persetujuan budget.',
                      analysis: {
                        summary: 'Customer menanyakan penawaran excavator dan meminta waktu satu minggu untuk persetujuan budget.',
                        key_points: ['Menanyakan penawaran unit excavator', 'Menunggu persetujuan budget'],
                        action_items: [{ task: 'Follow up customer', owner: 'Sales', due: 'Dalam 1 minggu' }],
                        topics: ['Penawaran', 'Budget'],
                        sentiment: 'neutral',
                        participants: ['Customer', 'Sales'],
                        custom_answer: 'Belum menyetujui, menunggu persetujuan budget selama satu minggu.'
                      },
                      processing_ms: 6540
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validasi gagal (audio_url kosong/tidak valid, language tidak valid)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        403: {
          description: 'Host audio_url tidak diizinkan atau mengarah ke alamat internal',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        413: {
          description: 'Ukuran file melebihi batas (default 25MB)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        415: {
          description: 'Format audio tidak didukung',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        422: {
          description: 'Tidak ada ucapan yang terdeteksi pada audio',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        502: {
          description: 'Gagal mengunduh audio dari audio_url',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan saat memproses audio',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/summarize': {
    post: {
      tags: ['AI Assistant'],
      summary: 'Ringkas teks/transkrip dengan perintah bebas',
      description: 'Untuk HRD yang ingin membuat ringkasan sendiri dari UI MSI, di luar applicant form. **Jalur utama: kirim `transcription_id` dari hasil speech-to-text yang sudah ada**, dan opsional `instruction` berisi perintah bebas. Hasilnya disimpan ke kolom `summary_update` beserta ID dan nama pembuat dari token login (menimpa isi sebelumnya). Alternatif: kirim `text` langsung, tetapi hasilnya hanya dikembalikan dan tidak disimpan. Wajib token SSO. Jawaban hanya berdasarkan isi transkrip; isi transkrip diperlakukan sebagai data, bukan perintah.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AiSummarizeRequest' },
            examples: {
              fromTranscription: {
                summary: 'UTAMA - dari hasil speech-to-text yang sudah ada, dengan perintah HRD',
                value: {
                  transcription_id: '3f2b1c0e-8a4d-4c1a-9b5e-1d2f3a4b5c6d',
                  instruction: 'Tuliskan kelebihan dan kekurangan kandidat dalam bentuk poin',
                  output_language: 'id'
                }
              },
              fromTranscriptionGeneral: {
                summary: 'Dari hasil speech-to-text, ringkasan umum (tanpa perintah)',
                value: {
                  transcription_id: '3f2b1c0e-8a4d-4c1a-9b5e-1d2f3a4b5c6d'
                }
              },
              fromText: {
                summary: 'Alternatif - kirim teks langsung (tidak disimpan)',
                value: {
                  text: 'Halo, perkenalkan nama saya Adam, saya lulusan baru dari Universitas Jayabaya...',
                  instruction: 'Apakah kandidat menyebut pengalaman kerja sebelumnya?'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Ringkasan berhasil dibuat',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiSummarizeResponse' },
              example: {
                success: true,
                message: 'Ringkasan berhasil dibuat',
                data: {
                  summary: 'Adam memperkenalkan diri sebagai lulusan baru Universitas Jayabaya yang kini berkarier sebagai management trainee di bidang sales.',
                  saved: true,
                  summary_updated_by_id: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5',
                  summary_updated_by_name: 'Rina HRD',
                  output_language: 'id',
                  source: 'transcription',
                  transcription_id: null,
                  input_chars: 540,
                  processing_ms: 2100
                }
              }
            }
          }
        },
        400: {
          description: 'Validasi gagal (text/transcription_id kosong atau keduanya diisi, teks > 50.000 karakter, instruction > 2.000 karakter, output_language tidak valid)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        },
        401: {
          description: 'Token SSO tidak ada atau tidak valid',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        },
        404: {
          description: 'transcription_id tidak ditemukan atau belum selesai (status bukan success)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        },
        500: {
          description: 'Terjadi kesalahan saat membuat ringkasan',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        }
      }
    }
  },
  '/ai-assistant/speech-to-text/history': {
    get: {
      tags: ['AI Assistant'],
      summary: 'Riwayat speech to text',
      description: 'Daftar hasil speech-to-text milik user (terbaru dulu). Transkrip dipotong 150 karakter sebagai `transcript_preview`; ambil lengkapnya lewat detail.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        { name: 'user_id', in: 'query', description: 'Fallback jika request tanpa token', schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'Riwayat berhasil diambil',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Riwayat speech to text berhasil diambil',
                data: {
                  total: 1,
                  page: 1,
                  limit: 20,
                  items: [{
                    id: '3f2b1c0e-8a4d-4c1a-9b5e-1d2f3a4b5c6d',
                    audio_url: 'https://cloud.motorsights.com/s/AmjNdn8gmC7t96t',
                    size_bytes: 625771,
                    language: 'id',
                    output_language: 'en',
                    translated: true,
                    duration: null,
                    processing_ms: 8828,
                    created_at: '2026-10-15T07:30:00.000Z',
                    transcript_preview: 'Halo, perkenalkan nama saya Adam...'
                  }]
                }
              }
            }
          }
        },
        401: {
          description: 'User tidak terautentikasi',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        }
      }
    }
  },
  '/ai-assistant/speech-to-text/{id}': {
    get: {
      tags: ['AI Assistant'],
      summary: 'Detail speech to text',
      description: 'Mengambil satu hasil speech-to-text lengkap (transkrip, terjemahan, segmen, analisis). Record milik user lain dikembalikan 404.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'user_id', in: 'query', description: 'Fallback jika request tanpa token', schema: { type: 'string' } }
      ],
      responses: {
        200: {
          description: 'Detail berhasil diambil',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Detail speech to text berhasil diambil' },
                  data: { $ref: '#/components/schemas/AiSpeechToTextResponseData' }
                }
              }
            }
          }
        },
        400: {
          description: 'ID tidak valid',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        },
        404: {
          description: 'Data tidak ditemukan',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AiErrorResponse' } } }
        }
      }
    }
  }
};

module.exports = aiAssistantPaths;

