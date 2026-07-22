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
  }
};

module.exports = aiAssistantSchemas;

