import type {
  TopologyEvent,
  TopologyToken,
  MsgType,
  SimulationStep,
  TopologySnapshot,
  PolicySnapshot,
  UeServiceSnapshot,
} from '../types';
import type { CaseStudyId } from '../caseStudies/config';
import { MSG_TYPE_PATH } from '../topology/paths';

let traceCounter = 1;

function nextTraceId(caseStudyId: CaseStudyId): string {
  const id = `${caseStudyId}-${String(traceCounter).padStart(5, '0')}`;
  traceCounter += 1;
  return id;
}

function jitterBetween(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

type DemoPhase =
  | 'IDLE'
  | 'ANOMALY_ACTIVE'
  | 'RCA'
  | 'RECOMMEND'
  | 'ACTION'
  | 'VALIDATE'
  | 'RESOLVED'
  | 'ESCALATED';

const CS1_RECOMMENDATIONS = [
  'Throttle UE2 best-effort slice to max 38% PRB on Cell A and protect UE1 guaranteed slice at >=45% PRB.',
  'Apply Cell A policy profile: UE1 minimum guaranteed PRB 42%, UE2 dynamic cap 40% during congestion.',
  'Prioritize UE1 service class scheduler weights and cap UE2 burst windows for contention relief.',
  'Activate interference-aware scheduling guardrails on Cell A and enforce UE2 PRB burst control.',
];

const CS2_RECOMMENDATIONS = [
  'Handover UE1 to adjacent Cell B to restore throughput while keeping UE2 and CPE on Cell A.',
  'Move UE1 to Cell B where headroom is available; keep Cell A for non-critical UE2/CPE load.',
  'Trigger controlled UE1 handover to Cell B and preserve Cell A capacity for current burst traffic.',
];

const CS3_PCI_CLASH = 301;
const CS3_PCI_CELL_B_FIXED = 517;
const CS3_RESTART_DURATION_MS = 15_000;
const CS3_RECOMMENDATIONS = [
  `PCI clash confirmed. Keep Cell A PCI ${CS3_PCI_CLASH}, update Cell B PCI to ${CS3_PCI_CELL_B_FIXED}.`,
  `Interference pattern indicates PCI collision. Reconfigure Cell B PCI from ${CS3_PCI_CLASH} to ${CS3_PCI_CELL_B_FIXED}.`,
];

const TOKEN_DURATION_MS: Record<MsgType, number> = {
  KPI: 1100,
  ANOMALY: 1400,
  ENRICH: 1100,
  RCA_REQ: 1300,
  RCA_RESP: 1300,
  RECO: 1400,
  ACTION: 1300,
  VALIDATION: 1400,
  TICKET: 1600,
};

const EVENT_TIMING_MULTIPLIER = 1;
const TOKEN_TIMING_MULTIPLIER = 1.6;
const MIN_SPEED = 0.25;

const POLICY_INTENT =
  'Protect UE1 guaranteed service while limiting UE2 best-effort PRB bursts when both UEs contend on Cell A.';

interface RuntimeState {
  snapshot: TopologySnapshot;
  policy: PolicySnapshot;
  note: string;
}

type SnapshotPatch =
  Partial<Omit<TopologySnapshot, 'ue1' | 'ue2' | 'cpe'>> & {
    ue1?: Partial<UeServiceSnapshot>;
    ue2?: Partial<UeServiceSnapshot>;
    cpe?: Partial<UeServiceSnapshot>;
  };

interface SimulatorOpts {
  caseStudyId: CaseStudyId;
  onEvent: (e: TopologyEvent) => void;
  onToken: (t: TopologyToken) => void;
}

export class CaseStudy1Simulator {
  private caseStudyId: CaseStudyId;
  private speed = 1;
  private closedLoop = true;
  private running = false;
  private phase: DemoPhase = 'IDLE';
  private activeTraceId: string | null = null;
  private timers: Array<ReturnType<typeof setTimeout>> = [];
  private kpiTimer: ReturnType<typeof setTimeout> | null = null;
  private onEvent: (e: TopologyEvent) => void;
  private onToken: (t: TopologyToken) => void;
  private runtime: RuntimeState;

  constructor(opts: SimulatorOpts) {
    this.caseStudyId = opts.caseStudyId;
    this.onEvent = opts.onEvent;
    this.onToken = opts.onToken;
    this.runtime = this.buildSteadyRuntime();
  }

  setSpeed(speed: number) {
    this.speed = Math.max(MIN_SPEED, speed);
  }

  setClosedLoop(closedLoop: boolean) {
    this.closedLoop = closedLoop;
    this.runtime = {
      ...this.runtime,
      policy: {
        ...this.runtime.policy,
        mode: closedLoop ? 'closed-loop' : 'open-loop',
      },
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.scheduleKpiPulse();
  }

  stop() {
    this.running = false;
    if (this.kpiTimer) {
      clearTimeout(this.kpiTimer);
      this.kpiTimer = null;
    }
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  reset() {
    this.stop();
    traceCounter = 1;
    this.phase = 'IDLE';
    this.activeTraceId = null;
    this.runtime = this.buildSteadyRuntime();
  }

  triggerAnomaly() {
    if (!this.running) return;
    if (this.phase !== 'IDLE') return;
    const traceId = nextTraceId(this.caseStudyId);
    this.activeTraceId = traceId;
    if (this.caseStudyId === 'CS2') {
      this.runCaseStudy2Sequence(traceId, 'A', 'UE1');
      return;
    }
    if (this.caseStudyId === 'CS3') {
      this.runCaseStudy3Sequence(traceId, 'A', 'UE1');
      return;
    }
    if (this.caseStudyId === 'CS4') {
      this.runCaseStudy4Sequence(traceId, 'B', 'Cell-B/C');
      return;
    }
    this.runAnomalySequence(traceId, 'A', 'UE1');
  }

  private buildSteadyRuntime(): RuntimeState {
    if (this.caseStudyId === 'CS4') {
      return this.buildCaseStudy4SteadyRuntime();
    }
    if (this.caseStudyId === 'CS2') {
      return {
        snapshot: {
          ue1: { cell: 'A', prb_pct: 54, throughput_mbps: 90, sinr_db: 17, slice: 'Critical UE Service' },
          ue2: { cell: 'B', prb_pct: 25, throughput_mbps: 46, sinr_db: 16, slice: 'Best-Effort UE Service' },
          cpe: { cell: 'B', prb_pct: 34, throughput_mbps: 74, sinr_db: 18, slice: 'Fixed Wireless Access' },
          cell_a_pci: 101,
          cell_b_pci: 203,
          pci_clash: false,
          ru_b_restarting: false,
          ru_b_standby: false,
          cell_a_prb_total: 100,
          cell_a_prb_used: 58,
          cell_b_prb_total: 100,
          cell_b_prb_used: 61,
          contention: false,
          phase: 'steady',
        },
        policy: {
          mode: this.closedLoop ? 'closed-loop' : 'open-loop',
          decision: 'monitoring',
          intent: 'Maintain UE1 service continuity and shift load with adaptive handover when contention is detected.',
          ue1_min_prb_pct: 42,
          ue2_cap_prb_pct: 38,
        },
        note: 'UE1 is monitored on Cell A while UE2 and CPE remain stable on Cell B.',
      };
    }

    if (this.caseStudyId === 'CS3') {
      return {
        snapshot: {
          ue1: { cell: 'A', prb_pct: 44, throughput_mbps: 48, sinr_db: 4.5, slice: 'Critical UE Service' },
          ue2: { cell: 'B', prb_pct: 33, throughput_mbps: 39, sinr_db: 5.0, slice: 'Best-Effort UE Service' },
          cpe: { cell: 'B', prb_pct: 39, throughput_mbps: 52, sinr_db: 4.2, slice: 'Fixed Wireless Access' },
          cell_a_pci: CS3_PCI_CLASH,
          cell_b_pci: CS3_PCI_CLASH,
          pci_clash: true,
          ru_b_restarting: false,
          ru_b_standby: false,
          cell_a_prb_total: 100,
          cell_a_prb_used: 76,
          cell_b_prb_total: 100,
          cell_b_prb_used: 72,
          contention: true,
          phase: 'steady',
        },
        policy: {
          mode: this.closedLoop ? 'closed-loop' : 'open-loop',
          decision: 'monitoring',
          intent: 'Detect and resolve PCI clash while preserving service continuity through controlled handovers.',
          ue1_min_prb_pct: 36,
          ue2_cap_prb_pct: 42,
        },
        note: `Cells start degraded with PCI clash (${CS3_PCI_CLASH}/${CS3_PCI_CLASH}) and low SINR.`,
      };
    }

    return {
      snapshot: {
        ue1: { cell: 'A', prb_pct: 52, throughput_mbps: 88, sinr_db: 17, slice: 'Critical Slice (Gold)' },
        ue2: { cell: 'B', prb_pct: 30, throughput_mbps: 56, sinr_db: 16, slice: 'Best-Effort Slice (Silver)' },
        cpe: { cell: 'B', prb_pct: 32, throughput_mbps: 72, sinr_db: 18, slice: 'Fixed Wireless Access' },
        cell_a_pci: 101,
        cell_b_pci: 203,
        pci_clash: false,
        ru_b_restarting: false,
        ru_b_standby: false,
        cell_a_prb_total: 100,
        cell_a_prb_used: 64,
        cell_b_prb_total: 100,
        cell_b_prb_used: 40,
        contention: false,
        phase: 'steady',
      },
      policy: {
        mode: this.closedLoop ? 'closed-loop' : 'open-loop',
        decision: 'monitoring',
        intent: POLICY_INTENT,
        ue1_min_prb_pct: 42,
        ue2_cap_prb_pct: 40,
      },
      note: 'Monitoring steady-state KPIs across DU/CU/RU. No active anomaly.',
    };
  }

  private buildCaseStudy4SteadyRuntime(): RuntimeState {
    return {
      snapshot: {
        ue1: { cell: 'A', prb_pct: 42, throughput_mbps: 85, sinr_db: 17, slice: 'Critical Slice (Gold)' },
        ue2: { cell: 'B', prb_pct: 12, throughput_mbps: 22, sinr_db: 16, slice: 'Best-Effort Slice (Silver)' },
        cpe: { cell: 'B', prb_pct: 14, throughput_mbps: 28, sinr_db: 17, slice: 'Fixed Wireless Access' },
        cell_a_pci: 101,
        cell_b_pci: 203,
        pci_clash: false,
        ru_b_restarting: false,
        ru_b_standby: false,
        cell_a_prb_total: 100,
        cell_a_prb_used: 44,
        cell_b_prb_total: 100,
        cell_b_prb_used: 18,
        contention: false,
        phase: 'steady',
      },
      policy: {
        mode: this.closedLoop ? 'closed-loop' : 'open-loop',
        decision: 'monitoring',
        intent: 'Identify safe energy-saving windows by monitoring Cell-B/C load against standby thresholds.',
        ue1_min_prb_pct: 36,
        ue2_cap_prb_pct: 40,
      },
      note: 'Cell-B/C lightly loaded. Monitoring for energy-saving opportunity.',
    };
  }

  private setRuntime(
    snapshotPatch: SnapshotPatch,
    policyPatch: Partial<PolicySnapshot>,
    note: string
  ) {
    this.runtime = {
      snapshot: {
        ...this.runtime.snapshot,
        ...snapshotPatch,
        ue1: {
          ...this.runtime.snapshot.ue1,
          ...(snapshotPatch.ue1 ?? {}),
        },
        ue2: {
          ...this.runtime.snapshot.ue2,
          ...(snapshotPatch.ue2 ?? {}),
        },
        cpe: {
          ...this.runtime.snapshot.cpe,
          ...(snapshotPatch.cpe ?? {}),
        },
      },
      policy: {
        ...this.runtime.policy,
        ...policyPatch,
        mode: this.closedLoop ? 'closed-loop' : 'open-loop',
      },
      note,
    };
  }

  private snapshotDetails(
    cell: 'A' | 'B',
    ue: string,
    recommendation?: string
  ): TopologyEvent['details'] {
    const contention = this.runtime.snapshot.contention;
    const kpi = contention
      ? {
          prb_drop: Math.max(10, 55 - this.runtime.snapshot.ue1.prb_pct),
          rsrp_delta: -Math.max(2, Math.round((this.runtime.snapshot.ue2.prb_pct - 30) / 6)),
        }
      : {
          prb_drop: Math.max(1, Math.round((68 - this.runtime.snapshot.ue1.prb_pct) / 8)),
          rsrp_delta: -1,
        };

    return {
      cell,
      ue,
      kpi,
      recommendation,
      snapshot: {
        ...this.runtime.snapshot,
        ue1: { ...this.runtime.snapshot.ue1 },
        ue2: { ...this.runtime.snapshot.ue2 },
        cpe: { ...this.runtime.snapshot.cpe },
      },
      policy: { ...this.runtime.policy },
      note: this.runtime.note,
    };
  }

  private scheduleKpiPulse() {
    if (!this.running) return;
    const delay = this.pace(1300, 2200);
    this.kpiTimer = setTimeout(() => {
      if (!this.running) return;

      if (this.phase === 'IDLE') {
        if (this.caseStudyId === 'CS2') {
          const baseA = 58 + Math.round((Math.random() - 0.5) * 5);
          const baseB = 61 + Math.round((Math.random() - 0.5) * 5);
          this.setRuntime(
            {
              ue1: {
                ...this.runtime.snapshot.ue1,
                cell: 'A',
                prb_pct: 54 + Math.round((Math.random() - 0.5) * 6),
                throughput_mbps: 90 + Math.round((Math.random() - 0.5) * 8),
                sinr_db: 17 + (Math.random() - 0.5) * 1.4,
              },
              ue2: {
                ...this.runtime.snapshot.ue2,
                cell: 'B',
                prb_pct: 25 + Math.round((Math.random() - 0.5) * 6),
                throughput_mbps: 46 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 16 + (Math.random() - 0.5) * 1.6,
              },
              cpe: {
                ...this.runtime.snapshot.cpe,
                cell: 'B',
                prb_pct: 34 + Math.round((Math.random() - 0.5) * 6),
                throughput_mbps: 74 + Math.round((Math.random() - 0.5) * 8),
                sinr_db: 18 + (Math.random() - 0.5) * 1.4,
              },
              cell_a_pci: 101,
              cell_b_pci: 203,
              pci_clash: false,
              ru_b_restarting: false,
              cell_a_prb_used: Math.max(50, Math.min(68, baseA)),
              cell_b_prb_used: Math.max(52, Math.min(72, baseB)),
              contention: false,
              phase: 'steady',
            },
            { decision: 'monitoring' },
            'UE1 remains monitored on Cell A while UE2 and CPE remain on Cell B.'
          );
        } else if (this.caseStudyId === 'CS3') {
          const baseA = 74 + Math.round((Math.random() - 0.5) * 6);
          const baseB = 70 + Math.round((Math.random() - 0.5) * 6);
          this.setRuntime(
            {
              ue1: {
                ...this.runtime.snapshot.ue1,
                prb_pct: 42 + Math.round((Math.random() - 0.5) * 5),
                throughput_mbps: 50 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 4.6 + (Math.random() - 0.5) * 0.9,
              },
              ue2: {
                ...this.runtime.snapshot.ue2,
                prb_pct: 34 + Math.round((Math.random() - 0.5) * 5),
                throughput_mbps: 41 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 5.1 + (Math.random() - 0.5) * 0.9,
              },
              cpe: {
                ...this.runtime.snapshot.cpe,
                prb_pct: 38 + Math.round((Math.random() - 0.5) * 5),
                throughput_mbps: 53 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 4.3 + (Math.random() - 0.5) * 0.9,
              },
              cell_a_pci: CS3_PCI_CLASH,
              cell_b_pci: CS3_PCI_CLASH,
              pci_clash: true,
              ru_b_restarting: false,
              cell_a_prb_used: Math.max(66, Math.min(84, baseA)),
              cell_b_prb_used: Math.max(62, Math.min(82, baseB)),
              contention: true,
              phase: 'steady',
            },
            { decision: 'monitoring' },
            `Persistent PCI clash detected (${CS3_PCI_CLASH}/${CS3_PCI_CLASH}) with low SINR across devices.`
          );
        } else {
          const baseA = 64 + Math.round((Math.random() - 0.5) * 4);
          const baseB = 40 + Math.round((Math.random() - 0.5) * 4);
          this.setRuntime(
            {
              ue1: {
                ...this.runtime.snapshot.ue1,
                prb_pct: 50 + Math.round((Math.random() - 0.5) * 6),
                throughput_mbps: 86 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 17 + (Math.random() - 0.5) * 1.2,
              },
              ue2: {
                ...this.runtime.snapshot.ue2,
                prb_pct: 30 + Math.round((Math.random() - 0.5) * 4),
                throughput_mbps: 56 + Math.round((Math.random() - 0.5) * 5),
                sinr_db: 16 + (Math.random() - 0.5) * 1.2,
              },
              cpe: {
                ...this.runtime.snapshot.cpe,
                prb_pct: 32 + Math.round((Math.random() - 0.5) * 4),
                throughput_mbps: 72 + Math.round((Math.random() - 0.5) * 6),
                sinr_db: 18 + (Math.random() - 0.5) * 1.2,
              },
              cell_a_pci: 101,
              cell_b_pci: 203,
              pci_clash: false,
              ru_b_restarting: false,
              cell_a_prb_used: Math.max(56, Math.min(72, baseA)),
              cell_b_prb_used: Math.max(34, Math.min(48, baseB)),
              contention: false,
              phase: 'steady',
            },
            { decision: 'monitoring' },
            'Monitoring steady-state KPIs across DU/CU/RU. No active anomaly.'
          );
        }
      }

      const monitoredCell = this.runtime.snapshot.ue1.cell;
      this.emitStep('KPI', 'IDLE', 'du-b', 'nonrt-ric', 'ok', this.snapshotDetails(monitoredCell, 'UE1'));
      this.scheduleKpiPulse();
    }, delay);
  }

  private runAnomalySequence(traceId: string, cell: 'A' | 'B', ue: string) {
    const recommendation = CS1_RECOMMENDATIONS[Math.floor(Math.random() * CS1_RECOMMENDATIONS.length)];
    this.phase = 'ANOMALY_ACTIVE';

    this.setRuntime(
      {
        phase: 'contention',
        contention: true,
        ue2: { cell: 'A', prb_pct: 66, throughput_mbps: 126, slice: this.runtime.snapshot.ue2.slice },
        ue1: { cell: 'A', prb_pct: 18, throughput_mbps: 34, slice: this.runtime.snapshot.ue1.slice },
        cell_a_prb_used: 92,
        cell_b_prb_used: 14,
      },
      { decision: 'pending-approval' },
      'Anomaly active: UE2 moved into Cell A and consumed PRBs, degrading UE1 throughput.'
    );

    let t = 0;

    this.schedule(t, () => {
      this.emitStep('ANOMALY', 'DETECT', 'nonrt-ric', 'vismon-ai', 'warn', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1800, 2400);
    this.schedule(t, () => {
      this.setRuntime(
        { phase: 'enrich' },
        { decision: 'pending-approval' },
        'Enrichment rApp is adding cell, slice, and PRB context to the anomaly.'
      );
      this.emitStep('ENRICH', 'ENRICH', 'nonrt-ric', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1600, 2300);
    this.schedule(t, () => {
      this.phase = 'RCA';
      this.setRuntime(
        { phase: 'rca' },
        { decision: 'pending-approval' },
        'VISMON AI is running topology-aware RCA over the enriched anomaly payload.'
      );
      this.emitStep('RCA_REQ', 'RCA', 'vismon-ai', 'vismon-ai', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1200, 1900);
    this.schedule(t, () => {
      this.emitStep('RCA_RESP', 'RCA', 'vismon-ai', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1300, 1900);
    this.schedule(t, () => {
      this.phase = 'RECOMMEND';
      this.setRuntime(
        { phase: 'recommend' },
        { decision: 'pending-approval' },
        'VISMON AI recommends policy action to protect UE1 and limit UE2 best-effort bursts.'
      );
      this.emitStep(
        'RECO',
        'RECOMMEND',
        'vismon-ai',
        'nonrt-ric',
        'ok',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(500, 900);
    this.schedule(t, () => {
      this.emitStep(
        'TICKET',
        'RECOMMEND',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    if (this.closedLoop) {
      t += this.pace(1700, 2400);
      this.schedule(t, () => {
        this.phase = 'ACTION';
        this.setRuntime(
          {
            phase: 'action',
            ue1: { cell: 'A', prb_pct: 40, throughput_mbps: 74, slice: this.runtime.snapshot.ue1.slice },
            ue2: { cell: 'A', prb_pct: 40, throughput_mbps: 80, slice: this.runtime.snapshot.ue2.slice },
            cell_a_prb_used: 80,
          },
          { decision: 'applied' },
          'Closed-loop action is being applied by Network Operations rApp.'
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'nonrt-ric',
          'du-b',
          'ok',
          this.snapshotDetails(cell, ue, recommendation),
          traceId
        );
      });

      t += this.pace(1900, 2800);
      const validationStatus: TopologyEvent['status'] = Math.random() > 0.2 ? 'ok' : 'warn';
      this.schedule(t, () => {
        this.phase = 'VALIDATE';

        if (validationStatus === 'ok') {
          this.setRuntime(
            {
              phase: 'validate',
              ue1: { cell: 'A', prb_pct: 48, throughput_mbps: 92, slice: this.runtime.snapshot.ue1.slice },
              ue2: { cell: 'A', prb_pct: 34, throughput_mbps: 66, slice: this.runtime.snapshot.ue2.slice },
              cell_a_prb_used: 74,
              contention: false,
            },
            { decision: 'validated' },
            'Validation confirms KPI recovery and stabilization on Cell A.'
          );
        } else {
          this.setRuntime(
            {
              phase: 'escalate',
              ue1: { cell: 'A', prb_pct: 26, throughput_mbps: 46, slice: this.runtime.snapshot.ue1.slice },
              ue2: { cell: 'A', prb_pct: 56, throughput_mbps: 104, slice: this.runtime.snapshot.ue2.slice },
              cell_a_prb_used: 90,
              contention: true,
            },
            { decision: 'escalated' },
            'Validation indicates residual contention. Escalating to NOC for manual intervention.'
          );
        }

        this.emitStep(
          'VALIDATION',
          'VALIDATE',
          'du-b',
          'nonrt-ric',
          validationStatus,
          this.snapshotDetails(cell, ue, recommendation),
          traceId
        );
      });

      if (validationStatus !== 'ok') {
        t += this.pace(1000, 1500);
        this.schedule(t, () => {
          this.phase = 'ESCALATED';
          this.emitStep(
            'TICKET',
            'ESCALATE',
            'nonrt-ric',
            'noc-prompt',
            'fail',
            this.snapshotDetails(cell, ue, recommendation),
            traceId
          );
        });

        t += this.pace(2500, 3400);
        this.schedule(t, () => this.returnToIdle(traceId));
      } else {
        t += this.pace(2600, 3600);
        this.schedule(t, () => {
          this.phase = 'RESOLVED';
          this.returnToIdle(traceId);
        });
      }
      return;
    }

    t += this.pace(1700, 2400);
    this.schedule(t, () => {
      this.phase = 'ESCALATED';
      this.setRuntime(
        { phase: 'escalate', contention: true },
        { decision: 'held' },
        'Open-loop mode: waiting for NOC engineer decision before policy action.'
      );
      this.emitStep(
        'TICKET',
        'ESCALATE',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(2600, 3600);
    this.schedule(t, () => this.returnToIdle(traceId));
  }

  private runCaseStudy2Sequence(traceId: string, cell: 'A' | 'B', ue: string) {
    const recommendation = CS2_RECOMMENDATIONS[Math.floor(Math.random() * CS2_RECOMMENDATIONS.length)];
    this.phase = 'ANOMALY_ACTIVE';

    this.setRuntime(
      {
        phase: 'contention',
        contention: true,
        ue1: { cell: 'A', prb_pct: 16, throughput_mbps: 28, slice: this.runtime.snapshot.ue1.slice },
        ue2: { cell: 'A', prb_pct: 39, throughput_mbps: 70, slice: this.runtime.snapshot.ue2.slice },
        cpe: { cell: 'A', prb_pct: 35, throughput_mbps: 79, slice: this.runtime.snapshot.cpe.slice },
        cell_a_prb_used: 94,
        cell_b_prb_used: 8,
      },
      { decision: 'pending-approval' },
      'Trigger received: UE2 and CPE moved into Cell A. UE1 throughput degrades due to PRB contention.'
    );

    let t = 0;

    this.schedule(t, () => {
      this.emitStep('ANOMALY', 'DETECT', 'nonrt-ric', 'vismon-ai', 'warn', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1600, 2200);
    this.schedule(t, () => {
      this.setRuntime(
        { phase: 'enrich' },
        { decision: 'pending-approval' },
        'Assurance enrichment collected UE1/UE2/CPE context and cell capacity data for VISMON AI.'
      );
      this.emitStep('ENRICH', 'ENRICH', 'nonrt-ric', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1400, 2000);
    this.schedule(t, () => {
      this.phase = 'RCA';
      this.setRuntime(
        { phase: 'rca' },
        { decision: 'pending-approval' },
        'VISMON AI is analyzing contention inputs to identify the best recovery path.'
      );
      this.emitStep('RCA_REQ', 'RCA', 'vismon-ai', 'vismon-ai', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1200, 1800);
    this.schedule(t, () => {
      this.emitStep('RCA_RESP', 'RCA', 'vismon-ai', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1300, 1900);
    this.schedule(t, () => {
      this.phase = 'RECOMMEND';
      this.setRuntime(
        { phase: 'recommend' },
        { decision: 'pending-approval' },
        'VISMON AI recommends handing over UE1 to adjacent Cell B to restore service quality.'
      );
      this.emitStep(
        'RECO',
        'RECOMMEND',
        'vismon-ai',
        'nonrt-ric',
        'ok',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(600, 900);
    this.schedule(t, () => {
      this.emitStep(
        'TICKET',
        'RECOMMEND',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    if (this.closedLoop) {
      t += this.pace(1500, 2200);
      this.schedule(t, () => {
        this.phase = 'ACTION';
        this.setRuntime(
          {
            phase: 'action',
            ue1: { cell: 'B', prb_pct: 31, throughput_mbps: 70, slice: this.runtime.snapshot.ue1.slice },
            ue2: { cell: 'A', prb_pct: 37, throughput_mbps: 67, slice: this.runtime.snapshot.ue2.slice },
            cpe: { cell: 'A', prb_pct: 33, throughput_mbps: 76, slice: this.runtime.snapshot.cpe.slice },
            cell_a_prb_used: 82,
            cell_b_prb_used: 31,
            contention: false,
          },
          { decision: 'applied' },
          'Network Operations rApp executed UE1 handover to Cell B; UE2 and CPE remain on Cell A.'
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'nonrt-ric',
          'du-b',
          'ok',
          this.snapshotDetails('B', ue, recommendation),
          traceId
        );
      });

      t += this.pace(1700, 2400);
      this.schedule(t, () => {
        this.phase = 'VALIDATE';
        this.setRuntime(
          {
            phase: 'validate',
            ue1: { cell: 'B', prb_pct: 36, throughput_mbps: 86, slice: this.runtime.snapshot.ue1.slice },
            ue2: { cell: 'A', prb_pct: 34, throughput_mbps: 63, slice: this.runtime.snapshot.ue2.slice },
            cpe: { cell: 'A', prb_pct: 32, throughput_mbps: 74, slice: this.runtime.snapshot.cpe.slice },
            cell_a_prb_used: 78,
            cell_b_prb_used: 40,
            contention: false,
          },
          { decision: 'validated' },
          'Validation confirms UE1 service recovery on Cell B after VISMON-guided handover.'
        );
        this.emitStep(
          'VALIDATION',
          'VALIDATE',
          'du-b',
          'nonrt-ric',
          'ok',
          this.snapshotDetails('B', ue, recommendation),
          traceId
        );
      });

      t += this.pace(2200, 3000);
      this.schedule(t, () => {
        this.phase = 'RESOLVED';
        this.returnToIdle(traceId);
      });
      return;
    }

    t += this.pace(1800, 2400);
    this.schedule(t, () => {
      this.phase = 'ESCALATED';
      this.setRuntime(
        {
          phase: 'escalate',
          contention: true,
          ue1: { cell: 'A', prb_pct: 18, throughput_mbps: 30, slice: this.runtime.snapshot.ue1.slice },
          ue2: { cell: 'A', prb_pct: 38, throughput_mbps: 69, slice: this.runtime.snapshot.ue2.slice },
          cpe: { cell: 'A', prb_pct: 34, throughput_mbps: 78, slice: this.runtime.snapshot.cpe.slice },
          cell_a_prb_used: 90,
          cell_b_prb_used: 10,
        },
        { decision: 'held' },
        'Open-loop mode: handover recommendation awaits NOC approval.'
      );
      this.emitStep(
        'TICKET',
        'ESCALATE',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(2400, 3200);
    this.schedule(t, () => this.returnToIdle(traceId));
  }

  private runCaseStudy3Sequence(traceId: string, cell: 'A' | 'B', ue: string) {
    const recommendation = CS3_RECOMMENDATIONS[Math.floor(Math.random() * CS3_RECOMMENDATIONS.length)];
    this.phase = 'ANOMALY_ACTIVE';

    this.setRuntime(
      {
        phase: 'contention',
        contention: true,
        pci_clash: true,
        ru_b_restarting: false,
        cell_a_pci: CS3_PCI_CLASH,
        cell_b_pci: CS3_PCI_CLASH,
        ue1: { cell: 'A', prb_pct: 46, throughput_mbps: 46, sinr_db: 4.1 },
        ue2: { cell: 'B', prb_pct: 35, throughput_mbps: 37, sinr_db: 4.7 },
        cpe: { cell: 'B', prb_pct: 40, throughput_mbps: 49, sinr_db: 3.8 },
        cell_a_prb_used: 79,
        cell_b_prb_used: 76,
      },
      { decision: 'pending-approval' },
      `PCI clash active: Cell A and Cell B both use PCI ${CS3_PCI_CLASH}; SINR is degraded for UE1, UE2, and CPE.`
    );

    let t = 0;

    this.schedule(t, () => {
      this.emitStep('ANOMALY', 'DETECT', 'nonrt-ric', 'vismon-ai', 'warn', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1500, 2100);
    this.schedule(t, () => {
      this.setRuntime(
        { phase: 'enrich' },
        { decision: 'pending-approval' },
        'rApp enrichment sent PCI map, SINR trends, PRB load, and neighbor context to VISMON AI.'
      );
      this.emitStep('ENRICH', 'ENRICH', 'nonrt-ric', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1300, 1900);
    this.schedule(t, () => {
      this.phase = 'RCA';
      this.setRuntime(
        { phase: 'rca' },
        { decision: 'pending-approval' },
        'VISMON AI concluded PCI clash and calculated a new non-conflicting PCI for Cell B.'
      );
      this.emitStep('RCA_REQ', 'RCA', 'vismon-ai', 'vismon-ai', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1100, 1700);
    this.schedule(t, () => {
      this.emitStep('RCA_RESP', 'RCA', 'vismon-ai', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1200, 1800);
    this.schedule(t, () => {
      this.phase = 'RECOMMEND';
      this.setRuntime(
        { phase: 'recommend' },
        { decision: 'pending-approval' },
        `Recommendation: move users out of Cell B, lock RU-B, change PCI to ${CS3_PCI_CELL_B_FIXED}, reboot, then reattach.`
      );
      this.emitStep(
        'RECO',
        'RECOMMEND',
        'vismon-ai',
        'nonrt-ric',
        'ok',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(500, 900);
    this.schedule(t, () => {
      this.emitStep(
        'TICKET',
        'RECOMMEND',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    if (this.closedLoop) {
      t += this.pace(1300, 1900);
      this.schedule(t, () => {
        this.phase = 'ACTION';
        this.setRuntime(
          {
            phase: 'action',
            ue1: { cell: 'A', prb_pct: 41, throughput_mbps: 58, sinr_db: 8.5 },
            ue2: { cell: 'A', prb_pct: 30, throughput_mbps: 54, sinr_db: 8.2 },
            cpe: { cell: 'A', prb_pct: 29, throughput_mbps: 60, sinr_db: 7.9 },
            cell_a_prb_used: 86,
            cell_b_prb_used: 8,
          },
          { decision: 'applied' },
          'Operational rApp soft-handed over users out of Cell B and locked RU-B for PCI reconfiguration.'
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'nonrt-ric',
          'du-b',
          'ok',
          this.snapshotDetails('A', ue, recommendation),
          traceId
        );
      });

      t += this.pace(1300, 1800);
      this.schedule(t, () => {
        this.setRuntime(
          {
            phase: 'action',
            cell_b_pci: CS3_PCI_CELL_B_FIXED,
            pci_clash: true,
            ru_b_restarting: true,
            cell_b_prb_used: 0,
          },
          { decision: 'applied' },
          `RU-B is restarting with new PCI ${CS3_PCI_CELL_B_FIXED}. Users remain on Cell A during reboot.`
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'du-b',
          'ru-b',
          'warn',
          this.snapshotDetails('B', ue, recommendation),
          traceId
        );
      });

      t += CS3_RESTART_DURATION_MS;
      this.schedule(t, () => {
        this.setRuntime(
          {
            phase: 'action',
            pci_clash: false,
            ru_b_restarting: false,
            cell_b_prb_used: 18,
          },
          { decision: 'applied' },
          `RU-B reboot completed with PCI ${CS3_PCI_CELL_B_FIXED}. PCI clash cleared.`
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'ru-b',
          'nonrt-ric',
          'ok',
          this.snapshotDetails('B', ue, recommendation),
          traceId
        );
      });

      t += this.pace(1300, 1900);
      this.schedule(t, () => {
        this.phase = 'VALIDATE';
        this.setRuntime(
          {
            phase: 'validate',
            contention: false,
            ru_b_restarting: false,
            ue1: { cell: 'A', prb_pct: 32, throughput_mbps: 88, sinr_db: 17.2 },
            ue2: { cell: 'B', prb_pct: 28, throughput_mbps: 66, sinr_db: 16.1 },
            cpe: { cell: 'B', prb_pct: 31, throughput_mbps: 80, sinr_db: 17.6 },
            cell_a_prb_used: 64,
            cell_b_prb_used: 59,
          },
          { decision: 'validated' },
          'Validation confirms SINR recovery and throughput normalization after PCI update.'
        );
        this.emitStep(
          'VALIDATION',
          'VALIDATE',
          'du-b',
          'nonrt-ric',
          'ok',
          this.snapshotDetails('B', ue, recommendation),
          traceId
        );
      });

      t += this.pace(2200, 3000);
      this.schedule(t, () => {
        this.phase = 'RESOLVED';
        this.returnToIdle(traceId, this.buildCaseStudy3ResolvedRuntime());
      });
      return;
    }

    t += this.pace(1700, 2400);
    this.schedule(t, () => {
      this.phase = 'ESCALATED';
      this.setRuntime(
        { phase: 'escalate' },
        { decision: 'held' },
        'Open-loop mode: waiting for engineer approval before PCI change and RU reboot.'
      );
      this.emitStep(
        'TICKET',
        'ESCALATE',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(2400, 3200);
    this.schedule(t, () => this.returnToIdle(traceId));
  }

  private runCaseStudy4Sequence(traceId: string, cell: 'A' | 'B', ue: string) {
    const recommendation =
      'Cell-B/C PRB load is below threshold. Soft-handover UE2 and CPE to Cell-A, then place ORU-2 into standby.';
    this.phase = 'ANOMALY_ACTIVE';

    this.setRuntime(
      {
        phase: 'contention',
        contention: false,
        ue2: { cell: 'B', prb_pct: 10, throughput_mbps: 18, sinr_db: 16 },
        cpe: { cell: 'B', prb_pct: 12, throughput_mbps: 22, sinr_db: 17 },
        cell_b_prb_used: 14,
        ru_b_standby: false,
      },
      { decision: 'pending-approval' },
      'Energy-saving trigger: Cell-B/C traffic fell below threshold. Evaluating soft-handover conditions.'
    );

    let t = 0;

    this.schedule(t, () => {
      this.emitStep('ANOMALY', 'DETECT', 'nonrt-ric', 'vismon-ai', 'warn', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1600, 2200);
    this.schedule(t, () => {
      this.setRuntime(
        { phase: 'enrich' },
        { decision: 'pending-approval' },
        'Collecting UE mobility state, QoE metrics, Cell-A headroom, and coverage overlap for VISMON Energy AI.'
      );
      this.emitStep('ENRICH', 'ENRICH', 'nonrt-ric', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1300, 1900);
    this.schedule(t, () => {
      this.phase = 'RCA';
      this.setRuntime(
        { phase: 'rca' },
        { decision: 'pending-approval' },
        'VISMON Energy AI evaluating PRB headroom on Cell-A, coverage continuity, and QoE impact.'
      );
      this.emitStep('RCA_REQ', 'RCA', 'vismon-ai', 'vismon-ai', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1100, 1700);
    this.schedule(t, () => {
      this.emitStep('RCA_RESP', 'RCA', 'vismon-ai', 'nonrt-ric', 'ok', this.snapshotDetails(cell, ue), traceId);
    });

    t += this.pace(1200, 1800);
    this.schedule(t, () => {
      this.phase = 'RECOMMEND';
      this.setRuntime(
        { phase: 'recommend' },
        { decision: 'pending-approval' },
        'Soft-handover to Cell-A confirmed safe. Recommendation: handover UE2 + CPE, place ORU-2 into standby.'
      );
      this.emitStep(
        'RECO',
        'RECOMMEND',
        'vismon-ai',
        'nonrt-ric',
        'ok',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(500, 900);
    this.schedule(t, () => {
      this.emitStep(
        'TICKET',
        'RECOMMEND',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    if (this.closedLoop) {
      t += this.pace(1300, 1900);
      this.schedule(t, () => {
        this.phase = 'ACTION';
        this.setRuntime(
          {
            phase: 'action',
            ue2: { cell: 'A', prb_pct: 14, throughput_mbps: 24, sinr_db: 16, slice: this.runtime.snapshot.ue2.slice },
            cpe: { cell: 'A', prb_pct: 16, throughput_mbps: 30, sinr_db: 17, slice: this.runtime.snapshot.cpe.slice },
            cell_a_prb_used: 66,
            cell_b_prb_used: 0,
            ru_b_standby: true,
          },
          { decision: 'applied' },
          'Soft-handover of UE2 and CPE to Cell-A complete. ORU-2 entering standby. Sliding-window observer activated.'
        );
        this.emitStep(
          'ACTION',
          'ACT',
          'nonrt-ric',
          'du-b',
          'ok',
          this.snapshotDetails('A', ue, recommendation),
          traceId
        );
      });

      t += this.pace(1700, 2400);
      this.schedule(t, () => {
        this.phase = 'VALIDATE';
        this.setRuntime(
          {
            phase: 'validate',
            ue1: { cell: 'A', prb_pct: 44, throughput_mbps: 88, sinr_db: 17, slice: this.runtime.snapshot.ue1.slice },
            ue2: { cell: 'A', prb_pct: 16, throughput_mbps: 26, sinr_db: 16, slice: this.runtime.snapshot.ue2.slice },
            cpe: { cell: 'A', prb_pct: 18, throughput_mbps: 32, sinr_db: 17, slice: this.runtime.snapshot.cpe.slice },
            cell_a_prb_used: 72,
            cell_b_prb_used: 0,
            ru_b_standby: true,
          },
          { decision: 'validated' },
          'Cell-B/C in standby. Observer tracking Cell-A load, QoE, and coverage for reactivation threshold.'
        );
        this.emitStep(
          'VALIDATION',
          'VALIDATE',
          'du-b',
          'nonrt-ric',
          'ok',
          this.snapshotDetails('A', ue, recommendation),
          traceId
        );
      });

      t += this.pace(2500, 3500);
      this.schedule(t, () => {
        this.phase = 'RESOLVED';
        this.returnToIdle(traceId, this.buildCaseStudy4SteadyRuntime());
      });
      return;
    }

    // Open-loop
    t += this.pace(1700, 2400);
    this.schedule(t, () => {
      this.phase = 'ESCALATED';
      this.setRuntime(
        { phase: 'escalate' },
        { decision: 'held' },
        'Open-loop mode: energy action awaits engineer approval before handover and standby execution.'
      );
      this.emitStep(
        'TICKET',
        'ESCALATE',
        'nonrt-ric',
        'noc-prompt',
        'warn',
        this.snapshotDetails(cell, ue, recommendation),
        traceId
      );
    });

    t += this.pace(2400, 3200);
    this.schedule(t, () => this.returnToIdle(traceId, this.buildCaseStudy4SteadyRuntime()));
  }

  private buildCaseStudy3ResolvedRuntime(): RuntimeState {
    return {
      snapshot: {
        ue1: { cell: 'A', prb_pct: 31, throughput_mbps: 90, sinr_db: 17.4, slice: 'Critical UE Service' },
        ue2: { cell: 'B', prb_pct: 29, throughput_mbps: 67, sinr_db: 16.3, slice: 'Best-Effort UE Service' },
        cpe: { cell: 'B', prb_pct: 33, throughput_mbps: 82, sinr_db: 17.8, slice: 'Fixed Wireless Access' },
        cell_a_pci: CS3_PCI_CLASH,
        cell_b_pci: CS3_PCI_CELL_B_FIXED,
        pci_clash: false,
        ru_b_restarting: false,
        ru_b_standby: false,
        cell_a_prb_total: 100,
        cell_a_prb_used: 62,
        cell_b_prb_total: 100,
        cell_b_prb_used: 60,
        contention: false,
        phase: 'steady',
      },
      policy: {
        mode: this.closedLoop ? 'closed-loop' : 'open-loop',
        decision: 'monitoring',
        intent: 'Maintain PCI separation and monitor SINR to prevent future clashes.',
        ue1_min_prb_pct: 36,
        ue2_cap_prb_pct: 42,
      },
      note: `PCI clash resolved. Cell A PCI ${CS3_PCI_CLASH}, Cell B PCI ${CS3_PCI_CELL_B_FIXED}. SINR recovered.`,
    };
  }

  private returnToIdle(traceId: string, nextRuntime?: RuntimeState) {
    if (this.activeTraceId !== traceId) return;
    this.phase = 'IDLE';
    this.activeTraceId = null;
    this.runtime = nextRuntime ?? this.buildSteadyRuntime();
  }

  private schedule(delayMs: number, fn: () => void) {
    const timer = setTimeout(() => {
      if (this.running) fn();
    }, delayMs);
    this.timers.push(timer);
  }

  private emitStep(
    msgType: MsgType,
    step: SimulationStep,
    from: string,
    to: string,
    status: TopologyEvent['status'],
    details: TopologyEvent['details'],
    traceId: string = nextTraceId(this.caseStudyId)
  ) {
    const now = Date.now();
    const event: TopologyEvent = {
      ts: now,
      trace_id: traceId,
      msg_type: msgType,
      step,
      from,
      to,
      status,
      details,
    };
    this.onEvent(event);

    const token: TopologyToken = {
      id: `${traceId}-${msgType}-${now}`,
      trace_id: traceId,
      msg_type: msgType,
      path_id: MSG_TYPE_PATH[msgType],
      progress: 0,
      startTime: now,
      duration: this.transit(msgType),
      status,
    };
    this.onToken(token);
  }

  private pace(minMs: number, maxMs: number) {
    return Math.round((jitterBetween(minMs, maxMs) * EVENT_TIMING_MULTIPLIER) / Math.max(this.speed, MIN_SPEED));
  }

  private transit(msgType: MsgType) {
    return Math.round(
      ((TOKEN_DURATION_MS[msgType] ?? 1000) * TOKEN_TIMING_MULTIPLIER) / Math.max(this.speed, MIN_SPEED)
    );
  }
}
