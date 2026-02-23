import type {
  TopologyEvent,
  TopologyToken,
  MsgType,
  SimulationStep,
  TopologySnapshot,
  PolicySnapshot,
} from '../types';
import { MSG_TYPE_PATH } from '../topology/paths';

let traceCounter = 1;

function nextTraceId(): string {
  const id = `CS1-${String(traceCounter).padStart(5, '0')}`;
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

const RECOMMENDATIONS = [
  'Throttle UE2 best-effort slice to max 38% PRB on Cell A and protect UE1 guaranteed slice at >=45% PRB.',
  'Apply Cell A policy profile: UE1 minimum guaranteed PRB 42%, UE2 dynamic cap 40% during congestion.',
  'Prioritize UE1 service class scheduler weights and cap UE2 burst windows for contention relief.',
  'Activate interference-aware scheduling guardrails on Cell A and enforce UE2 PRB burst control.',
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
const MIN_SPEED = 0.5;

const POLICY_INTENT =
  'Protect UE1 guaranteed service while limiting UE2 best-effort PRB bursts when both UEs contend on Cell A.';

interface RuntimeState {
  snapshot: TopologySnapshot;
  policy: PolicySnapshot;
  note: string;
}

interface SimulatorOpts {
  onEvent: (e: TopologyEvent) => void;
  onToken: (t: TopologyToken) => void;
}

export class CaseStudy1Simulator {
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
    const traceId = nextTraceId();
    this.activeTraceId = traceId;
    this.runAnomalySequence(traceId, 'A', 'UE1');
  }

  private buildSteadyRuntime(): RuntimeState {
    return {
      snapshot: {
        ue1: { cell: 'A', prb_pct: 52, throughput_mbps: 88, slice: 'Critical Slice (Gold)' },
        ue2: { cell: 'B', prb_pct: 30, throughput_mbps: 56, slice: 'Best-Effort Slice (Silver)' },
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

  private setRuntime(
    snapshotPatch: Partial<TopologySnapshot>,
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
        const baseA = 64 + Math.round((Math.random() - 0.5) * 4);
        const baseB = 40 + Math.round((Math.random() - 0.5) * 4);
        this.setRuntime(
          {
            ue1: {
              ...this.runtime.snapshot.ue1,
              prb_pct: 50 + Math.round((Math.random() - 0.5) * 6),
              throughput_mbps: 86 + Math.round((Math.random() - 0.5) * 6),
            },
            ue2: {
              ...this.runtime.snapshot.ue2,
              prb_pct: 30 + Math.round((Math.random() - 0.5) * 4),
              throughput_mbps: 56 + Math.round((Math.random() - 0.5) * 5),
            },
            cell_a_prb_used: Math.max(56, Math.min(72, baseA)),
            cell_b_prb_used: Math.max(34, Math.min(48, baseB)),
            contention: false,
            phase: 'steady',
          },
          { decision: 'monitoring' },
          'Monitoring steady-state KPIs across DU/CU/RU. No active anomaly.'
        );
      }

      this.emitStep('KPI', 'IDLE', 'du-b', 'nonrt-ric', 'ok', this.snapshotDetails('A', 'UE1'));
      this.scheduleKpiPulse();
    }, delay);
  }

  private runAnomalySequence(traceId: string, cell: 'A' | 'B', ue: string) {
    const recommendation = RECOMMENDATIONS[Math.floor(Math.random() * RECOMMENDATIONS.length)];
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

  private returnToIdle(traceId: string) {
    if (this.activeTraceId !== traceId) return;
    this.phase = 'IDLE';
    this.activeTraceId = null;
    this.runtime = this.buildSteadyRuntime();
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
    traceId: string = nextTraceId()
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
