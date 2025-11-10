import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/services/aiAssistantService";
import { ChatIcon, CloseIcon, PaperPlaneIcon } from "@/icons";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status?: "sending" | "sent" | "error";
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content: "Hai! Ada yang bisa saya bantu hari ini?",
  status: "sent",
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = inputValue.trim();

    if (!trimmedMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
      status: "sent",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage({ message: trimmedMessage });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          status: "sent",
        },
      ]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Maaf, permintaan kamu tidak dapat diproses saat ini. Silakan coba lagi nanti.",
          status: "error",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-[var(--color-main)] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs opacity-80">
                Terhubung ke server pada port 9565
              </p>
            </div>
            <button
              type="button"
              aria-label="Tutup chat"
              onClick={handleToggle}
              className="rounded-full p-1 transition hover:bg-white/10"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    message.role === "user"
                      ? "bg-[var(--color-brand-600)] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2 text-xs text-gray-600 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 delay-100" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 delay-200" />
                  <span>AI sedang mengetik…</span>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-100 px-4 py-3">
            {error && (
              <p className="mb-2 text-xs font-medium text-red-500">{error}</p>
            )}
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[var(--color-brand-500)] focus-within:bg-white">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Tulis pertanyaan kamu…"
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label="Kirim pesan"
              >
                <PaperPlaneIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-label="Buka chat AI Assistant"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-main)] text-white shadow-xl transition hover:scale-105 hover:bg-[var(--color-brand-700)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-500)]"
      >
        <ChatIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default ChatWidget;

