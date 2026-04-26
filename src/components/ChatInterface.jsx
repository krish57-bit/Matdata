import { useState, useRef, useEffect, useCallback } from "react";
import { startChatSession, sendMessageStream, toGeminiHistory, sanitizeInput } from "../services/gemini";
import { saveSession, trackEvent } from "../services/firebase";
import { MatdataIcon, SendIcon } from "./Icons";
import ReactMarkdown from "react-markdown";

const SESSION_KEY = "election_session_id";
const STORAGE_KEY = "election_chat_history";
const MAX_CHARS = 500;

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const SUGGESTIONS = [
  { text: "मतदाता पंजीकरण कैसे करें?", lang: "hi" },
  { text: "How do I register to vote?", lang: "en" },
  { text: "EVM क्या है?", lang: "hi" },
  { text: "What is NOTA?", lang: "en" },
  { text: "Polling day process", lang: "en" },
  { text: "मतगणना कैसे होती है?", lang: "hi" },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = useRef(getSessionId());

  // Persist messages to localStorage + Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    saveSession(sessionId.current, messages);
  }, [messages]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Init Gemini chat with existing history
  useEffect(() => {
    const history = toGeminiHistory(messages);
    chatRef.current = startChatSession(history);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      role: "user",
      content: trimmed,
      id: `u_${Date.now()}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamingText("");
    trackEvent("chat_message_sent", { topic_hint: trimmed.slice(0, 40) });

    try {
      if (!chatRef.current) chatRef.current = startChatSession([]);
      let fullText = "";
      await sendMessageStream(chatRef.current, trimmed, (chunk) => {
        fullText += chunk;
        setStreamingText(fullText);
      });
      const assistantMsg = {
        role: "assistant",
        content: fullText,
        id: `a_${Date.now()}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");
      trackEvent("chat_response_received", { length: fullText.length });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "माफ़ करें / Sorry — I couldn't connect right now. Please check your Gemini API key or try again in a moment.",
          id: `err_${Date.now()}`,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
      setStreamingText("");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading]);

  const handleClear = () => {
    setMessages([]);
    setStreamingText("");
    localStorage.removeItem(STORAGE_KEY);
    chatRef.current = startChatSession([]);
    trackEvent("chat_cleared");
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(
        `${content}\n\n— MATDATA (matdata.app) | Data: eci.gov.in`
      );
    } catch (_) { /* ignore */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charsLeft = MAX_CHARS - input.length;
  const isEmpty = messages.length === 0 && !streamingText;

  return (
    <section className="chat-section" aria-label="MATDATA Election Assistant Chat">
      {/* Skip link target */}
      <a id="chat-main" className="sr-only" tabIndex={-1} aria-hidden="true">Chat</a>

      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar-wrap text-[var(--accent)] dark:text-white" aria-hidden="true">
            <MatdataIcon size={30} />
          </div>
          <div>
            <h2 className="chat-title">MATDATA</h2>
            <span className="chat-subtitle">Chunav Ka Parv, Desh Ka Garv</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn-ghost" onClick={handleClear} aria-label="Clear conversation history">
            Clear chat
          </button>
        )}
      </div>

      <div
        className="chat-body"
        role="log"
        aria-live="polite"
        aria-label="Conversation with MATDATA"
        aria-atomic="false"
      >
        {isEmpty && (
          <div className="chat-empty">
            <div className="chat-empty-icon text-[var(--accent)] dark:text-white flex justify-center" aria-hidden="true">
              <MatdataIcon size={64} />
            </div>
            <p className="chat-empty-title">नमस्ते! Ask me about Indian Elections</p>
            <p className="chat-empty-sub">
              I'm MATDATA — your bilingual guide to voter registration, EVMs, VVPAT, 
              polling day process, and everything about Indian democracy. Hindi या English में पूछें।
            </p>
            <div className="suggestions" role="list" aria-label="Suggested questions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  className="suggestion-chip"
                  role="listitem"
                  onClick={() => handleSend(s.text)}
                  aria-label={`Ask: ${s.text}`}
                  lang={s.lang}
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message message--${msg.role}${msg.isError ? " message--error" : ""}`}
          >
            {msg.role === "assistant" && (
              <span className="message-avatar text-[var(--accent)] dark:text-white" aria-hidden="true">
                <MatdataIcon size={24} />
              </span>
            )}
            <div className="message-bubble">
              <MessageContent content={msg.content} />
              <div className="message-meta">
                <span className="message-time">{formatTime(msg.timestamp)}</span>
                {msg.role === "assistant" && !msg.isError && (
                  <button
                    className="btn-copy"
                    onClick={() => handleCopy(msg.content)}
                    aria-label="Copy this response and share it"
                    title="Copy & share"
                  >
                    📋 Copy
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {streamingText && (
          <div
            className="message message--assistant"
            aria-live="polite"
            aria-label="MATDATA is responding"
          >
            <span className="message-avatar text-[var(--accent)] dark:text-white" aria-hidden="true">
              <MatdataIcon size={24} />
            </span>
            <div className="message-bubble message-bubble--streaming">
              <MessageContent content={streamingText} />
              <span className="cursor" aria-hidden="true" />
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="message message--assistant" aria-label="MATDATA is thinking">
            <span className="message-avatar text-[var(--accent)] dark:text-white" aria-hidden="true">
              <MatdataIcon size={24} />
            </span>
            <div className="message-bubble">
              <div className="typing-indicator">
                <span className="typing-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
                <span className="typing-label">MATDATA is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <div className="chat-input-area" role="form" aria-label="Send a message to MATDATA">
        <div className="chat-input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="चुनाव के बारे में पूछें / Ask about elections..."
            maxLength={MAX_CHARS}
            rows={1}
            aria-label="Your question for MATDATA"
            aria-describedby="char-count"
            disabled={isLoading}
          />
          <span
            id="char-count"
            className={`char-count ${charsLeft < 50 ? "char-count--warn" : ""}`}
            aria-live="polite"
            aria-label={`${charsLeft} characters remaining`}
          >
            {charsLeft}
          </span>
        </div>
        <button
          className={`btn-send-circle ${input.trim() ? "active" : ""}`}
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="spinner-small"></div>
          ) : (
            <SendIcon size={20} className="relative left-[2px]" />
          )}
        </button>
      </div>
    </section>
  );
}

function MessageContent({ content }) {
  return (
    <div className="message-content markdown-body">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
