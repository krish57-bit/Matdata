import { sanitizeInput, toGeminiHistory } from "./gemini";
import { SEED_ELECTION_PHASES, QUIZ_QUESTIONS } from "./firebase";

describe("gemini.js tests", () => {
  it("sanitizeInput strips HTML tags", () => {
    const input = "<p>Hello <b>World</b></p>";
    expect(sanitizeInput(input)).toBe("Hello World");
  });

  it("sanitizeInput enforces 500 char limit", () => {
    const longInput = "a".repeat(600);
    expect(sanitizeInput(longInput).length).toBe(500);
  });

  it("sanitizeInput returns empty for whitespace-only", () => {
    expect(sanitizeInput("   \n  \t  ")).toBe("");
  });

  it("toGeminiHistory converts 'assistant' role to 'model'", () => {
    const messages = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ];
    const history = toGeminiHistory(messages);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("model");
    expect(history[1].parts[0].text).toBe("Hello");
  });

  it("toGeminiHistory handles empty array", () => {
    expect(toGeminiHistory([])).toEqual([]);
    expect(toGeminiHistory(null)).toEqual([]);
  });
});

describe("firebase.js data tests", () => {
  it("SEED_ELECTION_PHASES has 6 items in correct order", () => {
    expect(SEED_ELECTION_PHASES.length).toBe(6);
    expect(SEED_ELECTION_PHASES[0].order).toBe(1);
    expect(SEED_ELECTION_PHASES[5].order).toBe(6);
  });

  it("Every phase has id, title, description, details array", () => {
    SEED_ELECTION_PHASES.forEach(phase => {
      expect(phase.id).toBeDefined();
      expect(phase.title).toBeDefined();
      expect(phase.description).toBeDefined();
      expect(Array.isArray(phase.details)).toBe(true);
      expect(phase.details.length).toBeGreaterThan(0);
    });
  });

  it("QUIZ_QUESTIONS has 10 items", () => {
    expect(QUIZ_QUESTIONS.length).toBe(10);
  });

  it("Every question has correct index within options array bounds", () => {
    QUIZ_QUESTIONS.forEach(q => {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
    });
  });

  it("Every question has explanation text > 20 chars", () => {
    QUIZ_QUESTIONS.forEach(q => {
      expect(q.explanation.length).toBeGreaterThan(20);
    });
  });
});
