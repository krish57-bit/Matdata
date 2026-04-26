import { useState, useEffect, useRef } from "react";
import { QUIZ_QUESTIONS, saveQuizResult, trackEvent } from "../services/firebase";

const SESSION_KEY = "election_session_id";
const TIMER_SECONDS = 30;

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "#138808", description: "Basic voter awareness" },
  { id: "medium", label: "Medium", color: "#FF9933", description: "Core electoral processes" },
  { id: "hard", label: "Hard", color: "#DC2626", description: "Advanced constitutional knowledge" },
  { id: "all", label: "All levels", color: "#0f2d6b", description: "Complete 10-question quiz" },
];

function getQuestions(difficulty) {
  if (difficulty === "all") return QUIZ_QUESTIONS;
  return QUIZ_QUESTIONS.filter((q) => q.difficulty === difficulty);
}

export default function QuizModule() {
  const [stage, setStage] = useState("select"); // select | quiz | done
  const [difficulty, setDifficulty] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef(null);

  // Timer countdown
  useEffect(() => {
    if (stage !== "quiz" || revealed) return;
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Auto-skip when timer expires
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current, stage, revealed]); // eslint-disable-line

  function handleTimeout() {
    clearInterval(timerRef.current);
    setRevealed(true);
    trackEvent("quiz_timeout", { question_id: questions[current]?.id });
  }

  function startQuiz(diff) {
    const qs = getQuestions(diff);
    setDifficulty(diff);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setRevealed(false);
    setStage("quiz");
    trackEvent("quiz_started", { difficulty: diff, question_count: qs.length });
  }

  function handleSelect(idx) {
    if (revealed) return;
    setSelected(idx);
  }

  function handleReveal() {
    if (selected === null && timeLeft > 0) return;
    clearInterval(timerRef.current);
    setRevealed(true);
    const q = questions[current];
    trackEvent("quiz_answer_submitted", {
      question_id: q.id,
      correct: selected === q.correct,
      difficulty: q.difficulty,
    });
  }

  function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.correct;
    const newAnswers = [
      ...answers,
      { questionId: q.id, correct: isCorrect, skipped: selected === null },
    ];
    setAnswers(newAnswers);
    setSelected(null);
    setRevealed(false);

    if (current === questions.length - 1) {
      const finalScore = newAnswers.filter((a) => a.correct).length;
      const sessionId = sessionStorage.getItem(SESSION_KEY) || "anonymous";
      saveQuizResult(sessionId, finalScore, questions.length, difficulty);
      trackEvent("quiz_completed", {
        score: finalScore,
        total: questions.length,
        difficulty,
        pct: Math.round((finalScore / questions.length) * 100),
      });
      setStage("done");
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function handleRestart() {
    setStage("select");
    setDifficulty(null);
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setRevealed(false);
    trackEvent("quiz_restarted");
  }

  // ── Stage: Difficulty Selection ──────────────────────────────────────────────
  if (stage === "select") {
    return (
      <section className="quiz-section" aria-label="Election Knowledge Quiz">
        <header className="section-header">
          <h2>Test Your Knowledge</h2>
          <p>10 questions on Indian elections. Choose a difficulty level to begin.</p>
        </header>
        <div className="difficulty-grid" role="list" aria-label="Difficulty levels">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              className="difficulty-card"
              onClick={() => startQuiz(d.id)}
              style={{ "--diff-color": d.color }}
              role="listitem"
              aria-label={`${d.label}: ${d.description}`}
            >
              <span className="diff-label" style={{ color: d.color }}>{d.label}</span>
              <span className="diff-description">{d.description}</span>
              <span className="diff-count">
                {d.id === "all"
                  ? `${QUIZ_QUESTIONS.length} questions`
                  : `${getQuestions(d.id).length} question${getQuestions(d.id).length !== 1 ? "s" : ""}`}
              </span>
            </button>
          ))}
        </div>
        <div className="quiz-info-note" aria-label="Quiz information">
          ⏱️ 30 seconds per question &nbsp;·&nbsp; Topics: EVM, Registration, NOTA, MCC, Rajya Sabha, Anti-Defection
        </div>
      </section>
    );
  }

  // ── Stage: Done / Results ────────────────────────────────────────────────────
  if (stage === "done") {
    const score = answers.filter((a) => a.correct).length;
    const skipped = answers.filter((a) => a.skipped).length;
    const pct = Math.round((score / questions.length) * 100);
    const grade =
      pct >= 80 ? { label: "Excellent! 🏆", color: "#138808", bg: "#d1fae5" } :
      pct >= 60 ? { label: "Good job! 👍", color: "#D97706", bg: "#fef3c7" } :
                 { label: "Keep learning! 📚", color: "#4F46E5", bg: "#ede9fe" };

    // Group wrong answers by topic
    const wrongTopics = questions
      .filter((_, i) => !answers[i]?.correct)
      .map((q) => q.topic)
      .filter((t, i, arr) => arr.indexOf(t) === i);

    return (
      <section className="quiz-section" aria-label="Quiz Results">
        <div className="quiz-result" role="status" aria-live="polite">
          <div className="result-badge" style={{ background: grade.bg }}>
            <span className="result-title" style={{ color: grade.color }}>{grade.label}</span>
            <span className="result-score" style={{ color: grade.color }}>
              {score} / {questions.length} correct ({pct}%)
            </span>
          </div>

          {/* Score breakdown stats */}
          <div className="result-stats" aria-label="Score summary">
            <div className="stat-box stat-box--correct">
              <span className="stat-num">{score}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="stat-box stat-box--wrong">
              <span className="stat-num">{answers.filter((a) => !a.correct && !a.skipped).length}</span>
              <span className="stat-label">Wrong</span>
            </div>
            <div className="stat-box stat-box--skipped">
              <span className="stat-num">{skipped}</span>
              <span className="stat-label">Skipped</span>
            </div>
          </div>

          {/* Weak areas */}
          {wrongTopics.length > 0 && (
            <div className="result-weak-areas" aria-label="Topics to study">
              <strong>📖 Study these topics:</strong>
              <div className="weak-topic-chips">
                {wrongTopics.map((topic) => (
                  <span key={topic} className="weak-topic-chip">
                    {topic.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-question breakdown */}
          <div className="result-breakdown" aria-label="Question-by-question breakdown">
            {questions.map((q, i) => {
              const ans = answers[i];
              return (
                <div
                  key={q.id}
                  className={`result-item ${ans?.correct ? "result-item--correct" : ans?.skipped ? "result-item--skipped" : "result-item--wrong"}`}
                >
                  <span className="result-icon" aria-hidden="true">
                    {ans?.correct ? "✓" : ans?.skipped ? "–" : "✗"}
                  </span>
                  <div className="result-item-body">
                    <span className="result-item-q">{q.question}</span>
                    {!ans?.correct && (
                      <span className="result-item-correct">
                        ✓ {q.options[q.correct]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="result-actions">
            <button className="btn-primary" onClick={handleRestart} aria-label="Choose a difficulty and take the quiz again">
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Stage: Active Quiz ───────────────────────────────────────────────────────
  const question = questions[current];
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft > 15 ? "#138808" : timeLeft > 7 ? "#FF9933" : "#DC2626";

  return (
    <section className="quiz-section" aria-label="Election Knowledge Quiz">
      <header className="section-header">
        <h2>Test Your Knowledge</h2>
        <p>
          {difficulty !== "all"
            ? `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} level`
            : "All levels"} &nbsp;·&nbsp; {questions.length} questions
        </p>
      </header>

      {/* Progress */}
      <div
        className="quiz-progress"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${current + 1} of ${questions.length}`}
      >
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(current / questions.length) * 100}%` }}
          />
        </div>
        <span className="progress-label">Question {current + 1} of {questions.length}</span>
      </div>

      {/* Timer bar */}
      <div className="timer-bar-wrap" aria-label={`${timeLeft} seconds remaining`}>
        <div
          className="timer-bar-fill"
          style={{
            width: `${timerPct}%`,
            background: timerColor,
            transition: "width 1s linear, background 0.3s ease",
          }}
        />
        <span
          className="timer-label"
          style={{ color: timerColor }}
          aria-live="polite"
          aria-atomic="true"
        >
          {revealed ? "—" : `${timeLeft}s`}
        </span>
      </div>

      <article className="quiz-card" aria-label={`Question ${current + 1}: ${question.question}`}>
        {/* Difficulty tag */}
        <span
          className={`quiz-difficulty-tag quiz-difficulty-tag--${question.difficulty}`}
          aria-label={`Difficulty: ${question.difficulty}`}
        >
          {question.difficulty}
        </span>

        <h3 className="quiz-question">{question.question}</h3>

        <ul
          className="quiz-options"
          role="radiogroup"
          aria-label="Answer options"
        >
          {question.options.map((opt, idx) => {
            let optClass = "quiz-option";
            if (revealed) {
              if (idx === question.correct) optClass += " quiz-option--correct";
              else if (idx === selected && idx !== question.correct) optClass += " quiz-option--wrong";
            } else if (idx === selected) {
              optClass += " quiz-option--selected";
            }
            return (
              <li key={idx} role="radio" aria-checked={selected === idx}>
                <button
                  className={optClass}
                  onClick={() => handleSelect(idx)}
                  disabled={revealed}
                  aria-label={`Option ${["A","B","C","D"][idx]}: ${opt}${revealed && idx === question.correct ? " — Correct answer" : ""}${revealed && idx === selected && idx !== question.correct ? " — Your answer, incorrect" : ""}`}
                >
                  <span className="option-label" aria-hidden="true">
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  {opt}
                  {revealed && idx === question.correct && (
                    <span className="option-result-icon" aria-hidden="true">✓</span>
                  )}
                  {revealed && idx === selected && idx !== question.correct && (
                    <span className="option-result-icon" aria-hidden="true">✗</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {revealed && (
          <div className="quiz-explanation" role="note" aria-label="Explanation">
            <span className="explanation-icon" aria-hidden="true">💡</span>
            <div>
              <strong>Explanation: </strong>{question.explanation}
            </div>
          </div>
        )}

        <div className="quiz-actions">
          {!revealed ? (
            <button
              className="btn-primary"
              onClick={handleReveal}
              disabled={selected === null}
              aria-label="Check my answer"
            >
              Check answer
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleNext}
              aria-label={current === questions.length - 1 ? "See my final results" : "Go to next question"}
            >
              {current === questions.length - 1 ? "See results" : "Next question →"}
            </button>
          )}
        </div>
      </article>
    </section>
  );
}
