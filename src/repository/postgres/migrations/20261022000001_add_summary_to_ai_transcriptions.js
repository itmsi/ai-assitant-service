/**
 * Migration: Tambah kolom summary (ringkasan transkrip) ke ai_transcriptions
 * Record lama bernilai NULL (tidak pernah diminta ringkasannya)
 */

exports.up = function(knex) {
  return knex.schema.alterTable('ai_transcriptions', (table) => {
    table.text('summary').nullable();
    table.text('summary_update').nullable();
    table.string('summary_updated_by_id', 100).nullable();
    table.string('summary_updated_by_name', 255).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('ai_transcriptions', (table) => {
    table.dropColumn('summary');
    table.dropColumn('summary_update');
    table.dropColumn('summary_updated_by_id');
    table.dropColumn('summary_updated_by_name');
  });
};
