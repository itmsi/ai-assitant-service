/**
 * Swagger API Path Definitions for Answer Grading Module
 */

const errorContent = {
  'application/json': {
    schema: { $ref: '#/components/schemas/ErrorResponse' }
  }
};

const answerGradingPaths = {
  '/answer-grading/grade': {
    post: {
      tags: ['Answer Grading'],
      summary: 'Nilai jawaban karyawan dengan AI',
      description:
        'Menilai jawaban karyawan berdasarkan pertanyaan, kunci jawaban admin, dan poin maksimal. AI menilai kesesuaian makna (bukan kemiripan kata) dan memberi nilai sebagian untuk jawaban yang belum lengkap. Skor dihitung di server dari persentase AI sehingga tidak pernah melebihi max_points. Jawaban karyawan yang kosong dinilai 0 tanpa memanggil AI.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AnswerGradingInput' }
          }
        }
      },
      responses: {
        200: {
          description: 'Penilaian berhasil',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Penilaian berhasil' },
                  data: { $ref: '#/components/schemas/AnswerGradingResponse' }
                }
              }
            }
          }
        },
        400: { description: 'Validation error', content: errorContent },
        401: { description: 'Unauthorized - token SSO tidak ada atau tidak valid', content: errorContent },
        502: { description: 'AI gagal dipanggil atau balasannya tidak valid', content: errorContent },
        503: { description: 'AI belum aktif atau belum dikonfigurasi', content: errorContent }
      }
    }
  }
};

module.exports = answerGradingPaths;
