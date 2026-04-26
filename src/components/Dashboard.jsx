import { motion } from "framer-motion";
import { UserIcon, BookIcon, MapIcon, ChatIcon, TimelineIcon, VerifyIcon, IdeaIcon } from "./Icons";

export default function Dashboard({ onNavigate }) {
  const stakeholders = [
    { id: "voters", title: "For Electors", icon: <UserIcon size={32} />, color: "#0f2d6b", desc: "Registration, e-EPIC, and voter rights." },
    { id: "candidates", title: "For Candidates", icon: <BookIcon size={32} />, color: "#FF9933", desc: "Nominations, affidavits, and guidelines." },
    { id: "management", title: "Election Management", icon: <TimelineIcon size={32} />, color: "#138808", desc: "Phases, schedules, and official data." },
  ];

  const stats = [
    { label: "Registered Voters", value: "96.8 Cr+", color: "var(--accent)" },
    { label: "Polling Stations", value: "10.5 Lakh", color: "var(--saffron)" },
    { label: "Election Phases", value: "7 Stages", color: "var(--success)" },
  ];

  return (
    <div className="dashboard">
      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section className="hero-section">
        <motion.div 
          className="hero-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="hero-content">
            <h2 className="hero-title">Shaping India's Future, <br/>One Vote at a Time.</h2>
            <p className="hero-subtitle">MATDATA brings the authority of the Election Commission with the intelligence of AI. Verified, Unfiltered, and Precise.</p>
            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={() => onNavigate("chat")}>
                <ChatIcon size={20} /> Ask MATDATA AI
              </button>
              <button className="btn-hero-secondary" onClick={() => onNavigate("timeline")}>
                View Election Journey
              </button>
            </div>
          </div>
          <div className="hero-badge-float">
            <VerifyIcon size={24} className="text-[var(--saffron)]" />
            <span>Official ECI Data Source</span>
          </div>
        </motion.div>
      </section>

      {/* ── Stats Strip ─────────────────────────────────────────────────── */}
      <section className="stats-strip">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            className="stat-item"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </section>

      {/* ── Stakeholder Hub ─────────────────────────────────────────────── */}
      <section className="hub-section">
        <h3 className="section-title-small">Stakeholder Information Hub</h3>
        <div className="hub-grid">
          {stakeholders.map((s, i) => (
            <motion.div 
              key={s.id}
              className="hub-card"
              whileHover={{ y: -8, shadow: "var(--shadow-md)" }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className="hub-icon-wrap" style={{ background: `${s.color}15`, color: s.color }}>
                {s.icon}
              </div>
              <h4 className="hub-card-title">{s.title}</h4>
              <p className="hub-card-desc">{s.desc}</p>
              <button className="hub-card-btn" onClick={() => onNavigate("timeline")}>Explore →</button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Myth Buster ─────────────────────────────────────────────────── */}
      <section className="myth-section">
        <div className="myth-card">
          <div className="myth-header">
            <IdeaIcon size={24} className="text-[var(--saffron)]" />
            <h3>Myth Vs Reality</h3>
          </div>
          <div className="myth-content">
            <div className="myth-item">
              <span className="myth-label red">MYTH</span>
              <p>"My vote is not secret and political parties can see who I voted for."</p>
            </div>
            <div className="myth-item">
              <span className="myth-label green">REALITY</span>
              <p>Voting is 100% secret. The EVM does not store any link between the voter's identity and their choice. Only total counts are recorded.</p>
            </div>
          </div>
          <button className="btn-ghost w-full mt-4" onClick={() => onNavigate("chat")}>Ask AI about more myths</button>
        </div>
      </section>
    </div>
  );
}
