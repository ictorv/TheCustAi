"use client";

import { useState } from "react";
import styles from "./page.module.css";

type IncidentResponse = {
  intent: string;
  response: string;
  status: string;
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

export default function Home() {
  const [userId, setUserId] = useState("user1");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [result, setResult] = useState<IncidentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveStep(0);

    // Animate pipeline steps
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
      setResult(data);
      setTs(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setActiveStep(AGENT_PIPELINE.length); // all done
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend.");
      setActiveStep(-1);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setError(null);
    setActiveStep(-1);
    setTs("");
  }

  const assignedTo = result?.response
    .split("\n")
    .find((l) => l.startsWith("Assigned to:"))
    ?.replace("Assigned to: ", "");

  const responseText = result?.response
    .split("\n")
    .filter((l) => !l.startsWith("Assigned to:"))
    .join("\n")
    .trim();

  const isEscalated = result?.status === "Escalated";

  return (
    <div className={styles.root}>
      {/* Ambient grid background */}
      <div className={styles.gridBg} aria-hidden />

      <div className={styles.layout}>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <div className={styles.brand}>
              <div className={styles.brandIcon}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 1L16 5V13L9 17L2 13V5L9 1Z" stroke="#38bdf8" strokeWidth="1.2" fill="none" />
                  <path d="M9 5L13 7V11L9 13L5 11V7L9 5Z" fill="#38bdf8" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="0.8" />
                </svg>
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

          {/* Agent pipeline status */}
          <div className={styles.pipelinePanel}>
            <div className={styles.panelLabel}>Agent Pipeline</div>
            <div className={styles.pipeline}>
              {AGENT_PIPELINE.map((step, idx) => {
                const done = activeStep > idx;
                const current = activeStep === idx && loading;
                const idle = activeStep < idx || (activeStep === -1);
                return (
                  <div key={step.id} className={styles.pipelineStep}>
                    <div className={styles.pipelineLeft}>
                      <div className={`${styles.stepDot} ${done ? styles.dotDone : current ? styles.dotActive : idle ? styles.dotIdle : styles.dotDone}`}>
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
            {result && (
              <div className={styles.resultSection}>
                <div className={styles.sectionTitle}>
                  <span className={styles.sectionIndex}>02</span>
                  <span>Resolution Output</span>
                  <div className={`${styles.statusPill} ${isEscalated ? styles.pillEscalated : styles.pillResolved}`}>
                    <span className={styles.pillDot} />
                    {result.status}
                  </div>
                </div>

                {/* Metadata strip */}
                <div className={styles.metaStrip}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>INTENT</span>
                    <span className={styles.metaVal}>{INTENT_LABELS[result.intent] ?? result.intent}</span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>ASSIGNED</span>
                    <span className={styles.metaVal}>{assignedTo ?? "—"}</span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>USER</span>
                    <span className={styles.metaVal}>{userId}</span>
                  </div>
                  <div className={styles.metaSep} />
                  <div className={styles.metaItem}>
                    <span className={styles.metaKey}>TIME</span>
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

                {/* Response body */}
                <div className={styles.responseCard}>
                  <div className={styles.responseCardHeader}>
                    <span className={styles.responseCardLabel}>Resolution Note</span>
                    <div className={styles.dots}>
                      <span /><span /><span />
                    </div>
                  </div>
                  <div className={styles.responseBody}>
                    {responseText ? renderMarkdown(responseText) : null}
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