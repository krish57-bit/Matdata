import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app, db, analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
} catch (e) {
  console.warn("Firebase init failed — running with local seed data:", e.message);
}

export { db, analytics };

// ── Sessions ──────────────────────────────────────────────────────────────────

/**
 * Save a chat session to Firestore
 */
export async function saveSession(sessionId, messages) {
  if (!db) return;
  try {
    await setDoc(doc(db, "sessions", sessionId), {
      messages,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Could not save session:", e.message);
  }
}

/**
 * Load a previous chat session
 */
export async function loadSession(sessionId) {
  if (!db) return [];
  try {
    const snap = await getDoc(doc(db, "sessions", sessionId));
    return snap.exists() ? snap.data().messages : [];
  } catch (e) {
    console.warn("Could not load session:", e.message);
    return [];
  }
}

// ── Election Data ─────────────────────────────────────────────────────────────

/**
 * Fetch all election phases from Firestore.
 * Falls back to local seed data if Firestore unavailable.
 */
export async function getElectionPhases() {
  if (db) {
    try {
      const fetchPromise = getDocs(
        query(collection(db, "election_data"), orderBy("order"))
      );
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn("Firestore unavailable, using seed data:", e.message);
    }
  }
  return SEED_ELECTION_PHASES;
}

/**
 * Seed Firestore with all election phase data (run once from admin context)
 */
export async function seedElectionData() {
  if (!db) return;
  for (const phase of SEED_ELECTION_PHASES) {
    await setDoc(doc(db, "election_data", phase.id), phase);
  }
}

// ── Quiz Results ──────────────────────────────────────────────────────────────

/**
 * Persist a quiz result to Firestore
 * @param {string} sessionId
 * @param {number} score
 * @param {number} total
 * @param {string} difficulty  "easy" | "medium" | "hard"
 */
export async function saveQuizResult(sessionId, score, total, difficulty = "medium") {
  if (!db) return;
  try {
    await addDoc(collection(db, "quiz_results"), {
      sessionId,
      score,
      total,
      difficulty,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Could not save quiz result:", e.message);
  }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Initialize Auth (if firebase app is initialized)
export const auth = db ? getAuth() : null;

/**
 * Login user with email and password (voter ID can be used as email prefix).
 */
export async function loginUser(email, password) {
  if (!auth) return null;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (e) {
    console.warn("Login failed:", e.message);
    throw e;
  }
}

/**
 * Register a new user with email (voter ID) and password.
 */
export async function registerUser(email, password) {
  if (!auth) return null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (e) {
    console.warn("Registration failed:", e.message);
    throw e;
  }
}

/**
 * Log out current user.
 */
export async function logoutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Logout failed:", e.message);
  }
}
/**
 * Track an analytics event
 */
export function trackEvent(eventName, params = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch (_) {
    // Analytics failure is non-critical; swallow silently
  }
}

// ── India-Specific Seed Data ──────────────────────────────────────────────────

export const SEED_ELECTION_PHASES = [
  {
    id: "phase_1",
    order: 1,
    title: "Voter Registration",
    titleHindi: "मतदाता पंजीकरण",
    duration: "Ongoing — Closes 4 weeks before polling",
    description:
      "Every Indian citizen aged 18 or above on January 1 of the election year can register as a voter. The Booth Level Officer (BLO) visits homes to verify details, and the Electoral Roll is published for public inspection.",
    icon: "📋",
    color: "#0f2d6b",
    details: [
      "Fill Form 6 at voters.eci.gov.in or at your BLO's office",
      "Minimum age: 18 years as on January 1 of the qualifying year",
      "BLO (Booth Level Officer) verifies address and identity at your doorstep",
      "Receive your EPIC (Electoral Photo Identity Card) — your voter ID",
      "Check/correct your name on the Electoral Roll via Form 8",
      "Deadline: typically 4 weeks before polling day",
    ],
    didYouKnow:
      "India has over 96 crore (960 million) registered voters — the largest electorate in the world. The 2024 General Election had 66.3% voter turnout.",
    keyFacts: [
      "Form 6 — New registration",
      "Form 7 — Request deletion of a name",
      "Form 8 — Correction or migration",
      "Voter Helpline: 1950 (toll-free)",
    ],
    links: [
      { label: "Register Online (voters.eci.gov.in)", url: "https://voters.eci.gov.in/" },
      { label: "Download Voter App", url: "https://voters.eci.gov.in/app" }
    ]
  },
  {
    id: "phase_2",
    order: 2,
    title: "Model Code of Conduct",
    titleHindi: "आदर्श आचार संहिता",
    duration: "From election announcement until result declaration",
    description:
      "The Model Code of Conduct (MCC) comes into force the moment the Election Commission of India announces the election schedule. It applies to all political parties, candidates, and the ruling government.",
    icon: "⚖️",
    color: "#FF9933",
    details: [
      "Government cannot announce new schemes or distribute freebies once MCC is in force",
      "Government vehicles cannot be used for campaigning",
      "Ministers cannot use their official position to campaign",
      "No religious or caste-based appeals allowed in campaigning",
      "ECI appoints observers to enforce MCC in every constituency",
      "C-Vigil app lets citizens report MCC violations with photo/video evidence",
    ],
    didYouKnow:
      "The MCC has no statutory backing — it is a voluntary code. Yet it is consistently followed due to ECI's authority to withhold election permissions and recommend presidential rule.",
    keyFacts: [
      "MCC period: from schedule announcement to result day",
      "Applies to ruling party AND opposition equally",
      "C-Vigil app for reporting violations (100-minute response guarantee)",
      "ECI can recommend disqualification of candidates for violations",
    ],
    links: [
      { label: "MCC Guidelines (ECI)", url: "https://eci.gov.in/mcc/" },
      { label: "c-Vigil Portal", url: "https://cvigil.eci.gov.in/" }
    ]
  },
  {
    id: "phase_3",
    order: 3,
    title: "Nomination & Scrutiny",
    titleHindi: "नामांकन और जांच",
    duration: "Approximately 2 weeks after schedule announcement",
    description:
      "Any eligible Indian citizen can contest an election by filing a nomination. Candidates must submit Form 2B along with a mandatory affidavit declaring their criminal record, assets, and liabilities.",
    icon: "🏛️",
    color: "#138808",
    details: [
      "Security deposit: ₹25,000 (general) / ₹12,500 (SC-ST candidates) for Lok Sabha",
      "Security deposit: ₹10,000 (general) / ₹5,000 (SC-ST) for Assembly seats",
      "Affidavit in Form 26 must disclose criminal antecedents, assets and liabilities",
      "Returning Officer scrutinizes nominations for legal eligibility",
      "Candidates may withdraw by 11 AM on the last withdrawal date",
      "Deposit is forfeited if candidate gets less than 1/6 of valid votes polled",
    ],
    didYouKnow:
      "In 2024 Lok Sabha elections, 8,360 candidates contested across 543 constituencies. The affidavit system — introduced in 2002 — was a Supreme Court mandate to ensure voters know about candidates' criminal history.",
    keyFacts: [
      "Form 2B — Nomination form",
      "Form 26 — Affidavit (criminal record, assets, liabilities)",
      "Minimum 10 proposers from the constituency required for independent candidates",
      "Party symbol allotment done by Returning Officer",
    ],
  },
  {
    id: "phase_4",
    order: 4,
    title: "Campaign Period",
    titleHindi: "प्रचार अभियान",
    duration: "14–21 days between nomination withdrawal and polling day",
    description:
      "Candidates and parties campaign through rallies, door-to-door visits, and media advertising. Campaign expenditure is strictly capped and monitored by ECI-appointed expenditure observers.",
    icon: "📢",
    color: "#7C3AED",
    details: [
      "Expenditure limit: ₹95 lakh per Lok Sabha candidate / ₹40 lakh for Assembly",
      "All expenses must be recorded in Form 10 (expenditure register)",
      "Flying squads and video surveillance teams monitor spending",
      "Campaigning must stop 48 hours before polling begins (Silence Period)",
      "Exit polls are banned from announcement until the last phase of polling ends",
      "Paid news must be declared as an advertisement by parties",
    ],
    didYouKnow:
      "The ECI's 'Systematic Voters' Education and Electoral Participation' (SVEEP) programme is the world's largest voter awareness campaign, using film stars, sports icons, and local influencers.",
    keyFacts: [
      "48-hour campaign silence before each polling phase",
      "Exit polls banned until final phase results",
      "Star campaigners (up to 40 for national parties) — their expenses go to party account",
      "Media Certification and Monitoring Committees (MCMCs) in every district",
    ],
  },
  {
    id: "phase_5",
    order: 5,
    title: "Polling Day",
    titleHindi: "मतदान दिवस",
    duration: "Single day or phased over multiple dates",
    description:
      "Registered voters cast their vote at the designated polling station from 7 AM to 6 PM. The EVM+VVPAT system ensures a secure, verifiable vote. A mock poll is conducted at 5 AM to verify EVM functionality before voters arrive.",
    icon: "🗳️",
    color: "#DC2626",
    details: [
      "Mock Poll at 5 AM: 50 test votes cast on each EVM before opening to public",
      "Voter shows EPIC or any 12 approved photo identity documents",
      "Indelible ink applied on left index finger to prevent double voting",
      "Presiding Officer controls the polling station; polling agents observe",
      "VVPAT slip is visible for 7 seconds after vote — voter verifies their choice",
      "Tender Ballot: if someone claims another person voted in their place",
      "Challenge Vote: any voter can challenge the identity of another voter (₹2 deposit)",
      "PwD voters get priority queuing and ramp access at all booths",
    ],
    didYouKnow:
      "India's largest polling station covers an electorate of 1,26,000 voters in Gir Forest, Gujarat. In remote areas, election officials trek for days to set up polling stations for even a handful of voters — because every vote counts.",
    keyFacts: [
      "Polling hours: 7 AM – 6 PM (may vary by region/phase)",
      "12 documents accepted as voter identity proof (EPIC or alternatives)",
      "EVM has BU (Ballot Unit) visible to voter and CU (Control Unit) with Presiding Officer",
      "ETPBS (Electronically Transmitted Postal Ballot) for armed forces/overseas voters",
    ],
  },
  {
    id: "phase_6",
    order: 6,
    title: "Counting & Results",
    titleHindi: "मतगणना एवं परिणाम",
    duration: "Counting day, 1–2 days after final phase",
    description:
      "Votes are counted under the supervision of the Returning Officer with counting agents from each candidate observing every round. Results are declared constituency by constituency on Form 20.",
    icon: "🔢",
    color: "#0891B2",
    details: [
      "Counting begins at 8 AM on counting day in Counting Centres",
      "Postal ballots (including ETPBS) are counted first before EVM tallying begins",
      "Each round of counting is announced by the Returning Officer on a PA system",
      "Counting agents from every candidate observe each table",
      "Result declared on Form 20 — the final result sheet signed by the Returning Officer",
      "ECI website and Election Results Portal (results.eci.gov.in) show live updates",
      "Re-poll ordered if margin of victory is less than the number of votes declared invalid",
    ],
    didYouKnow:
      "The 2024 Lok Sabha results were declared for all 543 seats in a single day. The fastest declared seat in 2024 was counted in under 30 minutes. India processes over 64 crore valid votes typically within 24 hours — an electoral engineering marvel.",
    keyFacts: [
      "Form 20 — Official result sheet signed by Returning Officer",
      "Returning Officer declares winner and issues election certificate",
      "NOTA votes counted but do not trigger re-election even if they are a plurality",
      "Results.eci.gov.in for live round-by-round vote tallies",
    ],
  },
];

// ── 10-Question India Quiz ─────────────────────────────────────────────────────

export const QUIZ_QUESTIONS = [
  {
    id: "q1",
    difficulty: "easy",
    topic: "voter_registration",
    question: "What is the minimum age to register as a voter in India?",
    options: [
      "16 years",
      "18 years",
      "21 years",
      "25 years",
    ],
    correct: 1,
    explanation:
      "A citizen must be 18 years of age on January 1 of the qualifying year to be eligible to register as a voter in India. This was changed from 21 to 18 years by the 61st Constitutional Amendment in 1988.",
    phaseLink: "phase_1",
  },
  {
    id: "q2",
    difficulty: "easy",
    topic: "evm_vvpat",
    question: "What does VVPAT stand for in Indian elections?",
    options: [
      "Verified Voter Paper Audit Trail",
      "Voter Verifiable Paper Audit Trail",
      "Voting Verification and Paper Audit Technology",
      "Verified Voting Paper and Audit Tool",
    ],
    correct: 1,
    explanation:
      "VVPAT stands for Voter Verifiable Paper Audit Trail. After you press a button on the EVM, the VVPAT prints a slip showing the party symbol and candidate name. The slip is visible through a window for 7 seconds before falling into a sealed box.",
    phaseLink: "phase_5",
  },
  {
    id: "q3",
    difficulty: "easy",
    topic: "nota",
    question: "When was NOTA (None of the Above) introduced in Indian elections?",
    options: [
      "1999",
      "2004",
      "2013",
      "2019",
    ],
    correct: 2,
    explanation:
      "NOTA was introduced in 2013 following a Supreme Court order in the People's Union for Civil Liberties (PUCL) vs Union of India case. It allows voters to formally reject all candidates. NOTA votes are counted but do not cause a re-election.",
    phaseLink: "phase_5",
  },
  {
    id: "q4",
    difficulty: "medium",
    topic: "voter_registration",
    question: "Which form must an Indian citizen fill to register as a new voter?",
    options: [
      "Form 2B",
      "Form 6",
      "Form 8",
      "Form 26",
    ],
    correct: 1,
    explanation:
      "Form 6 is the application form for new voter registration in India, submitted to the Electoral Registration Officer (ERO). Form 7 is for deletion, Form 8 is for correction or migration, and Form 26 is the affidavit filled by election candidates.",
    phaseLink: "phase_1",
  },
  {
    id: "q5",
    difficulty: "medium",
    topic: "election_commission",
    question: "Who appoints the Chief Election Commissioner (CEC) of India?",
    options: [
      "The Prime Minister",
      "The Lok Sabha Speaker",
      "The President of India",
      "The Supreme Court Chief Justice",
    ],
    correct: 2,
    explanation:
      "The Chief Election Commissioner is appointed by the President of India under Article 324 of the Constitution. The CEC can only be removed through a process akin to removing a Supreme Court judge — impeachment by Parliament — ensuring independence from the executive.",
    phaseLink: "phase_2",
  },
  {
    id: "q6",
    difficulty: "medium",
    topic: "lok_sabha_rajya_sabha",
    question: "How are members of the Rajya Sabha (Upper House) elected in India?",
    options: [
      "Directly by citizens through General Elections",
      "Elected by members of State Legislative Assemblies (MLAs)",
      "Appointed by the President of India",
      "Selected by the Prime Minister's office",
    ],
    correct: 1,
    explanation:
      "Rajya Sabha members are elected indirectly by elected members of State Legislative Assemblies (MLAs) using a Single Transferable Vote system. The Rajya Sabha has 245 seats — 233 elected and 12 nominated by the President. One-third retire every two years.",
    phaseLink: "phase_1",
  },
  {
    id: "q7",
    difficulty: "medium",
    topic: "model_code_of_conduct",
    question: "When does the Model Code of Conduct (MCC) come into force?",
    options: [
      "On the day of polling",
      "30 days before polling day",
      "On the day the election schedule is announced by ECI",
      "When the nomination process begins",
    ],
    correct: 2,
    explanation:
      "The Model Code of Conduct comes into effect immediately when the Election Commission of India announces the election schedule — not when polling begins. From that moment, the government cannot announce new schemes, and all candidates and parties must follow ECI's conduct rules.",
    phaseLink: "phase_2",
  },
  {
    id: "q8",
    difficulty: "hard",
    topic: "nomination",
    question: "What is the security deposit for a general (non-SC/ST) candidate contesting a Lok Sabha election?",
    options: [
      "₹10,000",
      "₹12,500",
      "₹25,000",
      "₹50,000",
    ],
    correct: 2,
    explanation:
      "A general candidate contesting a Lok Sabha election must deposit ₹25,000 as security deposit. SC/ST candidates pay ₹12,500 (half). For State Assembly elections, the amounts are ₹10,000 and ₹5,000 respectively. The deposit is forfeited if the candidate gets less than 1/6th of total valid votes polled.",
    phaseLink: "phase_3",
  },
  {
    id: "q9",
    difficulty: "hard",
    topic: "polling_day",
    question: "What is a 'Tender Ballot' in the Indian polling process?",
    options: [
      "A postal ballot issued to armed forces personnel",
      "A ballot issued when someone finds their vote has already been cast in their name",
      "A provisional ballot issued when EVM malfunctions",
      "A ballot used during the mock poll at 5 AM",
    ],
    correct: 1,
    explanation:
      "A Tender Ballot is issued when a voter arrives at the booth and finds that someone else has already cast a vote in their name. The genuine voter is given a Tender Ballot (paper ballot) which is kept separately and counted only if the margin of victory is less than the total Tender Ballots cast.",
    phaseLink: "phase_5",
  },
  {
    id: "q10",
    difficulty: "hard",
    topic: "anti_defection",
    question: "Under which Schedule of the Indian Constitution is the Anti-Defection Law contained?",
    options: [
      "Seventh Schedule",
      "Eighth Schedule",
      "Ninth Schedule",
      "Tenth Schedule",
    ],
    correct: 3,
    explanation:
      "The Anti-Defection Law is in the Tenth Schedule of the Constitution, added by the 52nd Constitutional Amendment Act of 1985. It disqualifies a legislator if they voluntarily give up party membership or vote against the party's direction without prior permission. The decision is made by the Speaker (Lok Sabha) or Chairman (Rajya Sabha).",
    phaseLink: "phase_6",
  },
];
