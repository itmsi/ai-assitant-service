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
                  message: 'Tampilkan 5 quotation terbaru minggu ini'
                }
              },
              customSession: {
                summary: 'Kirim pesan dengan sessionId khusus',
                value: {
                  message: 'Lanjutkan percakapan sebelumnya',
                  sessionId: 'session_custom_001'
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
  }
};

module.exports = aiAssistantPaths;

