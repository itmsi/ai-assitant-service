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
      sessionId: {
        type: 'string',
        description: 'Opsional. Jika tidak diisi, backend otomatis membuat session berdasarkan identitas pengguna',
        example: 'session_user123_1730967435000'
      }
    },
    example: {
      message: 'Tampilkan 5 quotation terbaru minggu ini'
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
  }
};

module.exports = aiAssistantSchemas;

