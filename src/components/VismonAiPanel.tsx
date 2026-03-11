import React, { useEffect, useRef, useState } from 'react';
import type { SimulationStep, TopologySnapshot } from '../types';
import type { CaseStudyId } from '../caseStudies/config';

interface VismonAiPanelProps {
  currentStep: SimulationStep;
  caseStudyId: CaseStudyId;
  recommendation: string | undefined;
  snapshot: TopologySnapshot;
}

const HISTORY_ITEMS: Record<CaseStudyId, Array<{ tag: string; tagColor: string; label: string }>> = {
  CS1: [
    { tag: 'Anomaly', tagColor: '#e07820', label: 'ORAN Call Drops' },
    { tag: 'Anomaly', tagColor: '#e07820', label: 'AN17 – 4G DCR VoLTE' },
    { tag: 'Performance', tagColor: '#3b82f6', label: 'AN01 – 4G No Traffic' },
  ],
  CS2: [
    { tag: 'Anomaly', tagColor: '#e07820', label: 'UE1 PRB Contention' },
    { tag: 'Anomaly', tagColor: '#e07820', label: 'Cell A Overload' },
    { tag: 'Performance', tagColor: '#3b82f6', label: 'Assurance KPI Check' },
  ],
  CS3: [
    { tag: 'Integrity', tagColor: '#8b5cf6', label: 'PCI Clash – Cell B' },
    { tag: 'Anomaly', tagColor: '#e07820', label: 'SINR Degradation' },
    { tag: 'Integrity', tagColor: '#8b5cf6', label: 'PCI Audit – Sector 3' },
  ],
  CS4: [
    { tag: 'Energy', tagColor: '#00a6a6', label: 'Cell-B/C Standby Event' },
    { tag: 'Energy', tagColor: '#00a6a6', label: 'ORU-2 Power Save' },
    { tag: 'Performance', tagColor: '#3b82f6', label: 'Coverage QoE Check' },
  ],
};

const IDLE_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Anomaly Detector rApp is continuously sensing resource usage across Cell A. No anomaly detected.',
  CS2: 'Network Assurance rApp tracking UE1 critical service quality on Cell A. All KPIs nominal.',
  CS3: 'Configuration Integrity rApp monitoring PCI assignments. PCI clash active — SINR degraded across all devices.',
  CS4: 'Intelligent Energy rApp monitoring Cell-B/C PRB load and QoE. Waiting for traffic to drop below energy-saving threshold.',
};

const DETECT_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Service anomaly detected on Cell A. UE1 PRB degradation identified. Initiating enrichment pipeline.',
  CS2: 'UE1 throughput degraded — UE2 and CPE migrated into Cell A causing PRB contention.',
  CS3: 'PCI clash confirmed on Cell A and Cell B. SINR degradation affecting UE1, UE2, and CPE.',
  CS4: 'Cell-B/C traffic fell below energy-saving threshold. Assessing soft-handover eligibility for UE2 and CPE.',
};

const ENRICH_MESSAGES: Record<CaseStudyId, string> = {
  CS1: 'Adding UE, slice, and topology context to anomaly payload…',
  CS2: 'Collecting load, UE mobility, and capacity context for assurance analysis…',
  CS3: 'Enriching with PCI map, SINR trends, and neighbour cell metrics…',
  CS4: 'Collecting UE mobility state, QoE metrics, Cell-A headroom, and coverage overlap…',
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

const TypingDots: React.FC = () => (
  <span className="vai-typing-dots">
    <span />
    <span />
    <span />
  </span>
);

const VismonAiPanel: React.FC<VismonAiPanelProps> = ({
  currentStep,
  caseStudyId,
  recommendation,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecoRef = useRef<string | undefined>(undefined);

  // Typewriter effect on RECOMMEND step
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

  // Reset when leaving RECOMMEND
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

  const getBubbleContent = () => {
    switch (currentStep) {
      case 'IDLE':
        return { text: IDLE_MESSAGES[caseStudyId], typing: false, amber: false };
      case 'DETECT':
        return { text: DETECT_MESSAGES[caseStudyId], typing: true, amber: false };
      case 'ENRICH':
        return { text: ENRICH_MESSAGES[caseStudyId], typing: true, amber: false };
      case 'RCA':
        return { text: RCA_MESSAGES[caseStudyId], typing: true, amber: false };
      case 'RECOMMEND':
        return { text: displayedText, typing: !displayedText || displayedText.length < (recommendation?.length ?? 0), amber: false };
      case 'VALIDATE':
        return { text: VALIDATE_MESSAGES[caseStudyId], typing: false, amber: false };
      case 'ESCALATE':
        return { text: ESCALATE_MESSAGES[caseStudyId], typing: false, amber: true };
      default:
        return { text: IDLE_MESSAGES[caseStudyId], typing: false, amber: false };
    }
  };

  const bubble = getBubbleContent();
  const historyItems = HISTORY_ITEMS[caseStudyId];
  const kpiTable = KPI_TABLES[caseStudyId];

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
        {/* Left sidebar */}
        <div className="vai-sidebar">
          <div className="vai-sidebar-nav">
            <div className="vai-nav-item active">⌂ Home</div>
            <div className="vai-nav-item">⌕ Search</div>
          </div>
          <div className="vai-history-label">History</div>
          {historyItems.map((item, i) => (
            <div key={i} className="vai-history-item">
              <span className="vai-history-tag" style={{ background: item.tagColor + '33', color: item.tagColor, border: `1px solid ${item.tagColor}66` }}>
                {item.tag}
              </span>
              <span className="vai-history-text">{item.label}</span>
            </div>
          ))}
          <div className="vai-more-link">··· More</div>
        </div>

        {/* Main chat area */}
        <div className="vai-chat">
          <div className="vai-chat-scroll">
            <div className="vai-assistant-label">
              <span className="vai-sparkle">✦</span> Assistant:
            </div>
            <div className={`vai-bubble ${bubble.amber ? 'amber' : ''}`}>
              <span className={bubble.amber ? 'vai-amber-text' : ''}>
                {bubble.text}
                {bubble.typing && <TypingDots />}
              </span>

              {/* KPI table appears after typewriter completes on RECOMMEND */}
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

          {/* Input bar */}
          <div className="vai-input-bar">
            <span className="vai-input-placeholder">Send a message...</span>
            <div className="vai-input-icons">
              <span>🎤</span>
              <span>📎</span>
              <span className="vai-send-btn">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VismonAiPanel;
