# Alur Proses AI Assistant Service

Dokumentasi ini menjelaskan alur lengkap proses AI Assistant dari request user hingga mendapatkan jawaban.

## 📋 Alur Proses (8 Langkah)

```
User
 │
 │  (1) Pertanyaan
 ▼
Chat UI / Frontend
 │
 │  (2) POST /api/mosa/ai-assistant/chat
 ▼
AI Service (Express.js)
 │
 │  (3) Kirim prompt + tools
 ▼
LLM (OpenAI/Sumopod)
 │
 │  (4) Pilih tool + parameter
 ▼
AI Service (Express.js)
 │
 │  (5) Panggil service domain
 ▼
Internal API (SSO / CRM / HR / Quotation)
 │
 │  (6) Data JSON
 ▼
AI Service (Express.js)
 │
 │  (7) Kirim data ke LLM
 ▼
LLM (OpenAI/Sumopod)
 │
 │  (8) Jawaban natural language
 ▼
User
```

## 🔍 Detail Implementasi

### Step 1: User Mengirim Pertanyaan
User mengirim pertanyaan melalui Chat UI/Frontend, contoh:
```json
{
  "message": "Tampilkan 5 quotation terbaru minggu ini"
}
```

### Step 2: POST Request ke AI Service
**Endpoint:** `POST /api/mosa/ai-assistant/chat`

**File:** `src/modules/ai_assistant/handler.js`

**Proses:**
- Menerima request dengan body `{ message, sessionId? }`
- Validasi message tidak kosong
- Extract JWT token dari header `Authorization: Bearer <token>`
- Generate sessionId jika tidak disediakan
- Panggil `processChat()` dari service

```12:57:src/modules/ai_assistant/handler.js
const chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return baseResponseGeneral(res, {
        success: false,
        message: 'Pesan tidak boleh kosong',
      });
    }

    // Get user info from JWT token
    let userId = 'anonymous';
    let authToken = null;
    let isAuthenticated = false;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwtDecode(token);
        userId = decoded.sub || decoded.userId || decoded.id || 'anonymous';
        authToken = token;
        isAuthenticated = userId !== 'anonymous';
      } catch (error) {
        logger.warn('Invalid JWT token, using anonymous user');
      }
    }

    // Generate session ID if not provided
    let finalSessionId = sessionId;

    if (!finalSessionId) {
      if (isAuthenticated) {
        finalSessionId = `session_${userId}`;
      } else {
        finalSessionId = `session_guest_${Date.now()}`;
      }
    }

    // Process chat
    const result = await processChat(
      message.trim(),
      userId,
      finalSessionId,
      authToken
    );
```

### Step 3: Kirim Prompt + Tools ke LLM
**File:** `src/modules/ai_assistant/service.js`

**Proses:**
- Initialize model (OpenAI atau Sumopod)
- Ambil conversation history dari Redis
- Convert ke LangChain messages format
- Bind tools (function calling) ke model
- Invoke model dengan prompt + tools

```220:256:src/modules/ai_assistant/service.js
const processChat = async (userMessage, userId, sessionId, authToken) => {
  try {
    // Initialize model
    const model = initializeModel();

    // Get conversation history (fallback to empty array if Redis not available)
    let conversationHistory = [];
    try {
      conversationHistory = await getConversation(userId, sessionId) || [];
    } catch (error) {
      logger.warn(`Failed to get conversation history from Redis, using empty array: ${error.message || error}`);
      conversationHistory = [];
    }

    // Convert to LangChain messages
    const messages = convertToLangChainMessages(conversationHistory);
    messages.push(new HumanMessage(userMessage));

    // Prepare model with tools if function calling is enabled
    let modelToUse = model;
    let tools = [];
    
    if (aiConfig.AI_ENABLE_FUNCTION_CALLING) {
      tools = getToolsForLangChain();
      // Convert tools to format compatible with ChatOpenAI
      // For LangChain 0.1.x, we pass tools in bind or use .bind()
      try {
        // Try using bind with tools parameter
        modelToUse = model.bind({
          tools: tools,
        });
      } catch (error) {
        logger.warn(`Failed to bind tools, continuing without function calling: ${error.message}`);
        // Continue without tools if binding fails
      }
    }

    // Invoke model
    let response = await modelToUse.invoke(messages);
    let toolCalls = extractToolCalls(response);
```

**Tools yang Tersedia:**
- `call_gateway_endpoint` - Akses API Gateway untuk semua service
- `search_hr_candidates` - Cari kandidat dari HR
- `search_hr_employees` - Cari karyawan dari HR
- `search_quotations` - Cari quotation
- `search_ecatalog_products` - Cari produk eCatalog
- `summarize_data` - Ringkas data

### Step 4: LLM Memilih Tool + Parameter
**File:** `src/modules/ai_assistant/service.js`

**Proses:**
- LLM menganalisis pertanyaan user
- Memilih tool yang sesuai (misal: `search_quotations`)
- Menentukan parameter yang diperlukan (misal: `limit: 5`, `startDate`, `endDate`)

```261:304:src/modules/ai_assistant/service.js
    // Handle function calls if any
    while (toolCalls.length > 0) {
      logger.info(`Function calls detected: ${toolCalls.length}`);

      // Add AI response to messages
      messages.push(response);

      // Execute function calls and create tool messages
      for (const toolCall of toolCalls) {
        try {
          const toolName = toolCall.name;
          const toolArgs = toolCall.args || {};

          logger.info(`Executing tool: ${toolName}`, toolArgs);

          const result = await executeTool(toolName, toolArgs, authToken);

          // Create ToolMessage with results
          const toolMessage = new ToolMessage({
            content: JSON.stringify(result, null, 2),
            tool_call_id: toolCall.id,
          });

          messages.push(toolMessage);
        } catch (error) {
          logger.error(`Error executing tool ${toolCall.name}: ${error.message || error}`);
          
          // Create ToolMessage with error
          const toolMessage = new ToolMessage({
            content: JSON.stringify({
              success: false,
              message: `Error: ${error.message}`,
            }),
            tool_call_id: toolCall.id,
          });

          messages.push(toolMessage);
        }
      }

      // Get final response from model with tool results
      response = await model.invoke(messages);
      toolCalls = extractToolCalls(response);
    }
```

### Step 5: Panggil Service Domain (Internal API)
**File:** `src/modules/ai_assistant/tools.js`

**Proses:**
- Execute tool yang dipilih LLM
- Panggil API Gateway atau microservice langsung
- Kirim authToken untuk autentikasi
- Contoh untuk quotation:

```346:410:src/modules/ai_assistant/tools.js
/**
 * Tool: Mencari quotation
 */
const searchQuotations = {
  name: 'search_quotations',
  description: 'Mencari data quotation berdasarkan nomor, status, atau periode.',
  parameters: {
    type: 'object',
    properties: {
      quotationNumber: {
        type: 'string',
        description: 'Nomor quotation untuk pencarian',
      },
      status: {
        type: 'string',
        description: 'Status quotation (draft, sent, approved, rejected)',
      },
      startDate: {
        type: 'string',
        description: 'Tanggal mulai dalam format YYYY-MM-DD',
      },
      endDate: {
        type: 'string',
        description: 'Tanggal akhir dalam format YYYY-MM-DD',
      },
      limit: {
        type: 'number',
        description: 'Jumlah maksimal hasil (default: 10)',
      },
    },
  },
  execute: async ({ quotationNumber, status, startDate, endDate, limit = 10 }, authToken) => {
    try {
      const payload = cleanObject({
        quotationNumber,
        status,
        startDate,
        endDate,
        limit,
      });

      const baseUrl = (aiConfig.API_GATEWAY_BASE_URL || aiConfig.MICROSERVICE_QUOTATION_URL || '').replace(/\/$/, '');
      const endpoint = `${baseUrl}${sanitizePath('/api/quotation/manage-quotation/get')}`;

      const response = await axios.post(
        endpoint,
        payload || {},
        {
          headers: getDefaultHeaders(authToken),
          timeout: aiConfig.API_GATEWAY_TIMEOUT,
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data quotation berhasil diambil',
      };
    } catch (error) {
      logger.error(`Error fetching quotations: ${error.message || error}`);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'Gagal mengambil data quotation',
      };
    }
  },
};
```

**Endpoint yang Tersedia:**
- SSO: `/api/auth`, `/api/users`, `/api/employees`, dll
- Quotation: `/api/quotation/manage-quotation/get`, dll
- HR: `/api/candidates/get`, `/api/employees/get`, dll
- eCatalog: `/api/catalogs/catalogItems/get`, dll
- Dan banyak lagi (lihat `GATEWAY_ALLOWED_PREFIXES` di `tools.js`)

### Step 6: Data JSON Dikembalikan ke AI Service
**File:** `src/modules/ai_assistant/tools.js`

**Proses:**
- Internal API mengembalikan data JSON
- Tool mengemas hasil dalam format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Data quotation berhasil diambil"
}
```
- Data dikembalikan sebagai ToolMessage ke LangChain

### Step 7: Kirim Data ke LLM untuk Diproses
**File:** `src/modules/ai_assistant/service.js`

**Proses:**
- ToolMessage dengan data JSON ditambahkan ke messages
- Model di-invoke lagi dengan data hasil tool
- LLM menganalisis data dan menyiapkan jawaban natural language

```301:304:src/modules/ai_assistant/service.js
      // Get final response from model with tool results
      response = await model.invoke(messages);
      toolCalls = extractToolCalls(response);
    }
```

### Step 8: Jawaban Natural Language ke User
**File:** `src/modules/ai_assistant/service.js` dan `handler.js`

**Proses:**
- Extract response content dari LLM
- Simpan conversation history ke Redis
- Return response ke handler
- Handler mengembalikan response ke user

```306:349:src/modules/ai_assistant/service.js
    // Extract response content
    let responseContent = getMessageContent(response);

    // Update conversation history
    conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });
    conversationHistory.push({
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
    });

    if (!responseContent) {
      responseContent = JSON.stringify(
        {
          type: response?._getType?.() || response?.type || 'unknown',
          message: 'Model tidak memberikan jawaban teks. Silakan ulangi pertanyaan atau laporkan ke admin.',
        },
        null,
        2
      );
    }

    // Limit conversation history
    if (conversationHistory.length > aiConfig.AI_MAX_CONVERSATION_HISTORY * 2) {
      conversationHistory = conversationHistory.slice(-aiConfig.AI_MAX_CONVERSATION_HISTORY * 2);
    }

    // Save conversation history (ignore error if Redis not available)
    try {
      await saveConversation(userId, sessionId, conversationHistory);
    } catch (error) {
      logger.warn(`Failed to save conversation history to Redis: ${error.message || error}`);
      // Continue without saving - conversation will still work but without memory
    }

    return {
      success: true,
      message: responseContent,
      conversationHistory,
    };
```

**Response Format:**
```json
{
  "success": true,
  "message": "Chat berhasil diproses",
  "data": {
    "message": "Berikut adalah 5 quotation terbaru minggu ini...",
    "sessionId": "session_f0b57258-5f33-4e03-81f7-cd70d833b5c5",
    "conversationHistory": [...]
  }
}
```

## ✅ Verifikasi Alur

Alur saat ini **SUDAH SESUAI** dengan alur yang diinginkan:

1. ✅ User mengirim pertanyaan melalui Chat UI
2. ✅ POST `/api/mosa/ai-assistant/chat` ke AI Service
3. ✅ AI Service mengirim prompt + tools ke LLM (Sumopod/OpenAI)
4. ✅ LLM memilih tool + parameter
5. ✅ AI Service memanggil service domain (SSO/CRM/HR/Quotation)
6. ✅ Data JSON dikembalikan ke AI Service
7. ✅ Data dikirim ke LLM untuk diproses
8. ✅ Jawaban natural language dikembalikan ke user

## 🔧 Konfigurasi

**File:** `src/config/ai.js`

**Environment Variables:**
- `AI_ENABLED=true` - Enable/disable AI
- `AI_MODEL_PROVIDER=sumopod` - Provider (openai/sumopod)
- `SUMOPOD_API_KEY` - API key untuk Sumopod
- `SUMOPOD_BASE_URL` - Base URL Sumopod
- `API_GATEWAY_BASE_URL` - Base URL API Gateway
- `AI_ENABLE_FUNCTION_CALLING=true` - Enable function calling

## 📝 Contoh Request

```bash
curl -X 'POST' \
  'http://localhost:9587/api/mosa/ai-assistant/chat' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
  "message": "Tampilkan 5 quotation terbaru minggu ini"
}'
```

## 🚀 Menambah Module Baru

Untuk menambah module baru yang bisa diakses AI:

1. **Tambahkan endpoint ke `GATEWAY_ALLOWED_PREFIXES`** di `src/modules/ai_assistant/tools.js`
2. **Buat tool khusus (opsional)** jika perlu logic khusus
3. **Update system prompt** di `src/config/ai.js` jika perlu

Contoh menambah endpoint baru:
```javascript
const GATEWAY_ALLOWED_PREFIXES = [
  // ... existing endpoints
  '/api/module-baru',
  '/api/module-baru/get',
  '/api/module-baru/create',
];
```

AI akan otomatis bisa mengakses endpoint tersebut melalui tool `call_gateway_endpoint`.

