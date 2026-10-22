/**
 * Migration: Tambah kolom summary (ringkasan transkrip) ke ai_transcriptions
 * Record lama bernilai NULL (tidak pernah diminta ringkasannya)
 */

exports.up = function(knex) {
  return knex.schema.alterTable('ai_transcriptions', (table) => {
    table.text('summary').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('ai_transcriptions', (table) => {
    table.dropColumn('summary');
  });
};
