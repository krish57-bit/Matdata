import { SYSTEM_PROMPT } from "./prompts";

// ── Proxy-based Gemini client ─────────────────────────────────────────────────
// The API key lives on the server. The browser only talks to /api/chat.

const MODEL = "gemini-2.5-flash";

const GENERATION_CONFIG = {
  maxOutputTokens: 2048,
  temperature: 0.1,
  topP: 0.95,
  topK: 40,
};

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
];

/**
 * Start a new chat session — just stores history in memory.
 * @param {Array} history - [{role: 'user'|'model', parts: [{text}]}]
 */
export function startChatSession(history = []) {
  return { history: [...history] };
}

/**
 * Send a message via the server proxy and stream the response.
 * @param {object} chat - Chat session object with history
 * @param {string} message - Raw user input
 * @param {function} onChunk - Called with each streamed text chunk
 * @returns {Promise<string>} Full response text
 */
export async function sendMessageStream(chat, message, onChunk) {
  const sanitized = sanitizeInput(message);
  if (!sanitized) throw new Error("Empty message after sanitization");

  // Build Gemini request body
  const body = {
    model: MODEL,
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      ...chat.history,
      { role: "user", parts: [{ text: sanitized }] },
    ],
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Proxy error: ${response.status}`);
  }

  // Parse SSE stream from server
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  // Update history for next turn
  chat.history.push(
    { role: "user", parts: [{ text: sanitized }] },
    { role: "model", parts: [{ text: fullText }] }
  );

  return fullText;
}

/**
 * Sanitize user input.
 */
export function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 500);
}

/**
 * Convert app message format → Gemini history format
 */
export function toGeminiHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}
