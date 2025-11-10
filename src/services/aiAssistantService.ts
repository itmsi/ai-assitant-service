const DEFAULT_AI_ASSISTANT_BASE_URL = "http://localhost:9565";

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatResponsePayload {
  reply: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_AI_ASSISTANT_BASE_URL;
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }

  return DEFAULT_AI_ASSISTANT_BASE_URL;
};

export async function sendChatMessage(
  payload: ChatRequestPayload
): Promise<ChatResponsePayload> {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}/api/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Gagal menghubungi AI Assistant.";

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error === "string" && errorBody.error.trim()) {
        errorMessage = errorBody.error;
      } else if (
        typeof errorBody?.message === "string" &&
        errorBody.message.trim()
      ) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Abaikan kegagalan parsing error body.
    }

    throw new Error(errorMessage);
  }

  const data = (await response.json()) as ChatResponsePayload;
  if (typeof data?.reply !== "string") {
    throw new Error("Respons AI Assistant tidak valid.");
  }

  return data;
}

