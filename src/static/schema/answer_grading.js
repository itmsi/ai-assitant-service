/**
 * Swagger Schema Definitions for Answer Grading Module
 */

const answerGradingSchemas = {
  AnswerGradingInput: {
    type: 'object',
    required: ['question', 'employee_answer', 'admin_answer', 'max_points'],
    properties: {
      question: {
        type: 'string',
        maxLength: 5000,
        description: 'Pertanyaan yang dijawab (boleh HTML dari rich text editor)',
        example: 'Jelaskan langkah yang tepat saat menerima email yang meminta verifikasi kata sandi.'
      },
      employee_answer: {
        type: 'string',
        maxLength: 10000,
        description: 'Jawaban karyawan. Boleh kosong, hasilnya otomatis nilai 0 tanpa memanggil AI.',
        example: 'Saya tidak mengklik tautannya dan melaporkan email itu ke tim IT.'
      },
      admin_answer: {
        type: 'string',
        maxLength: 10000,
        description: 'Kunci jawaban dari admin (boleh HTML dari rich text editor, tag dibuang sebelum dinilai)',
        example: '<p>Jangan klik tautan, jangan memasukkan kata sandi, lalu laporkan ke tim IT Security.</p>'
      },
      max_points: {
        type: 'number',
        exclusiveMinimum: 0,
        maximum: 1000,
        description: 'Poin maksimal soal ini. Skor hasil penilaian tidak pernah melebihi nilai ini.',
        example: 5
      }
    }
  },
  AnswerGradingResponse: {
    type: 'object',
    properties: {
      score: {
        type: 'integer',
        description: 'Skor akhir = max_score x percentage / 100, dibulatkan ke bilangan bulat (tanpa koma)',
        example: 4
      },
      max_score: { type: 'number', description: 'Sama dengan max_points pada request', example: 5 },
      percentage: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Persentase kesesuaian jawaban dengan kunci admin menurut AI',
        example: 80
      },
      feedback: {
        type: 'string',
        description: 'Alasan penilaian',
        example: 'Langkah utama sudah benar, tetapi belum menyebut larangan memasukkan kata sandi.'
      },
      strengths: {
        type: 'array',
        description: 'Bagian jawaban yang sudah tepat',
        items: { type: 'string' },
        example: ['Tidak mengklik tautan', 'Melaporkan ke tim IT']
      },
      missing: {
        type: 'array',
        description: 'Poin kunci yang belum ada atau keliru',
        items: { type: 'string' },
        example: ['Tidak memasukkan kata sandi']
      }
    }
  }
};

module.exports = answerGradingSchemas;
