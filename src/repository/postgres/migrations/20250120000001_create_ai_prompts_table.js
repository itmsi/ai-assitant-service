/**
 * Migration: Create ai_prompts table
 * Table untuk menyimpan system prompts AI Assistant
 */

exports.up = function(knex) {
  return knex.schema.createTable('ai_prompts', (table) => {
    // Primary Key with UUID
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Key untuk identifikasi prompt (unique)
    table.string('key', 100).notNullable().unique();
    
    // Content prompt (text panjang)
    table.text('content').notNullable();
    
    // Version untuk tracking perubahan
    table.string('version', 20).defaultTo('1.0.0');
    
    // Status aktif/tidak aktif
    table.boolean('is_active').defaultTo(true);
    
    // Metadata tambahan (opsional)
    table.string('description', 255).nullable();
    table.json('metadata').nullable(); // Untuk menyimpan info tambahan seperti author, tags, dll
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Indexes for better query performance
    table.index(['key'], 'idx_ai_prompts_key');
    table.index(['is_active'], 'idx_ai_prompts_is_active');
    table.index(['version'], 'idx_ai_prompts_version');
    table.index(['deleted_at'], 'idx_ai_prompts_deleted_at');
    table.index(['created_at'], 'idx_ai_prompts_created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_prompts');
};

