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
      temperature: 0.0, // Lowest temperature untuk validasi yang ketat dan deterministik
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
      temperature: 0.0, // Lowest temperature untuk validasi yang deterministik
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
const getCustomersFromAPI = async (authHeader) => {
  try {
    logger.info('[CUSTOMER_VALIDATION] Fetching customers from API with pagination...');
    const baseUrl = process.env.API_GATEWAY_BASE_URL || 'https://dev-gateway.motorsights.com';
    const url = `${baseUrl}/api/customers/get`;

    let allCustomerNames = [];
    let page = 1;
    const limit = 100;
    let hasMoreData = true;

    while (hasMoreData) {
      logger.info(`[CUSTOMER_VALIDATION] Fetching page ${page} with limit ${limit}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: page,
          limit: limit,
          sort_by: "created_at",
          sort_order: "desc"
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const json = await response.json();

      let listData = [];
      if (json && json.data && Array.isArray(json.data.data)) {
        listData = json.data.data;
      } else if (json && Array.isArray(json.data)) {
        listData = json.data;
      }

      const namesOnPage = listData
        .map(row => row.customer_name)
        .filter(name => name && name.trim().length > 0);

      allCustomerNames.push(...namesOnPage);

      // Jika jumlah data yang didapat lebih kecil dari limit, berarti ini adalah halaman terakhir.
      if (listData.length < limit) {
        hasMoreData = false;
      } else {
        page++; // Lanjut ke halaman berikutnya
      }
    }

    logger.info(`[CUSTOMER_VALIDATION] Pagination complete. Retrieved total ${allCustomerNames.length} customer names from API`);
    return allCustomerNames;
  } catch (error) {
    logger.error(`[CUSTOMER_VALIDATION] Error fetching customers from API: ${error.message}`);
    throw new Error(`Gagal mengambil data customer dari API: ${error.message}`);
  }
};


/**
 * Validate duplicate customers using AI
 */
const validateDuplicateCustomers = async (requestCustomerNames, authHeader) => {
  try {
    // Get customers from API
    let existingCustomers = [];
    try {
      if (!authHeader) {
        throw new Error("Authorization header is missing");
      }
      existingCustomers = await getCustomersFromAPI(authHeader);
    } catch (dbError) {
      // Jika gagal mengambil data dari database, return error yang informatif
      logger.error(`Failed to get customers from API: ${dbError.message} `);
      throw {
        name: 'APIConnectionError',
        message: dbError.message,
        code: 'API_CONNECTION_ERROR',
        details: {
          suggestion: 'Pastikan gateway motosights dapat diakses'
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
      logger.error(`[CUSTOMER_VALIDATION] Failed to initialize AI model: ${aiInitError.message} `);
      throw new Error(
        `Gagal menginisialisasi AI model: ${aiInitError.message}.` +
        `Pastikan AI_ENABLED = true dan konfigurasi AI service benar.`
      );
    }

    // Prepare prompt untuk AI
    const systemPrompt = `Anda adalah asisten data spesialis yang SANGAT KETAT dalam mendeteksi duplikat nama customer.
Tugas Anda membandingkan daftar nama request dengan daftar nama di database.

ATURAN SANGAT KETAT(WAJIB DIIKUTI):
1. Kembalikan kecocokan(match) jika nama BENAR-BENAR SAMA, ATAU jika terdapat kemiripan yang sangat kuat secara pelafalan (fonetik), ejaan, maupun tata letak kata. Contoh kemiripan yang valid: typo huruf, pengulangan konsonan ("HARIS" vs "HARRIS"), perbedaan urutan/tata letak kata ("PT JAYA ABADI NUSANTARA" vs "PT ABADI JAYA NUSANTARA"), singkatan PT/CV/Bapak/Ibu, beda spasi ("PT HARIS TESTING" vs "HARIS TESTING"), atau kapitalisasi.
2. Jika nama berbeda secara substansial(contoh: "JIHONDU" sangat berbeda dengan "HARIS" atau "PT HARIS TESTING"), MAKA ITU BUKAN DUPLIKAT. JANGAN MASUKKAN KE DALAM HASIL.
3. Tingkat kemiripan riil wajib >= 50%. Jangan pernah mengarang kemiripan untuk nama yang jelas-jelas berbeda bunyi atau mayoritas huruf-hurufnya. Jika hanya mirip 1 huruf dari 10 panjang karakter, maka tolak.
4. Jika tidak menemukan satupun nama yang masuk akal cocoknya sesuai aturan di atas, WAJIB kembalikan JSON dengan hasDuplicates: false dan duplicates: [].

Identifikasi jenis kemiripan(hanya jika lolos aturan di atas):
1. "identical": Nama SAMA PERSIS(mengabaikan huruf besar / kecil).
2. "similar": Kemiripan fonetik (bunyi mirip: "HARIS" vs "HARRIS"), Typo minor, beda spasi / tanda baca, status PT / CV / Tbk.
3. "duplicate": Perbedaan urutan/letak kata ("JAYA ABADI" vs "ABADI JAYA"), atau nama dengan singkatan yang lazim memiliki makna sama.

Format Wajib JSON Output:
      {
        "hasDuplicates": true / false,
        "duplicates": [
          {
            "requestName": "nama yang dicek dari input",
            "matchedName": "nama database yang cocok",
            "matchType": "identical" | "similar" | "duplicate",
            "similarity": "persentase kemiripan (misal '90%')"
          }
        ]
      } `;

    const userPrompt = `Silakan bandingkan daftar nama customer berikut dengan data yang sudah ada di database:

** Nama Customer dari Request:**
    ${JSON.stringify(requestCustomerNames, null, 2)}

    ** Nama Customer yang Sudah Ada di Database:**
    ${JSON.stringify(existingCustomers, null, 2)}

Tolaknya setiap nama yang tidak mirip secara kasat mata, singkatan, atau pelafalan.
Mohon analisa dengan SANGAT KETAT, jangan melakukan halusinasi pencocokan.
Berikan respon dalam format JSON persis seperti yang dijelaskan di system prompt.`;

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
      logger.info(`[CUSTOMER_VALIDATION] AI response received, length: ${responseContent.length} `);
    } catch (aiError) {
      logger.error(`[CUSTOMER_VALIDATION] Error calling AI service: ${aiError.message} `);
      logger.error(`[CUSTOMER_VALIDATION] AI error stack: ${aiError.stack} `);
      throw new Error(
        `Gagal memanggil AI service: ${aiError.message}.` +
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
      logger.info(`[CUSTOMER_VALIDATION] AI response parsed successfully.hasDuplicates: ${aiResult.hasDuplicates}, duplicates count: ${aiResult.duplicates?.length || 0} `);
    } catch (parseError) {
      logger.warn(`[CUSTOMER_VALIDATION] Failed to parse AI response as JSON: ${parseError.message} `);
      logger.warn(`[CUSTOMER_VALIDATION] Raw AI response(first 500 chars): ${responseContent.substring(0, 500)} `);
      // Fallback: try to extract duplicates manually
      aiResult = {
        hasDuplicates: responseContent.toLowerCase().includes('duplikat') ||
          responseContent.toLowerCase().includes('sama') ||
          responseContent.toLowerCase().includes('match'),
        duplicates: [],
        rawResponse: responseContent.substring(0, 1000) // Limit raw response untuk logging
      };
      logger.warn(`[CUSTOMER_VALIDATION] Using fallback result.hasDuplicates: ${aiResult.hasDuplicates} `);
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

    logger.info(`[CUSTOMER_VALIDATION] Validation completed.Result: ${JSON.stringify(result)} `);
    return result;
  } catch (error) {
    // Log full error details
    logger.error(`[CUSTOMER_VALIDATION] Error in validateDuplicateCustomers: ${error.message || error} `);
    logger.error(`[CUSTOMER_VALIDATION] Error stack: ${error.stack} `);
    logger.error(`[CUSTOMER_VALIDATION] Error name: ${error.name} `);
    logger.error(`[CUSTOMER_VALIDATION] Error code: ${error.code} `);

    // Handle specific error types
    if (error.name === 'APIConnectionError') {
      logger.error(`[CUSTOMER_VALIDATION] API connection error during validation: ${error.message} `);
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
      logger.error(`[CUSTOMER_VALIDATION] AI service error: ${error.message} `);
      throw new Error(
        `Gagal melakukan validasi duplikat: Konfigurasi AI service tidak valid. ` +
        `Pastikan AI_ENABLED = true dan API key sudah dikonfigurasi dengan benar. ` +
        `Detail: ${error.message} `
      );
    }

    // Generic error
    logger.error(`[CUSTOMER_VALIDATION] Generic error validating duplicate customers: ${error.message || error} `);
    throw new Error(`Gagal melakukan validasi duplikat: ${error.message || error} `);
  }
};

module.exports = {
  validateDuplicateCustomers,
  getCustomersFromAPI
};

