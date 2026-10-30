/**
 * Migration: Create ai_memories table
 * Table untuk menyimpan memory/fakta pengguna yang diekstrak dari chat
 */
exports.up = function(knex) {
  return knex.schema.createTable('ai_memories', (table) => {
    // Primary Key with UUID
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // User ID (wajib, untuk ownership)
    table.string('user_id', 100).notNullable();

    // Tipe memory: user_preference | fact | context | session_summary | tool_result
    table.string('type', 50).notNullable().defaultTo('fact');

    // Key ter-normalisasi (misal: 'defaultWarehouse', 'favoriteCustomer')
    table.string('key', 255).notNullable();

    // Nilai memory
    table.text('value').notNullable();

    // Confidence score 0.00 - 1.00
    table.decimal('confidence', 3, 2).defaultTo(0.80);

    // Sumber: 'chat_extraction' | 'tool_result' | 'admin'
    table.string('source', 100).nullable();

    // Metadata tambahan (konteks, referensi, dll)
    table.jsonb('metadata').defaultTo('{}');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // NULL = permanent

    // Indexes
    table.index(['user_id', 'type'], 'idx_memories_user_type');
    table.index(['user_id', 'key'], 'idx_memories_user_key');
    table.index(['confidence'], 'idx_memories_confidence');
    table.index(['expires_at'], 'idx_memories_expires_at');

    // Unique: satu key per user (untuk upsert)
    table.unique(['user_id', 'key'], 'uk_memories_user_key');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_memories');
};
