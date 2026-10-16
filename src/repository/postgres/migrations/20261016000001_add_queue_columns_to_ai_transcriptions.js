/**
 * Migration: Tambah kolom status untuk speech-to-text via antrian (RabbitMQ)
 * - status: pending → processing → success | failed (record lama otomatis 'success')
 * - transcript jadi nullable karena job pending belum punya hasil
 * - params: parameter request asli, dibaca oleh worker
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('ai_transcriptions', (table) => {
    table.string('status', 20).notNullable().defaultTo('success');
    table.text('error_message').nullable();
    table.json('params').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('finished_at').nullable();
    table.index(['status', 'created_at'], 'idx_ai_transcriptions_status_created');
  });
  await knex.raw('ALTER TABLE ai_transcriptions ALTER COLUMN transcript DROP NOT NULL');
};

exports.down = async function(knex) {
  // Job yang belum selesai tidak punya transkrip; hapus dulu agar NOT NULL bisa dipulihkan
  await knex('ai_transcriptions').whereNull('transcript').delete();
  await knex.raw('ALTER TABLE ai_transcriptions ALTER COLUMN transcript SET NOT NULL');
  await knex.schema.alterTable('ai_transcriptions', (table) => {
    table.dropIndex(['status', 'created_at'], 'idx_ai_transcriptions_status_created');
    table.dropColumn('status');
    table.dropColumn('error_message');
    table.dropColumn('params');
    table.dropColumn('started_at');
    table.dropColumn('finished_at');
  });
};
