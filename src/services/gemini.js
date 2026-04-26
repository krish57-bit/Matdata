import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "./prompts";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is not set. Check your .env file.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");


// ── Model Factory ─────────────────────────────────────────────────────────────

export function getElectionModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.1, // Near-zero for extreme factual accuracy
      topP: 0.95,
      topK: 40,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  });
}

/**
 * Start a new chat session with optional history
 * @param {Array} history - Array of {role, parts} objects in Gemini format
 */
export function startChatSession(history = []) {
  const model = getElectionModel();
  return model.startChat({ history });
}

/**
 * Send a message and stream the response token by token
 * @param {object} chat - Active Gemini chat session
 * @param {string} message - Raw user input (will be sanitized internally)
 * @param {function} onChunk - Callback called with each text chunk
 * @returns {Promise<string>} Full accumulated response text
 */
export async function sendMessageStream(chat, message, onChunk) {
  const sanitized = sanitizeInput(message);
  if (!sanitized) throw new Error("Empty message after sanitization");

  const result = await chat.sendMessageStream(sanitized);
  let fullText = "";

  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText += text;
    onChunk(text);
  }

  return fullText;
}

/**
 * Sanitize user input:
 * - Strip all HTML tags
 * - Remove < > characters
 * - Trim whitespace
 * - Enforce 500 character limit
 * @param {string} input
 * @returns {string} Sanitized string
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
 * @param {Array} messages - [{role: 'user'|'assistant', content: string}]
 * @returns {Array} [{role: 'user'|'model', parts: [{text}]}]
 */
export function toGeminiHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}
