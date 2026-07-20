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
  }
};

module.exports = aiAssistantPaths;

