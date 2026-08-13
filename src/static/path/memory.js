/**
 * Swagger Path Definitions untuk modul AI Assistant — Memory (Mem0 CRUD)
 * Base path: /ai-assistant/memory (mount di bawah /api/mosa/)
 */

const memoryPaths = {
  '/ai-assistant/memory': {
    get: {
      tags: ['AI Assistant - Memory'],
      summary: 'List memories (admin)',
      description: 'Menampilkan daftar memory. Bisa difilter per user dengan query `userId`, dan di-paginate dengan `page` & `limit`.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'userId',
          in: 'query',
          required: false,
          description: 'Filter memory milik user tertentu (UUID user)',
          schema: { type: 'string' },
          example: 'f0b57258-5f33-4e03-81f7-cd70d833b5c5'
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Halaman (default 1)',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Jumlah per halaman (default 50)',
          schema: { type: 'integer', default: 50 }
        }
      ],
      responses: {
        200: {
          description: 'Daftar memory berhasil diambil',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryListResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    },
    post: {
      tags: ['AI Assistant - Memory'],
      summary: 'Create / update memory manual',
      description: 'Menyimpan memory secara manual (tanpa LLM extraction). Jika `key` sudah ada untuk user, nilai akan di-update (force overwrite).',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MemoryCreateRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Memory tersimpan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryItemResponse' }
            }
          }
        },
        400: {
          description: 'Validasi gagal (userId/key/value wajib)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/memory/{id}': {
    get: {
      tags: ['AI Assistant - Memory'],
      summary: 'Get satu memory by ID',
      description: 'Mengambil satu memory berdasarkan ID memory Mem0.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID memory Mem0 (UUID)',
          schema: { type: 'string' },
          example: '129206e3-6082-4d0c-aa55-e434cc52c989'
        }
      ],
      responses: {
        200: {
          description: 'Memory ditemukan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryItemResponse' }
            }
          }
        },
        404: {
          description: 'Memory tidak ditemukan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    },
    put: {
      tags: ['AI Assistant - Memory'],
      summary: 'Update memory text by ID',
      description: 'Menimpa teks memory berdasarkan ID memory Mem0.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID memory Mem0 (UUID)',
          schema: { type: 'string' },
          example: '129206e3-6082-4d0c-aa55-e434cc52c989'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MemoryUpdateRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Memory diperbarui',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryItemResponse' }
            }
          }
        },
        400: {
          description: 'Validasi gagal (text wajib)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['AI Assistant - Memory'],
      summary: 'Delete memory by ID',
      description: 'Menghapus satu memory berdasarkan ID memory Mem0.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID memory Mem0 (UUID)',
          schema: { type: 'string' },
          example: '129206e3-6082-4d0c-aa55-e434cc52c989'
        }
      ],
      responses: {
        200: {
          description: 'Memory dihapus',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryDeleteResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/memory/search': {
    post: {
      tags: ['AI Assistant - Memory'],
      summary: 'Semantic search memories',
      description: 'Mencari memory secara semantik berdasarkan query. Opsional filter per user.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/MemorySearchRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Hasil pencarian',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryListResponse' }
            }
          }
        },
        400: {
          description: 'Validasi gagal (query wajib)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    }
  },
  '/ai-assistant/memory/cleanup': {
    post: {
      tags: ['AI Assistant - Memory'],
      summary: 'Cleanup expired memories',
      description: 'Menghapus semua memory yang sudah kadaluarsa (metadata.expires_at <= sekarang).',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Cleanup selesai',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryCleanupResponse' }
            }
          }
        },
        500: {
          description: 'Terjadi kesalahan',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MemoryErrorResponse' }
            }
          }
        }
      }
    }
  }
};

module.exports = memoryPaths;
