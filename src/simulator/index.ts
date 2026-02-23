import type { WorkflowEvent, WorkflowDef, WorkflowId, EventStatus } from '../types';

let _traceCounter = 1;

function newTraceId(workflowId: WorkflowId): string {
  return `${workflowId.slice(0, 2).toUpperCase()}-${String(_traceCounter++).padStart(5, '0')}`;
}

function jitter(base: number): number {
  return Math.round(base * (0.7 + Math.random() * 0.6));
}

function pickStatus(failRate: number): EventStatus {
  const r = Math.random();
  if (r < failRate) return 'fail';
  if (r < failRate * 3) return 'warn';
  return 'ok';
}

export class WorkflowSimulator {
  private workflow: WorkflowDef;
  private speed: number;
  private onEvent: (e: WorkflowEvent) => void;
  private running = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private activeTraces: Map<string, number> = new Map(); // trace_id -> step index

  constructor(
    workflow: WorkflowDef,
    speed: number,
    onEvent: (e: WorkflowEvent) => void
  ) {
    this.workflow = workflow;
    this.speed = speed;
    this.onEvent = onEvent;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  start() {
    this.running = true;
    this.scheduleNextTrace();
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  reset() {
    this.stop();
    this.activeTraces.clear();
    _traceCounter = 1;
  }

  private scheduleNextTrace() {
    if (!this.running) return;
    // Spawn a new trace every 1.5–3.5s (adjusted by speed)
    const delay = jitter(2500) / this.speed;
    const t = setTimeout(() => {
      this.spawnTrace();
      this.scheduleNextTrace();
    }, delay);
    this.timers.push(t);
  }

  private spawnTrace() {
    if (!this.running) return;
    const trace_id = newTraceId(this.workflow.id);
    this.runStep(trace_id, 0, Date.now());
  }

  private runStep(trace_id: string, stepIndex: number, prevTs: number) {
    if (!this.running) return;
    const seq = this.workflow.eventSequence;
    if (stepIndex >= seq.length) return;

    const step = seq[stepIndex];
    const delay = jitter(step.baseLatency) / this.speed;

    const t = setTimeout(() => {
      if (!this.running) return;
      const status = pickStatus(step.failRate);
      const event: WorkflowEvent = {
        ts: Date.now(),
        workflow_id: this.workflow.id,
        trace_id,
        from_node: step.from,
        to_node: step.to,
        status,
        latency_ms: jitter(step.baseLatency),
        payload_type: step.payload_type,
      };
      this.onEvent(event);

      // On failure, sometimes branch to NOC or stop the trace
      if (status === 'fail' && Math.random() > 0.5) return;

      // Continue next step (some steps fan out — handle by randomness)
      const nextStep = stepIndex + 1;
      if (nextStep < seq.length) {
        this.runStep(trace_id, nextStep, event.ts);
      }
    }, delay);

    this.timers.push(t);
  }
}

// SSE live mode consumer
export class SSEConsumer {
  private source: EventSource | null = null;
  private onEvent: (e: WorkflowEvent) => void;

  constructor(onEvent: (e: WorkflowEvent) => void) {
    this.onEvent = onEvent;
  }

  start() {
    this.source = new EventSource('/events');
    this.source.onmessage = (msg) => {
      try {
        const event: WorkflowEvent = JSON.parse(msg.data);
        this.onEvent(event);
      } catch (_) {
        // ignore malformed
      }
    };
    this.source.onerror = () => {
      console.warn('SSE connection error');
    };
  }

  stop() {
    this.source?.close();
    this.source = null;
  }
}
