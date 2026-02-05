/**
 * Migration: Create ai_conversations table
 * Table untuk menyimpan conversation history AI Assistant
 */

exports.up = function(knex) {
  return knex.schema.createTable('ai_conversations', (table) => {
    // Primary Key with UUID
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Session ID (unique identifier untuk conversation)
    table.string('session_id', 255).notNullable();
    
    // User ID (optional, untuk tracking per user)
    table.string('user_id', 100).nullable();
    
    // Conversation history (JSON array of messages)
    // Format: [{ role: 'user'|'assistant', content: 'message', timestamp: 'ISO' }]
    table.json('messages').notNullable().defaultTo('[]');
    
    // Metadata tambahan
    table.integer('message_count').defaultTo(0); // Counter untuk quick reference
    table.timestamp('last_message_at').nullable(); // Timestamp last message
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // Optional: untuk auto-cleanup old conversations
    
    // Indexes for better query performance
    table.index(['session_id'], 'idx_ai_conversations_session_id');
    table.index(['user_id'], 'idx_ai_conversations_user_id');
    table.index(['created_at'], 'idx_ai_conversations_created_at');
    table.index(['last_message_at'], 'idx_ai_conversations_last_message_at');
    table.index(['expires_at'], 'idx_ai_conversations_expires_at');
    
    // Unique constraint: one record per session_id
    table.unique(['session_id'], 'uk_ai_conversations_session_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ai_conversations');
};
