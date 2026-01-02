const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const aiConfig = require('../../config/ai');
const { Logger } = require('../../utils/logger');
const logger = Logger;
const { pgCore } = require('../../config/database');
const { setupDblink, executeDblinkQueryWithRetry } = require('../../utils/dblink');

/**
 * Initialize AI model untuk validasi duplikat
 */
const initializeModel = () => {
  if (!aiConfig.AI_ENABLED) {
    throw new Error('AI Assistant is not enabled');
  }

  if (aiConfig.AI_MODEL_PROVIDER === 'openai') {
    if (!aiConfig.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    return new ChatOpenAI({
      modelName: aiConfig.OPENAI_MODEL,
      temperature: 0.3, // Lower temperature untuk validasi yang lebih akurat
      maxTokens: aiConfig.OPENAI_MAX_TOKENS,
      openAIApiKey: aiConfig.OPENAI_API_KEY,
    });
  }

  if (aiConfig.AI_MODEL_PROVIDER === 'sumopod') {
    if (!aiConfig.SUMOPOD_API_KEY) {
      throw new Error('Sumopod API key belum dikonfigurasi');
    }

    if (!aiConfig.SUMOPOD_BASE_URL) {
      throw new Error('Sumopod base URL belum dikonfigurasi');
    }

    return new ChatOpenAI({
      modelName: aiConfig.SUMOPOD_MODEL,
      temperature: 0.3,
      maxTokens: aiConfig.SUMOPOD_MAX_TOKENS,
      openAIApiKey: aiConfig.SUMOPOD_API_KEY,
      configuration: {
        basePath: aiConfig.SUMOPOD_BASE_URL,
        baseURL: aiConfig.SUMOPOD_BASE_URL,
      },
    });
  }

  throw new Error(`Unsupported AI model provider: ${aiConfig.AI_MODEL_PROVIDER}`);
};

/**
 * Get customer names from database using dblink utility
 */
const getCustomersFromDatabase = async () => {
  try {
    // Setup dblink connection menggunakan utility
    const dblinkReady = await setupDblink();
    if (!dblinkReady) {
      const dbGateSSOHost = process.env.DB_GATE_SSO_HOST || 'localhost';
      const dbGateSSOPort = process.env.DB_GATE_SSO_PORT || '5432';
      const dbGateSSOName = process.env.DB_GATE_SSO_NAME || 'gate_sso';
      
      throw new Error(
        `Gagal setup koneksi dblink ke database gate_sso di ${dbGateSSOHost}:${dbGateSSOPort}/${dbGateSSOName}. ` +
        `Pastikan: (1) Database gate_sso sedang berjalan, (2) Host dan port benar, ` +
        `(3) Firewall/network mengizinkan koneksi, (4) Kredensial database benar, ` +
        `(5) Extension dblink sudah diaktifkan.`
      );
    }

    logger.info('[CUSTOMER_VALIDATION] Dblink connection ready, querying customers...');

    // Build inner query untuk dblink - ambil customer_name dari tabel customers
    const innerQuery = `SELECT customer_name FROM customers WHERE is_delete = false`;
    
    // Escape inner query untuk dblink (single quote menjadi double single quote)
    const escapedInnerQuery = innerQuery.replace(/'/g, "''");
    
    // Build final query using dblink dengan named connection 'gate_sso_conn'
    const finalQuery = `SELECT customer_name
      FROM dblink('gate_sso_conn', '${escapedInnerQuery}') AS customer_data(
        customer_name varchar
      )`;

    // Execute query dengan retry mechanism
    const result = await executeDblinkQueryWithRetry(async () => {
      return await pgCore.raw(finalQuery);
    });
    
    // Extract customer names dari result
    const customerNames = result.rows
      .map(row => row.customer_name)
      .filter(name => name && name.trim().length > 0);
    
    logger.info(`[CUSTOMER_VALIDATION] Retrieved ${customerNames.length} customer names from database`);
    return customerNames;
  } catch (error) {
    const errorMessage = error.message || error.toString();
    logger.error(`[CUSTOMER_VALIDATION] Error getting customers from database: ${errorMessage}`);
    
    // Specific error handling untuk berbagai jenis error
    if (errorMessage.includes('could not establish connection') || 
        errorMessage.includes('connection refused') ||
        errorMessage.includes('ECONNREFUSED')) {
      const dbGateSSOHost = process.env.DB_GATE_SSO_HOST || 'localhost';
      const dbGateSSOPort = process.env.DB_GATE_SSO_PORT || '5432';
      throw new Error(
        `Gagal terhubung ke database gate_sso di ${dbGateSSOHost}:${dbGateSSOPort}. ` +
        `Pastikan: (1) Database gate_sso sedang berjalan, (2) Host dan port benar, ` +
        `(3) Firewall/network mengizinkan koneksi, (4) Kredensial database benar. ` +
        `Detail error: ${errorMessage}`
      );
    }

    if (errorMessage.includes('authentication failed') || 
        errorMessage.includes('password authentication failed')) {
      throw new Error(
        `Autentikasi ke database gate_sso gagal. ` +
        `Pastikan username (${process.env.DB_GATE_SSO_USER || 'msiserver'}) dan password benar. ` +
        `Detail error: ${errorMessage}`
      );
    }

    if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
      throw new Error(
        `Database ${process.env.DB_GATE_SSO_NAME || 'gate_sso'} tidak ditemukan. ` +
        `Pastikan nama database benar. Detail error: ${errorMessage}`
      );
    }

    if (errorMessage.includes('dblink') || errorMessage.includes('extension')) {
      throw new Error(
        `Error dblink extension: ${errorMessage}. ` +
        `Pastikan extension dblink sudah diaktifkan dengan: CREATE EXTENSION IF NOT EXISTS dblink; ` +
        `(membutuhkan superuser permission)`
      );
    }

    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      throw new Error(
        `Tabel customers tidak ditemukan di database gate_sso. ` +
        `Pastikan tabel customers sudah ada. Detail error: ${errorMessage}`
      );
    }

    // Generic error
    throw new Error(
      `Gagal mengambil data customer dari database gate_sso: ${errorMessage}. ` +
      `Pastikan konfigurasi database benar dan database dapat diakses.`
    );
  }
};

/**
 * Validate duplicate customers using AI
 */
const validateDuplicateCustomers = async (requestCustomerNames) => {
  try {
    // Get customers from database
    let existingCustomers = [];
    try {
      existingCustomers = await getCustomersFromDatabase();
    } catch (dbError) {
      // Jika gagal mengambil data dari database, return error yang informatif
      logger.error(`Failed to get customers from database: ${dbError.message}`);
      throw {
        name: 'DatabaseConnectionError',
        message: dbError.message,
        code: 'DB_CONNECTION_ERROR',
        details: {
          suggestion: 'Pastikan database gate_sso dapat diakses dan konfigurasi dblink benar',
          config: {
            host: process.env.DB_GATE_SSO_HOST,
            port: process.env.DB_GATE_SSO_PORT,
            database: process.env.DB_GATE_SSO_NAME
          }
        }
      };
    }

    if (existingCustomers.length === 0) {
      logger.warn('No customers found in database, validation will return no duplicates');
      return {
        hasDuplicates: false,
        duplicates: [],
        message: 'Tidak ada data customer di database untuk dibandingkan'
      };
    }

    // Initialize AI model
    let model;
    try {
      logger.info('[CUSTOMER_VALIDATION] Initializing AI model...');
      model = initializeModel();
      logger.info('[CUSTOMER_VALIDATION] AI model initialized successfully');
    } catch (aiInitError) {
      logger.error(`[CUSTOMER_VALIDATION] Failed to initialize AI model: ${aiInitError.message}`);
      throw new Error(
        `Gagal menginisialisasi AI model: ${aiInitError.message}. ` +
        `Pastikan AI_ENABLED=true dan konfigurasi AI service benar.`
      );
    }

    // Prepare prompt untuk AI
    const systemPrompt = `Anda adalah asisten yang ahli dalam mendeteksi duplikat nama customer. 
Tugas Anda adalah membandingkan daftar nama customer yang diberikan dengan daftar nama customer yang sudah ada di database.

Identifikasi:
1. Nama yang SAMA PERSIS (identik)
2. Nama yang MENYERUPAI (hampir sama, mungkin typo atau variasi penulisan)
3. Nama yang KEMBAR (duplikat dengan variasi kecil)

Berikan respon dalam format JSON dengan struktur:
{
  "hasDuplicates": true/false,
  "duplicates": [
    {
      "requestName": "nama dari request",
      "matchedName": "nama yang match dari database",
      "matchType": "identical" | "similar" | "duplicate",
      "similarity": "tingkat kemiripan dalam persen"
    }
  ]
}

Jika tidak ada duplikat, kembalikan:
{
  "hasDuplicates": false,
  "duplicates": []
}`;

    const userPrompt = `Silakan bandingkan daftar nama customer berikut dengan data yang sudah ada di database:

**Nama Customer dari Request:**
${JSON.stringify(requestCustomerNames, null, 2)}

**Nama Customer yang Sudah Ada di Database:**
${JSON.stringify(existingCustomers, null, 2)}

Tolong identifikasi apakah ada nama yang sama, menyerupai, atau kembar. Berikan respon dalam format JSON seperti yang dijelaskan di system prompt.`;

    // Call AI
    let response;
    let responseContent;
    try {
      logger.info('[CUSTOMER_VALIDATION] Calling AI service...');
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      response = await model.invoke(messages);
      responseContent = response.content || response.text || '';
      logger.info(`[CUSTOMER_VALIDATION] AI response received, length: ${responseContent.length}`);
    } catch (aiError) {
      logger.error(`[CUSTOMER_VALIDATION] Error calling AI service: ${aiError.message}`);
      logger.error(`[CUSTOMER_VALIDATION] AI error stack: ${aiError.stack}`);
      throw new Error(
        `Gagal memanggil AI service: ${aiError.message}. ` +
        `Pastikan API key valid dan service dapat diakses.`
      );
    }

    // Parse AI response
    let aiResult;
    try {
      logger.info('[CUSTOMER_VALIDATION] Parsing AI response...');
      // Extract JSON from response (handle markdown code blocks if any)
      let jsonString = responseContent;
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      aiResult = JSON.parse(jsonString);
      logger.info(`[CUSTOMER_VALIDATION] AI response parsed successfully. hasDuplicates: ${aiResult.hasDuplicates}, duplicates count: ${aiResult.duplicates?.length || 0}`);
    } catch (parseError) {
      logger.warn(`[CUSTOMER_VALIDATION] Failed to parse AI response as JSON: ${parseError.message}`);
      logger.warn(`[CUSTOMER_VALIDATION] Raw AI response (first 500 chars): ${responseContent.substring(0, 500)}`);
      // Fallback: try to extract duplicates manually
      aiResult = {
        hasDuplicates: responseContent.toLowerCase().includes('duplikat') || 
                      responseContent.toLowerCase().includes('sama') ||
                      responseContent.toLowerCase().includes('match'),
        duplicates: [],
        rawResponse: responseContent.substring(0, 1000) // Limit raw response untuk logging
      };
      logger.warn(`[CUSTOMER_VALIDATION] Using fallback result. hasDuplicates: ${aiResult.hasDuplicates}`);
    }

    // Validate aiResult structure
    if (!aiResult || typeof aiResult !== 'object') {
      logger.error('[CUSTOMER_VALIDATION] Invalid AI result structure');
      aiResult = {
        hasDuplicates: false,
        duplicates: []
      };
    }

    // Ensure duplicates is an array
    if (!Array.isArray(aiResult.duplicates)) {
      logger.warn('[CUSTOMER_VALIDATION] duplicates is not an array, converting...');
      aiResult.duplicates = [];
    }

    const result = {
      hasDuplicates: aiResult.hasDuplicates || false,
      duplicates: aiResult.duplicates || [],
      message: aiResult.hasDuplicates 
        ? `Ditemukan ${aiResult.duplicates.length} nama customer yang duplikat`
        : 'Tidak ada duplikat ditemukan'
    };

    logger.info(`[CUSTOMER_VALIDATION] Validation completed. Result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    // Log full error details
    logger.error(`[CUSTOMER_VALIDATION] Error in validateDuplicateCustomers: ${error.message || error}`);
    logger.error(`[CUSTOMER_VALIDATION] Error stack: ${error.stack}`);
    logger.error(`[CUSTOMER_VALIDATION] Error name: ${error.name}`);
    logger.error(`[CUSTOMER_VALIDATION] Error code: ${error.code}`);

    // Handle specific error types
    if (error.name === 'DatabaseConnectionError') {
      logger.error(`[CUSTOMER_VALIDATION] Database connection error during validation: ${error.message}`);
      throw error; // Re-throw dengan error object yang sudah diformat
    }

    // Handle AI service errors
    if (error.message && (
      error.message.includes('API key') || 
      error.message.includes('not configured') ||
      error.message.includes('AI Assistant is not enabled') ||
      error.message.includes('menginisialisasi AI') ||
      error.message.includes('memanggil AI service')
    )) {
      logger.error(`[CUSTOMER_VALIDATION] AI service error: ${error.message}`);
      throw new Error(
        `Gagal melakukan validasi duplikat: Konfigurasi AI service tidak valid. ` +
        `Pastikan AI_ENABLED=true dan API key sudah dikonfigurasi dengan benar. ` +
        `Detail: ${error.message}`
      );
    }

    // Generic error
    logger.error(`[CUSTOMER_VALIDATION] Generic error validating duplicate customers: ${error.message || error}`);
    throw new Error(`Gagal melakukan validasi duplikat: ${error.message || error}`);
  }
};

module.exports = {
  validateDuplicateCustomers,
  getCustomersFromDatabase
};

