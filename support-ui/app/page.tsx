"use client";

import { useState } from "react";
import styles from "./page.module.css";

type RawResult = {
  intent: string;
  decision: string;
  status?: string;
  response: unknown; // may be a string, JSON string, or already-parsed object
};

type AgentStep = {
  id: string;
  label: string;
  description: string;
};

const AGENT_PIPELINE: AgentStep[] = [
  { id: "intent", label: "Intent Agent", description: "Classifying query category" },
  { id: "retrieval", label: "Retrieval Agent", description: "Fetching user & CI data" },
  { id: "response", label: "Response Agent", description: "Generating resolution note" },
  { id: "decision", label: "Decision Agent", description: "Assigning priority & state" },
];

const INTENT_LABELS: Record<string, string> = {
  account_issue: "Account Issue",
  payment_issue: "Payment Issue",
  complaint: "Complaint",
  general_query: "General Query",
  unknown: "Unknown",
};

const DECISION_COLORS: Record<string, string> = {
  Escalated: "amber",
  Resolved: "green",
  Pending: "accent",
};

// ── Cute robotic cat SVGs ─────────────────────────────────────────
function RoboCat({ size = 64, accent = "#38bdf8" }: { size?: number; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ears */}
      <polygon points="10,20 18,8 22,22" fill={accent} opacity="0.7" />
      <polygon points="42,22 46,8 54,20" fill={accent} opacity="0.7" />
      {/* inner ears */}
      <polygon points="13,19 18,11 21,20" fill="#080b0f" opacity="0.5" />
      <polygon points="43,20 46,11 51,19" fill="#080b0f" opacity="0.5" />
      {/* head */}
      <rect x="10" y="18" width="44" height="34" rx="12" fill="#111820" stroke={accent} strokeWidth="1.5" />
      {/* antenna */}
      <line x1="32" y1="18" x2="32" y2="10" stroke={accent} strokeWidth="1.5" />
      <circle cx="32" cy="8" r="3" fill={accent} opacity="0.9" />
      <circle cx="32" cy="8" r="1.5" fill="#080b0f" />
      {/* eyes */}
      <rect x="16" y="26" width="12" height="9" rx="3" fill="#0d1117" stroke={accent} strokeWidth="1" />
      <rect x="36" y="26" width="12" height="9" rx="3" fill="#0d1117" stroke={accent} strokeWidth="1" />
      {/* eye glow */}
      <rect x="19" y="28" width="6" height="5" rx="2" fill={accent} opacity="0.8" />
      <rect x="39" y="28" width="6" height="5" rx="2" fill={accent} opacity="0.8" />
      {/* pupil */}
      <rect x="21" y="29" width="2" height="3" rx="1" fill="#080b0f" />
      <rect x="41" y="29" width="2" height="3" rx="1" fill="#080b0f" />
      {/* nose */}
      <polygon points="32,38 29,41 35,41" fill={accent} opacity="0.6" />
      {/* mouth */}
      <path d="M27 43 Q32 47 37 43" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* whiskers */}
      <line x1="10" y1="40" x2="24" y2="39" stroke={accent} strokeWidth="0.8" opacity="0.4" />
      <line x1="10" y1="43" x2="24" y2="42" stroke={accent} strokeWidth="0.8" opacity="0.4" />
      <line x1="40" y1="39" x2="54" y2="40" stroke={accent} strokeWidth="0.8" opacity="0.4" />
      <line x1="40" y1="42" x2="54" y2="43" stroke={accent} strokeWidth="0.8" opacity="0.4" />
      {/* circuit lines on head */}
      <path d="M14 32 L18 32" stroke={accent} strokeWidth="0.6" opacity="0.3" />
      <path d="M46 32 L50 32" stroke={accent} strokeWidth="0.6" opacity="0.3" />
      {/* chin panel */}
      <rect x="22" y="47" width="20" height="3" rx="1.5" fill={accent} opacity="0.2" />
    </svg>
  );
}

function TinyCat({ accent = "#38bdf8" }: { accent?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="3,8 6,2 8,8" fill={accent} opacity="0.7" />
      <polygon points="12,8 14,2 17,8" fill={accent} opacity="0.7" />
      <rect x="3" y="7" width="14" height="10" rx="4" fill="#111820" stroke={accent} strokeWidth="1" />
      <circle cx="7" cy="11" r="2" fill={accent} opacity="0.8" />
      <circle cx="13" cy="11" r="2" fill={accent} opacity="0.8" />
      <circle cx="7.5" cy="11" r="0.8" fill="#080b0f" />
      <circle cx="13.5" cy="11" r="0.8" fill="#080b0f" />
      <circle cx="10" cy="14" r="1" fill={accent} opacity="0.5" />
    </svg>
  );
}

function PawPrint({ accent = "#38bdf8", size = 16 }: { accent?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="4" r="1.5" fill={accent} opacity="0.4" />
      <circle cx="11" cy="4" r="1.5" fill={accent} opacity="0.4" />
      <circle cx="3" cy="7" r="1.5" fill={accent} opacity="0.4" />
      <circle cx="13" cy="7" r="1.5" fill={accent} opacity="0.4" />
      <ellipse cx="8" cy="10" rx="3.5" ry="3" fill={accent} opacity="0.4" />
    </svg>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────
function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className={styles.list}>
          {listItems.map((item, i) => (
            <li key={i} className={styles.listItem}
              dangerouslySetInnerHTML={{ __html: parseInline(item) }}
            />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(`flush-${i}`); return; }

    if (/^\d+\.\s/.test(trimmed)) {
      flushList(`flush-${i}`);
      const content = trimmed.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className={styles.numberedItem}>
          <span className={styles.numberBadge}>{trimmed.match(/^(\d+)/)?.[1]}</span>
          <span dangerouslySetInnerHTML={{ __html: parseInline(content) }} />
        </div>
      );
    } else if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
    } else if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      flushList(`flush-${i}`);
      const heading = trimmed.replace(/^\*\*|\*\*$/g, "");
      elements.push(<p key={i} className={styles.sectionHeading}>{heading}</p>);
    } else {
      flushList(`flush-${i}`);
      elements.push(
        <p key={i} className={styles.responseLine}
          dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }}
        />
      );
    }
  });

  flushList("end");
  return elements;
}

function extractSubject(text: string): string {
  const match = text.match(/^Subject:\s*(.+)/im);
  return match ? match[1].trim() : "";
}

function stripSubjectLine(text: string): string {
  return text.replace(/^Subject:\s*.+\n?/im, "").trim();
}

// ── Main component ─────────────────────────────────────────────────
export default function Home() {
  const [userId, setUserId] = useState("user1");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [rawResult, setRawResult] = useState<RawResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setRawResult(null);
    setActiveStep(0);

    for (let step = 0; step < AGENT_PIPELINE.length; step++) {
      setActiveStep(step);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const res = await fetch("http://localhost:8000/handle_incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, query }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setRawResult(data);
      setTs(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setActiveStep(AGENT_PIPELINE.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend.");
      setActiveStep(-1);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setRawResult(null);
    setError(null);
    setActiveStep(-1);
    setTs("");
  }

  // Parse result fields — backend may nest {intent,decision,response} inside response as JSON string
  function extractAll(raw: RawResult) {
    let intent = raw.intent ?? "";
    let decision = raw.decision ?? (raw as Record<string, unknown>).status as string ?? "";
    let innerText = "";

    if (typeof raw.response === "string") {
      try {
        const inner = JSON.parse(raw.response) as Record<string, unknown>;
        if (inner && typeof inner === "object") {
          if (!intent || intent === "unknown") intent = String(inner.intent ?? intent);
          if (!decision || decision === "unknown") decision = String(inner.decision ?? decision);
          innerText = typeof inner.response === "string" ? inner.response : raw.response;
        } else { innerText = raw.response; }
      } catch { innerText = raw.response; }
    } else if (raw.response && typeof raw.response === "object") {
      const obj = raw.response as Record<string, unknown>;
      if (!intent || intent === "unknown") intent = String(obj.intent ?? intent);
      if (!decision || decision === "unknown") decision = String(obj.decision ?? decision);
      innerText = typeof obj.response === "string" ? obj.response : JSON.stringify(raw.response);
    }

    return {
      intent,
      decision,
      subject: extractSubject(innerText),
      responseBody: stripSubjectLine(innerText),
    };
  }

  const { intent, decision, subject, responseBody } = rawResult
    ? extractAll(rawResult)
    : { intent: "", decision: "", subject: "", responseBody: "" };

  const isEscalated = decision === "Escalated";
  const decisionColor = DECISION_COLORS[decision] ?? "accent";

  return (
    <div className={styles.root}>
      {/* Ambient grid background */}
      <div className={styles.gridBg} aria-hidden />

      {/* Floating paw prints decoration */}
      <div className={styles.pawDecorTL} aria-hidden><PawPrint size={24} accent="#38bdf8" /></div>
      <div className={styles.pawDecorBR} aria-hidden><PawPrint size={20} accent="#38bdf8" /></div>

      <div className={styles.layout}>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>

            {/* Brand with robo cat */}
            <div className={styles.brand}>
              <div className={styles.brandCatWrap}>
                <RoboCat size={52} accent="#38bdf8" />
              </div>
              <div>
                <div className={styles.brandName}>AgentOps</div>
                <div className={styles.brandSub}>Support Intelligence</div>
              </div>
            </div>

            <nav className={styles.nav}>
              <div className={`${styles.navItem} ${styles.navActive}`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span>Incidents</span>
              </div>
              <div className={styles.navItem}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>History</span>
              </div>
              <div className={styles.navItem}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.5 5.5H13L9.5 8L11 12.5L7 10L3 12.5L4.5 8L1 5.5H5.5L7 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                <span>Agents</span>
              </div>
            </nav>
          </div>

          {/* Pipeline panel */}
          <div className={styles.pipelinePanel}>
            <div className={styles.panelLabel}>
              <TinyCat accent="#38bdf8" />
              <span>Agent Pipeline</span>
            </div>
            <div className={styles.pipeline}>
              {AGENT_PIPELINE.map((step, idx) => {
                const done = activeStep > idx;
                const current = activeStep === idx && loading;
                return (
                  <div key={step.id} className={styles.pipelineStep}>
                    <div className={styles.pipelineLeft}>
                      <div className={`${styles.stepDot} ${done ? styles.dotDone : current ? styles.dotActive : styles.dotIdle}`}>
                        {done && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#0ea5e9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {current && <span className={styles.dotPulse} />}
                      </div>
                      {idx < AGENT_PIPELINE.length - 1 && (
                        <div className={`${styles.stepLine} ${done ? styles.lineDone : styles.lineIdle}`} />
                      )}
                    </div>
                    <div className={styles.stepInfo}>
                      <span className={`${styles.stepLabel} ${current ? styles.stepLabelActive : done ? styles.stepLabelDone : ""}`}>
                        {step.label}
                      </span>
                      <span className={styles.stepDesc}>{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.footerStatus}>
              <span className={styles.statusDot} />
              <span>Backend connected</span>
            </div>
            <div className={styles.footerVersion}>v1.0.0</div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className={styles.main}>

          {/* Topbar */}
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <span className={styles.topbarTitle}>New Incident</span>
              <span className={styles.topbarCrumb}>/</span>
              <span className={styles.topbarSub}>Submit & Resolve</span>
            </div>
            <div className={styles.topbarRight}>
              {ts && <span className={styles.timestamp}>{ts}</span>}
              <div className={styles.userBadge}>
                <span>{userId === "user1" ? "SU" : "MA"}</span>
              </div>
            </div>
          </header>

          <div className={styles.content}>

            {/* ── Query form ── */}
            <div className={styles.formSection}>
              <div className={styles.sectionTitle}>
                <span className={styles.sectionIndex}>01</span>
                <span>Incident Details</span>
                <span className={styles.catChip}><TinyCat accent="#38bdf8" /><span>Describe your issue</span></span>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="userId">User</label>
                    <select
                      id="userId"
                      className={styles.select}
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    >
                      <option value="user1">user1 — Sushant</option>
                      <option value="user2">user2 — Madan</option>
                    </select>
                  </div>

                  <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                    <label className={styles.fieldLabel} htmlFor="query">Query</label>
                    <textarea
                      id="query"
                      className={styles.textarea}
                      placeholder="Describe the issue in detail. Use words like 'urgent' or 'ASAP' to trigger escalation…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="button" className={styles.btnGhost} onClick={handleClear} disabled={loading}>
                    Clear
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={loading || !query.trim()}>
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Running agents…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <path d="M2 6.5H11M7 2.5L11 6.5L7 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Dispatch Incident
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.errorBanner}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#f87171" strokeWidth="1.2" />
                  <path d="M7 4V7" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="9.5" r="0.7" fill="#f87171" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* ── Result ── */}
            {rawResult && (
              <div className={styles.resultSection}>
                <div className={styles.sectionTitle}>
                  <span className={styles.sectionIndex}>02</span>
                  <span>Resolution Output</span>
                  <div className={`${styles.statusPill} ${isEscalated ? styles.pillEscalated : styles.pillResolved}`}>
                    <span className={styles.pillDot} />
                    {decision || "Resolved"}
                  </div>
                </div>

                {/* ── Meta strip: Intent · Decision · User · Time ── */}
                <div className={styles.metaStrip}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>
                      <PawPrint size={10} accent="#3d5166" /> INTENT
                    </span>
                    <span className={styles.metaVal}>{INTENT_LABELS[intent] ?? intent ?? "—"}</span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>
                      <PawPrint size={10} accent="#3d5166" /> DECISION
                    </span>
                    <span className={`${styles.metaVal} ${styles[`metaDecision_${decisionColor}`]}`}>
                      {decision || "—"}
                    </span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>
                      <PawPrint size={10} accent="#3d5166" /> USER
                    </span>
                    <span className={styles.metaVal}>{userId}</span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>
                      <PawPrint size={10} accent="#3d5166" /> TIME
                    </span>
                    <span className={`${styles.metaVal} ${styles.metaMono}`}>{ts}</span>
                  </div>
                </div>

                {/* Escalation banner */}
                {isEscalated && (
                  <div className={styles.escalationBanner}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1.5L12.5 11H1.5L7 1.5Z" stroke="#fbbf24" strokeWidth="1.2" fill="none" />
                      <path d="M7 5.5V8" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="7" cy="9.8" r="0.7" fill="#fbbf24" />
                    </svg>
                    <span>Escalated to human admin — automated resolution was not possible</span>
                  </div>
                )}

                {/* ── Response card ── */}
                <div className={styles.responseCard}>
                  <div className={styles.responseCardHeader}>
                    <div className={styles.responseCardHeaderLeft}>
                      <span className={styles.responseCardCatIcon}><TinyCat accent="#38bdf8" /></span>
                      <span className={styles.responseCardLabel}>Resolution Note</span>
                    </div>
                    <div className={styles.dots}>
                      <span /><span /><span />
                    </div>
                  </div>

                  {/* Subject line */}
                  {subject && (
                    <div className={styles.subjectRow}>
                      <span className={styles.subjectKey}>Subject</span>
                      <span className={styles.subjectVal}>{subject}</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className={styles.responseBody}>
                    {responseBody ? renderMarkdown(responseBody) : null}
                  </div>
                </div>

              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}