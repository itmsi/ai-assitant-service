/**
 * Migration: Create ai_transcriptions table
 * Table untuk menyimpan riwayat hasil speech-to-text (transkrip, terjemahan, analisis)
 */

exports.up = function(knex) {
  return knex.schema.createTable('ai_transcriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Pemilik request (null = anonymous / tanpa token)
    table.string('user_id', 100).nullable();

    // Sumber audio
    table.text('audio_url').notNullable();
    table.integer('size_bytes').nullable();

    // Hash dari parameter request (user + audio_url + language + output_language + analyze + instruction)
    // dipakai sebagai kunci cache
    table.string('request_hash', 64).notNullable();

    // Hasil
    table.string('language', 10).nullable(); // bahasa audio hasil deteksi (ISO-639-1)
    table.string('output_language', 10).nullable(); // bahasa output yang diminta
    table.boolean('translated').notNullable().defaultTo(false);
    table.text('transcript').notNullable();
    table.text('translation').nullable();
    table.json('segments').nullable();
    table.json('analysis').nullable();
    table.float('duration').nullable();

    // Metadata
    table.string('stt_model', 100).nullable();
    table.integer('processing_ms').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'created_at'], 'idx_ai_transcriptions_user_created');
    table.index(['request_hash', 'created_at'], 'idx_ai_transcriptions_hash_created');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_transcriptions');
};
