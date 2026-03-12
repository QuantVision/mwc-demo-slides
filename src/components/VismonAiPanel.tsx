import React, { useEffect, useRef, useState } from 'react';
import type { SimulationStep, TopologySnapshot } from '../types';
import type { CaseStudyId } from '../caseStudies/config';

interface VismonAiPanelProps {
  currentStep: SimulationStep;
  caseStudyId: CaseStudyId;
  recommendation: string | undefined;
  snapshot: TopologySnapshot;
}

// ── Message tables ────────────────────────────────────────────────────────────

const IDLE_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Anomaly Detector rApp is continuously sensing resource usage across Cell A. No anomaly detected.',
  CS2: 'Network Assurance rApp tracking UE1 critical service quality on Cell A. All KPIs nominal.',
  CS3: 'Configuration Integrity rApp monitoring PCI assignments. PCI clash active — SINR degraded across all devices.',
  CS4: 'Intelligent Energy rApp monitoring Cell-B/C PRB load and QoE. Waiting for traffic to drop below energy-saving threshold.',
};

// DETECT + ENRICH: rApp is working internally, VISMON AI is not yet queried
const WAITING_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Anomaly Detector rApp is enriching the event payload. Awaiting VISMON AI query…',
  CS2: 'Assurance rApp is collecting context. Awaiting VISMON AI query…',
  CS3: 'Integrity rApp is enriching PCI + SINR context. Awaiting VISMON AI query…',
  CS4: 'Energy rApp is assessing handover safety. Awaiting VISMON AI query…',
};

const RCA_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Submitting enriched payload to VISMON RCA Engine. Cross-domain analysis in progress…',
  CS2: 'VISMON AI analysing topology and historical handover patterns for root cause…',
  CS3: 'VISMON AI computing optimal replacement PCI for Cell B to eliminate interference…',
  CS4: 'VISMON Energy AI evaluating standby safety — PRB headroom, coverage continuity, and QoE impact…',
};

const VALIDATE_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Validating KPI improvement on DU/CU after policy action.',
  CS2: 'Confirming UE1 service restoration on Cell B after controlled handover.',
  CS3: 'Verifying SINR recovery and throughput normalisation after PCI update and RU reboot.',
  CS4: 'Cell-B/C in standby. Sliding-window observer tracking Cell-A load, QoE, and coverage for reactivation trigger.',
};

const ESCALATE_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Residual contention detected. Escalating to NOC for guided intervention.',
  CS2: 'Handover recommendation escalated. Awaiting NOC approval.',
  CS3: 'PCI conflict escalated for manual optimisation review.',
  CS4: 'Energy optimisation escalated. Standby conditions require engineer confirmation.',
};

// Engineer questions typed in the input bar during RCA step
const ENGINEER_QUESTIONS: Record<CaseStudyId, string> = {
  CS1: "What's causing the PRB degradation on Cell A? UE1 throughput has dropped.",
  CS2: 'UE1 critical service is degraded — is there a handover recommendation?',
  CS3: 'SINR is degraded across UE1, UE2 and CPE. Is this a PCI conflict?',
  CS4: 'Cell-B/C load has dropped below threshold. Is standby mode safe now?',
};

const KPI_TABLES: Record<CaseStudyId, Array<{ attr: string; detail: string }>> = {
  CS1: [
    { attr: 'Anomaly Type', detail: 'PRB Contention' },
    { attr: 'Cell', detail: 'Cell A' },
    { attr: 'Severity', detail: 'High' },
    { attr: 'Degradation', detail: 'UE1 throughput drop' },
    { attr: 'Alarm Severity', detail: 'High' },
  ],
  CS2: [
    { attr: 'Anomaly Type', detail: 'UE Overload' },
    { attr: 'Cell', detail: 'Cell A' },
    { attr: 'Severity', detail: 'High' },
    { attr: 'Action', detail: 'UE1 handover to Cell B' },
    { attr: 'Alarm Severity', detail: 'Medium' },
  ],
  CS3: [
    { attr: 'Anomaly Type', detail: 'PCI Clash' },
    { attr: 'Cells', detail: 'Cell A & Cell B' },
    { attr: 'Severity', detail: 'High' },
    { attr: 'Degradation', detail: 'SINR, throughput loss' },
    { attr: 'Alarm Severity', detail: 'High' },
  ],
  CS4: [
    { attr: 'Opportunity', detail: 'Energy Saving' },
    { attr: 'Cell', detail: 'Cell-B/C' },
    { attr: 'PRB Load', detail: '< threshold' },
    { attr: 'Action', detail: 'Standby + soft-HO' },
    { attr: 'Risk', detail: 'Low' },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

const TypingDots: React.FC = () => (
  <span className="vai-typing-dots">
    <span />
    <span />
    <span />
  </span>
);

// ── Main component ────────────────────────────────────────────────────────────

const VismonAiPanel: React.FC<VismonAiPanelProps> = ({
  currentStep,
  caseStudyId,
  recommendation,
}) => {
  // Assistant typewriter state
  const [displayedText, setDisplayedText] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecoRef = useRef<string | undefined>(undefined);

  // Engineer chat state
  const [typedQuestion, setTypedQuestion] = useState('');   // live input bar text
  const [showUserBubble, setShowUserBubble] = useState(false); // sent user bubble
  const [sendFlash, setSendFlash] = useState(false);           // send button flash
  const engineerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCaseRef = useRef<CaseStudyId | null>(null);

  // ── Engineer typing animation (RCA step) ────────────────────────────────────
  useEffect(() => {
    if (currentStep === 'RCA' && !showUserBubble) {
      // Avoid re-triggering if already shown for this case
      if (lastCaseRef.current === caseStudyId) return;
      lastCaseRef.current = caseStudyId;

      const question = ENGINEER_QUESTIONS[caseStudyId];
      setTypedQuestion('');

      if (engineerTimerRef.current) clearInterval(engineerTimerRef.current);

      let i = 0;
      engineerTimerRef.current = setInterval(() => {
        i++;
        setTypedQuestion(question.slice(0, i));
        if (i >= question.length) {
          if (engineerTimerRef.current) clearInterval(engineerTimerRef.current);
          engineerTimerRef.current = null;
          // Flash send button, then show user bubble
          setSendFlash(true);
          setTimeout(() => {
            setSendFlash(false);
            setShowUserBubble(true);
            setTypedQuestion('');
          }, 350);
        }
      }, 40);
    }

    return () => {
      if (engineerTimerRef.current) clearInterval(engineerTimerRef.current);
    };
  }, [currentStep, caseStudyId, showUserBubble]);

  // ── Reset engineer state when leaving RCA ───────────────────────────────────
  useEffect(() => {
    if (currentStep !== 'RCA' && currentStep !== 'RECOMMEND' &&
        currentStep !== 'VALIDATE' && currentStep !== 'ESCALATE') {
      if (engineerTimerRef.current) {
        clearInterval(engineerTimerRef.current);
        engineerTimerRef.current = null;
      }
      setTypedQuestion('');
      setShowUserBubble(false);
      setSendFlash(false);
      lastCaseRef.current = null;
    }
  }, [currentStep]);

  // ── Assistant typewriter on RECOMMEND ───────────────────────────────────────
  useEffect(() => {
    if (currentStep === 'RECOMMEND' && recommendation && recommendation !== lastRecoRef.current) {
      lastRecoRef.current = recommendation;
      setDisplayedText('');
      setShowTable(false);
      setShowFeedback(false);

      if (typewriterRef.current) clearInterval(typewriterRef.current);

      let i = 0;
      typewriterRef.current = setInterval(() => {
        i++;
        setDisplayedText(recommendation.slice(0, i));
        if (i >= recommendation.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          setTimeout(() => setShowTable(true), 300);
          setTimeout(() => setShowFeedback(true), 600);
        }
      }, 18);
    }

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [currentStep, recommendation]);

  // Reset assistant state when leaving RECOMMEND
  useEffect(() => {
    if (currentStep !== 'RECOMMEND') {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      setDisplayedText('');
      setShowTable(false);
      setShowFeedback(false);
      lastRecoRef.current = undefined;
    }
  }, [currentStep]);

  // Hard-reset all display state whenever the active UC changes
  useEffect(() => {
    if (typewriterRef.current) { clearInterval(typewriterRef.current); typewriterRef.current = null; }
    if (engineerTimerRef.current) { clearInterval(engineerTimerRef.current); engineerTimerRef.current = null; }
    setDisplayedText('');
    setShowTable(false);
    setShowFeedback(false);
    setTypedQuestion('');
    setShowUserBubble(false);
    setSendFlash(false);
    lastRecoRef.current = undefined;
    lastCaseRef.current = null;
  }, [caseStudyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bubble content ───────────────────────────────────────────────────────────
  const getBubbleContent = () => {
    switch (currentStep) {
      case 'IDLE':
        return { text: IDLE_MESSAGES[caseStudyId], typing: false, amber: false };
      case 'DETECT':
      case 'ENRICH':
        // VISMON AI is not yet queried — show waiting state, no typing animation
        return { text: WAITING_MESSAGES[caseStudyId], typing: false, amber: false };
      case 'RCA':
        return { text: RCA_MESSAGES[caseStudyId], typing: true, amber: false };
      case 'RECOMMEND':
        return {
          text: displayedText,
          typing: !displayedText || displayedText.length < (recommendation?.length ?? 0),
          amber: false,
        };
      case 'VALIDATE':
        return { text: VALIDATE_MESSAGES[caseStudyId], typing: false, amber: false };
      case 'ESCALATE':
        return { text: ESCALATE_MESSAGES[caseStudyId], typing: false, amber: true };
      default:
        return { text: IDLE_MESSAGES[caseStudyId], typing: false, amber: false };
    }
  };

  const bubble = getBubbleContent();
  const kpiTable = KPI_TABLES[caseStudyId];
  const inputPlaceholder = typedQuestion || 'Send a message...';
  const isTypingInBar = typedQuestion.length > 0;

  return (
    <div className="vai-root">
      {/* Top bar */}
      <div className="vai-topbar">
        <div className="vai-topbar-left">
          <span className="vai-topbar-icon">☰</span>
          <span className="vai-topbar-icon">◎</span>
          <span className="vai-topbar-readanswers">Read answers</span>
        </div>
        <div className="vai-topbar-brand">
          <span className="vai-brand-vismon">VISMON</span>
          <span className="vai-brand-ai">AI</span>
        </div>
      </div>

      <div className="vai-body">
        <div className="vai-chat">
          <div className="vai-chat-scroll">

            {/* Engineer user bubble — appears after typing animation completes */}
            {showUserBubble && (
              <div className="vai-user-bubble">
                {ENGINEER_QUESTIONS[caseStudyId]}
              </div>
            )}

            <div className="vai-assistant-label">
              <span className="vai-sparkle">✦</span> Assistant:
            </div>
            <div className={`vai-bubble ${bubble.amber ? 'amber' : ''}`}>
              <span className={bubble.amber ? 'vai-amber-text' : ''}>
                {bubble.text}
                {bubble.typing && <TypingDots />}
              </span>

              {/* KPI table after typewriter completes on RECOMMEND */}
              {currentStep === 'RECOMMEND' && showTable && (
                <table className="vai-kpi-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiTable.map((row, i) => (
                      <tr key={i}>
                        <td>{row.attr}</td>
                        <td>{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {showFeedback && (
              <div className="vai-feedback">
                <span>👍</span><span>👎</span>
                <span className="vai-feedback-text">Was this response helpful?</span>
              </div>
            )}
          </div>

          {/* Input bar — shows live typing during RCA step */}
          <div className="vai-input-bar">
            <span className={`vai-input-placeholder ${isTypingInBar ? 'typing' : ''}`}>
              {inputPlaceholder}
              {isTypingInBar && <span className="vai-cursor">|</span>}
            </span>
            <div className="vai-input-icons">
              <span>🎤</span>
              <span>📎</span>
              <span className={`vai-send-btn ${sendFlash ? 'sending' : ''}`}>→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VismonAiPanel;
