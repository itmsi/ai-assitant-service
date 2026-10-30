/**
 * Swagger Schemas untuk modul AI Assistant — Memory (Mem0)
 */

const memorySchemas = {
  MemoryItem: {
    type: 'object',
    description: 'Satu item memory dari Mem0',
    properties: {
      id: {
        type: 'string',
        description: 'ID memory Mem0 (UUID)',
        example: '129206e3-6082-4d0c-aa55-e434cc52c989'
      },
      userId: {
        type: 'string',
        description: 'User ID pemilik memory',
        example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5'
      },
      key: {
        type: 'string',
        description: 'Kunci memory (emulasi unique key per user)',
        example: 'user_name'
      },
      value: {
        type: 'string',
        description: 'Isi memory',
        example: 'User suka kopi'
      },
      type: {
        type: 'string',
        description: 'Tipe memory',
        example: 'fact'
      },
      confidence: {
        type: 'number',
        description: 'Skor keyakinan (0-1)',
        example: 0.95
      },
      source: {
        type: 'string',
        description: 'Sumber memory',
        example: 'admin'
      },
      metadata: {
        type: 'object',
        description: 'Metadata tambahan',
        example: { key: 'user_name', type: 'fact', source: 'admin' }
      },
      expiresAt: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'Waktu kedaluwarsa (jika ada)'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        example: '2026-08-04T03:33:48.960Z'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        example: '2026-08-04T03:33:48.960Z'
      }
    }
  },
  MemoryListData: {
    type: 'object',
    description: 'Data hasil list/search memory',
    properties: {
      total: {
        type: 'integer',
        description: 'Total memory',
        example: 12
      },
      page: {
        type: 'integer',
        description: 'Halaman saat ini (hanya untuk list)',
        example: 1
      },
      limit: {
        type: 'integer',
        description: 'Jumlah per halaman',
        example: 50
      },
      data: {
        type: 'array',
        description: 'Daftar memory',
        items: { $ref: '#/components/schemas/MemoryItem' }
      }
    }
  },
  MemoryListResponse: {
    type: 'object',
    description: 'Response list/search memory',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Memories retrieved'
      },
      data: {
        $ref: '#/components/schemas/MemoryListData'
      }
    }
  },
  MemoryItemResponse: {
    type: 'object',
    description: 'Response satu item memory',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Memory found'
      },
      data: {
        $ref: '#/components/schemas/MemoryItem'
      }
    }
  },
  MemoryCreateRequest: {
    type: 'object',
    required: ['userId', 'key', 'value'],
    description: 'Body untuk create/update memory manual',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID pemilik memory',
        example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5'
      },
      type: {
        type: 'string',
        description: 'Tipe memory (fact / user_preference / dll)',
        default: 'fact',
        example: 'fact'
      },
      key: {
        type: 'string',
        description: 'Kunci unik memory per user',
        example: 'favorite_drink'
      },
      value: {
        type: 'string',
        description: 'Isi memory',
        example: 'Kopi'
      },
      confidence: {
        type: 'number',
        description: 'Skor keyakinan (default 0.95)',
        example: 0.95
      },
      source: {
        type: 'string',
        description: 'Sumber memory (default admin)',
        example: 'admin'
      },
      metadata: {
        type: 'object',
        description: 'Metadata tambahan (opsional)',
        example: { category: 'preference' }
      }
    }
  },
  MemoryUpdateRequest: {
    type: 'object',
    required: ['text'],
    description: 'Body untuk update memory by ID',
    properties: {
      text: {
        type: 'string',
        description: 'Teks memory baru',
        example: 'User suka kopi dan teh'
      }
    }
  },
  MemorySearchRequest: {
    type: 'object',
    required: ['query'],
    description: 'Body untuk semantic search memory',
    properties: {
      query: {
        type: 'string',
        description: 'Query pencarian semantik',
        example: 'apa minuman favorit user?'
      },
      userId: {
        type: 'string',
        nullable: true,
        description: 'Filter per user (opsional)',
        example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5'
      },
      limit: {
        type: 'integer',
        description: 'Maksimal hasil (default 25)',
        default: 25,
        example: 10
      }
    }
  },
  MemoryDeleteResponse: {
    type: 'object',
    description: 'Response delete memory',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: 'Memory deleted'
      }
    }
  },
  MemoryCleanupResponse: {
    type: 'object',
    description: 'Response cleanup expired memories',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        example: '3 expired memories cleaned up'
      },
      data: {
        type: 'object',
        properties: {
          deletedCount: {
            type: 'integer',
            example: 3
          }
        }
      }
    }
  },
  MemoryErrorResponse: {
    type: 'object',
    description: 'Response error memory',
    properties: {
      success: {
        type: 'boolean',
        example: false
      },
      message: {
        type: 'string',
        example: 'Failed to list memories'
      }
    }
  }
};

module.exports = memorySchemas;
