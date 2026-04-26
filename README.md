# 🗳️ MATDATA — Civic Intelligence Platform

> A premium, high-performance civic education platform for the Indian election process. Built to empower voters with direct, unfiltered, and truthful information using Google Gemini API, Firebase, and Google Maps.

---

## 🚀 The Vision
**MATDATA** (Sanskrit for "Voter") is more than just a guide; it's a "Better than ECI" interactive experience. It bridges the gap between complex bureaucratic data and the modern citizen using high-end design, AI-driven insights, and real-time civic pulse.

---

## 🛠️ Core Modules

| Module | Purpose | Tech Stack |
|---|---|---|
| **MATDATA AI Hub** | Direct, "Grok-style" factual assistant for political & electoral queries. | **Gemini 1.5 Flash** (Strict Temperature) |
| **Home Dashboard** | Premium entry point with Live Pulse, Myth Busters, and Stakeholder hubs. | **Framer Motion**, **Glassmorphism** |
| **Election Journey** | 6-phase interactive journey with "Fact of the Day" and official ECI resources. | **Firebase Firestore** |
| **Booth Locator** | One-tap navigation to the nearest polling/government booth. | **Google Maps API** |
| **Knowledge Quiz** | Advanced MCQ engine to gamify civic literacy. | **Firebase Firestore** |

---

## 💎 Premium Design Philosophy
- **Rich Aesthetics:** Uses a "Patriotic Tech" palette (Deep Navy, Saffron, Emerald Green) with glassmorphic layers and spring-physics animations.
- **Direct Tone:** Unlike generic assistants, MATDATA AI provides unvarnished, factual truths based on public records and Supreme Court rulings.
- **Accessibility:** Fully ARIA-compliant, bilingual (Hindi/English), and mobile-optimized.

---

## 📦 Setup & Deployment

```bash
# 1. Clone & Install
git clone https://github.com/your-username/matdata.git
cd matdata
npm install

# 2. Configure Environment
cp .env.example .env
# Add your Gemini, Maps, and Firebase keys to .env

# 3. Development
npm run dev

# 4. Production Build
npm run build

# 5. Deploy to Google Cloud (Firebase)
firebase deploy
```

## 🔐 Security & Data
- **Voter Privacy:** No personal data is stored. EPIC/Voter ID integration is handled via Firebase Auth for secure, private profile management.
- **Data Integrity:** All electoral facts are sourced from the **Election Commission of India (ECI)** and verified legal databases.
- **Safety:** AI guardrails are tuned to prevent hallucination while allowing harsh, factual political discussion.

---

## 🗺️ Future Roadmap
- **EPIC Verification:** Integration with official ECI APIs for real-time voter slip generation.
- **3D EVM Module:** Interactive Three.js simulation of EVM/VVPAT mechanics.
- **Regional Support:** Expansion to all 22 official languages of India.
- **Constituency Pulse:** Real-time candidate comparison tools.
