import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getElectionPhases } from "../services/firebase";
import { IdeaIcon, HashIcon } from "./Icons";
import { trackEvent } from "../services/firebase";

// Skeleton loader for individual phase card
function PhaseSkeleton() {
  return (
    <div className="timeline-card skeleton-card" aria-hidden="true">
      <div className="skeleton-header">
        <div className="skeleton-circle" />
        <div className="skeleton-lines">
          <div className="skeleton-line skeleton-line--wide" />
          <div className="skeleton-line skeleton-line--narrow" />
        </div>
      </div>
    </div>
  );
}

const DAILY_FACTS = [
  "India's first General Election in 1951-52 took 4 months to complete.",
  "The 2024 elections saw the highest number of women candidates ever.",
  "Indelible ink is manufactured exclusively by Mysore Paints and Varnish Limited.",
  "Every polling booth in India must be within 2km of every voter's home.",
  "The age for voting was lowered from 21 to 18 in 1988 by the 61st Amendment.",
  "Electronic Voting Machines (EVMs) were first used in 1982 in Paravur, Kerala.",
  "VVPAT was introduced to provide a paper audit trail for every vote cast."
];

function FactOfTheDay() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const fact = DAILY_FACTS[dayOfYear % DAILY_FACTS.length];

  return (
    <motion.div 
      className="fact-of-the-day"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="fact-header">
        <IdeaIcon size={18} className="text-[var(--saffron)]" />
        <span>Fact of the Day</span>
      </div>
      <p>{fact}</p>
    </motion.div>
  );
}

export default function ElectionTimeline() {
  const [phases, setPhases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    getElectionPhases().then((data) => {
      setPhases(data);
      setLoading(false);
      trackEvent("timeline_viewed");
    });
  }, []);

  const handleSelect = (phase) => {
    const next = selected?.id === phase.id ? null : phase;
    setSelected(next);
    trackEvent("timeline_phase_clicked", { phase: phase.title });
  };

  const filteredPhases = phases.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.titleHindi && p.titleHindi.includes(search)) ||
      p.description.toLowerCase().includes(q) ||
      p.details.some((d) => d.toLowerCase().includes(q)) ||
      (p.keyFacts && p.keyFacts.some((f) => f.toLowerCase().includes(q)))
    );
  });

  return (
    <section className="timeline-section" aria-label="Indian Election Timeline">
      <header className="section-header">
        <h2>Election Timeline</h2>
        <p>6 phases of the Indian election process — from voter registration to result declaration. Click any phase to expand.</p>
      </header>

      {/* Fact of the Day — dynamic based on current date */}
      <FactOfTheDay />

      <div className="timeline-search-wrap" role="search" aria-label="Search election phases">
        <label htmlFor="timeline-search" className="sr-only">Search phases</label>
        <input
          id="timeline-search"
          ref={searchRef}
          className="timeline-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search phases, keywords, or Hindi terms..."
          aria-label="Search across election phases"
        />
        {search && (
          <button
            className="timeline-search-clear"
            onClick={() => { setSearch(""); searchRef.current?.focus(); }}
            aria-label="Clear search"
          >×</button>
        )}
      </div>

      {loading && (
        <div className="timeline" role="status" aria-live="polite" aria-label="Loading election phases">
          {[1, 2, 3, 4, 5, 6].map((i) => <PhaseSkeleton key={i} />)}
        </div>
      )}

      {!loading && filteredPhases.length === 0 && (
        <div className="timeline-empty" role="status">
          <p>No phases match "<strong>{search}</strong>". Try different keywords.</p>
        </div>
      )}

      {!loading && filteredPhases.length > 0 && (
        <div className="timeline" role="list">
          {filteredPhases.map((phase, idx) => {
            const isOpen = selected?.id === phase.id;
            const phaseNumber = phases.findIndex((p) => p.id === phase.id) + 1;
            return (
              <article
                key={phase.id}
                className={`timeline-card timeline-card--animate ${isOpen ? "timeline-card--active" : ""}`}
                style={{ "--phase-color": phase.color, animationDelay: `${idx * 80}ms` }}
                role="listitem"
              >
                <button
                  className="timeline-card-header"
                  onClick={() => handleSelect(phase)}
                  aria-expanded={isOpen}
                  aria-controls={`phase-body-${phase.id}`}
                  aria-label={`Phase ${phaseNumber}: ${phase.title}. ${phase.duration}. ${isOpen ? "Collapse" : "Expand"} details.`}
                >
                  <div className="timeline-left">
                    <span
                      className="phase-number"
                      style={{ background: phase.color }}
                      aria-hidden="true"
                    >
                      {phaseNumber}
                    </span>
                    <div className="phase-info">
                      <span className="phase-title">{phase.title}</span>
                      {phase.titleHindi && (
                        <span className="phase-title-hindi" lang="hi">{phase.titleHindi}</span>
                      )}
                      <span className="phase-duration">{phase.duration}</span>
                    </div>
                  </div>
                  <motion.span 
                    className="phase-chevron" 
                    aria-hidden="true"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`phase-body-${phase.id}`}
                      className="timeline-card-body overflow-hidden"
                      role="region"
                      aria-label={`${phase.title} — detailed information`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                    <p className="phase-description">{phase.description}</p>

                    {/* Key facts checklist */}
                    <div className="phase-section-label">📌 Key facts for voters</div>
                    <ul className="phase-steps" aria-label="Key steps and facts">
                      {phase.details.map((step, i) => (
                        <li key={i} className="phase-step">
                          <span className="step-check" aria-hidden="true">✓</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Did you know callout */}
                    {phase.didYouKnow && (
                      <div className="phase-did-you-know" role="note" aria-label="Did you know?">
                        <span className="dyk-icon" aria-hidden="true">
                          <IdeaIcon size={20} />
                        </span>
                        <div>
                          <strong>Did you know?</strong>
                          <p>{phase.didYouKnow}</p>
                        </div>
                      </div>
                    )}

                    {/* ECI key facts chips */}
                    {phase.keyFacts && (
                      <div className="phase-key-facts" aria-label="Quick reference facts">
                        <span className="phase-section-label">⚡ Quick reference</span>
                        <div className="key-facts-list">
                          {phase.keyFacts.map((fact, i) => (
                            <span key={i} className="key-fact-chip">{fact}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Official Links */}
                    {phase.links && (
                      <div className="phase-links">
                        <span className="phase-section-label">🔗 Official Resources</span>
                        <div className="links-grid">
                          {phase.links.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="phase-link-btn">
                              {link.label} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}

      <div className="timeline-footer-note" aria-label="Data source note">
        Data sourced from <a href="https://eci.gov.in" target="_blank" rel="noopener noreferrer" aria-label="Election Commission of India website">eci.gov.in</a> · Voter Helpline: <strong>1950</strong>
      </div>
    </section>
  );
}
