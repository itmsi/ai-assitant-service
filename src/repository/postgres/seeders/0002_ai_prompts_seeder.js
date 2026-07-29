/**
 * Seeder: AI Prompts default data
 * Insert default system prompt untuk AI Assistant
 */

exports.seed = async function(knex) {
  // Default system prompt — versi ramping agar respons AI lebih natural
  const defaultPrompt = `Kamu adalah Mosa, asisten virtual resmi Motor Sights International (MSI).

🌟 **Kepribadian**
Bersikaplah hangat, profesional, dan penuh perhatian. Gunakan bahasa alami seperti ngobrol dengan rekan kerja — jangan kaku. Tunjukkan antusiasme membantu.

🌐 **Bahasa**
Kamu bisa berbahasa Indonesia (default), English, dan 中文 (Mandarin). Deteksi bahasa pengguna dan jawab dengan bahasa yang sama. Jika ditanya terjemahan, terjemahkan seluruh jawaban ke bahasa yang diminta.

🎯 **Scope**
Kamu spesialis sistem MSI — module-module: SSO, Quotation, Power BI, CRM, HR/Interview, Employee, eCatalog, EPC, Public, Island, Customers, Bank Accounts.
Jika ditanya di luar scope, tolak dengan sopan pakai bahasamu sendiri dan tawarkan bantuan terkait MSI.

🛠️ **Tool & Data**
• Gunakan tool yang relevan untuk mengambil data dari microservice MSI.
• Prioritaskan POST ke endpoint /get.
• Gunakan pagination (limit=5 untuk preview, limit=100 untuk lengkap).
• Untuk perhitungan total/akumulasi, gunakan tool aggregation yang sesuai.
• Sertakan Bearer token dari sistem.

📊 **Struktur Territory CRM (Referensi)**
Territory → Island/Pulau → Group → Area (iup_zone_name) → Zona (area_name) → IUP
• Group adalah bagian dari hierarchy territory, BUKAN segmentasi.
• Segmentation adalah kategori bisnis terpisah (NIKEL, BATUBARA, EMAS).
• Untuk data IUP & territory, gunakan data dari CRM module.

📝 **Gaya Jawaban**
• Mulai dengan rangkuman singkat, lalu detail (poin/tabel bila perlu).
• Sebut sumber data secara ringkas.
• Jika error, jelaskan penyebab & solusi dengan ramah.
• Akhiri dengan nada suportif, siap membantu lagi.
• Jadilah natural — jangan gunakan template kaku.`;

  // Check if data already exists
  const existing = await knex('ai_prompts')
    .where({ key: 'system_prompt_default', deleted_at: null })
    .first();
  
  if (existing) {
    // Get current version and increment
    const currentVersion = existing.version || '1.0.0';
    const versionParts = currentVersion.split('.');
    const major = parseInt(versionParts[0]) || 1;
    const minor = parseInt(versionParts[1]) || 0;
    const patch = parseInt(versionParts[2]) || 0;
    const newVersion = `${major}.${minor + 1}.0`;
    
    // Update existing prompt (karena key unique, tidak bisa insert baru)
    await knex('ai_prompts')
      .where({ key: 'system_prompt_default', deleted_at: null })
      .update({
        content: defaultPrompt,
        version: newVersion,
        is_active: true,
        description: 'Default system prompt untuk AI Assistant Mosa (versi ramping: hangat, natural, multi-bahasa)',
        metadata: JSON.stringify({
          author: 'System',
          created_by: 'seeder',
          tags: ['default', 'system', 'mosa', 'multilingual', 'indonesia', 'english', 'mandarin', 'v2-slim'],
          previous_version: currentVersion
        }),
        updated_at: knex.fn.now()
      });
    
    console.log(`Default system prompt updated from version ${currentVersion} to ${newVersion}`);
  } else {
    // Insert new prompt
    await knex('ai_prompts').insert({
      id: knex.raw('uuid_generate_v4()'),
      key: 'system_prompt_default',
      content: defaultPrompt,
      version: '1.0.0',
      is_active: true,
      description: 'Default system prompt untuk AI Assistant Mosa (versi ramping: hangat, natural, multi-bahasa)',
      metadata: JSON.stringify({
        author: 'System',
        created_by: 'seeder',
        tags: ['default', 'system', 'mosa', 'multilingual', 'indonesia', 'english', 'mandarin', 'v2-slim']
      }),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    
    console.log('Default system prompt inserted successfully');
  }
};

