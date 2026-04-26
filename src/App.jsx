import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "./components/ChatInterface";
import ElectionTimeline from "./components/ElectionTimeline";
import BoothFinder from "./components/BoothFinder";
import QuizModule from "./components/QuizModule";
import { trackEvent } from "./services/firebase";

import { MatdataIcon, ChatIcon, TimelineIcon, MapIcon, QuizIcon, CivicIcon, VerifyIcon } from "./components/Icons";

import Dashboard from "./components/Dashboard";

const TABS = [
  { id: "home",     label: "Home Dashboard",        icon: <CivicIcon size={18} />, shortLabel: "Home",      ariaLabel: "MATDATA Home Dashboard" },
  { id: "chat",     label: "AI Assistant",          icon: <ChatIcon size={18} />, shortLabel: "Chat",      ariaLabel: "AI Chat with MATDATA" },
  { id: "timeline", label: "Election Journey",      icon: <TimelineIcon size={18} />, shortLabel: "Journey",   ariaLabel: "Indian Election Timeline" },
  { id: "booths",   label: "Booth Locator",         icon: <MapIcon size={18} />, shortLabel: "Booths",     ariaLabel: "Polling Booth Finder" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    trackEvent("tab_changed", { tab: tabId });
  }

  return (
    <div className="app">
      {/* ── Top News Pulse Ticker ───────────────────────────────────────── */}
      <div className="pulse-ticker" aria-hidden="true">
        <div className="pulse-content">
          <span>⚡ LIVE PULSE: Voters registration ongoing for Phase 4</span>
          <span>•</span>
          <span>EVM First Level Check (FLC) starting in 12 districts</span>
          <span>•</span>
          <span>Myth vs Reality: No, your vote cannot be tracked by candidates</span>
          <span>•</span>
          <span>Download your e-EPIC from voters.eci.gov.in</span>
        </div>
      </div>

      {/* Skip to main content — keyboard accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="app-header" role="banner">
        <div className="header-inner">
          <div className="header-brand">
            <MatdataIcon size={40} className="text-[var(--accent)] dark:text-white" />
            <div className="header-text">
              <h1 className="brand-title">MATDATA</h1>
              <p className="brand-sub">
                Empowering India's Democracy through Civic Intelligence
              </p>
            </div>
          </div>
          <div className="header-badge flex gap-2 items-center" aria-label="Verified ECI Data Source">
            <VerifyIcon size={16} className="text-[var(--saffron)]" /> 
            <span>Chunav Ka Parv, Desh Ka Garv <span className="mx-1 opacity-50">·</span> ECI Data</span>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <nav className="tab-nav" role="navigation" aria-label="Main navigation">
        <div className="tab-list" role="tablist" aria-label="App sections">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`tab-btn ${activeTab === tab.id ? "tab-btn--active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
              aria-label={tab.ariaLabel}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-label">{tab.shortLabel}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="tab-indicator"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main id="main-content" className="app-main" role="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="tab-panel"
            tabIndex={0}
          >
            {activeTab === "home" && <Dashboard onNavigate={handleTabChange} />}
            {activeTab === "chat" && <ChatInterface />}
            {activeTab === "timeline" && <ElectionTimeline />}
            {activeTab === "booths" && <BoothFinder />}
            {activeTab === "quiz" && <QuizModule />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="app-footer" role="contentinfo">
        <p className="footer-data">
          Data sourced from&nbsp;
          <a href="https://eci.gov.in" target="_blank" rel="noopener noreferrer" aria-label="Election Commission of India official website">
            Election Commission of India (eci.gov.in)
          </a>
        </p>
        <p className="footer-disclaimer">
          This tool is for civic education only. Not affiliated with any political party.
        </p>
        <div className="footer-links" role="list" aria-label="Official links">
          <a href="https://voters.eci.gov.in" target="_blank" rel="noopener noreferrer" role="listitem">voters.eci.gov.in</a>
          <span aria-hidden="true">·</span>
          <a href="tel:1950" role="listitem" aria-label="Call voter helpline 1950">1950 Voter Helpline</a>
          <span aria-hidden="true">·</span>
          <a href="https://eci.gov.in" target="_blank" rel="noopener noreferrer" role="listitem">eci.gov.in</a>
        </div>
      </footer>
    </div>
  );
}
