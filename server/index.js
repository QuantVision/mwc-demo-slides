/**
 * Cyient rApp Live Workflows — Optional SSE Server
 * Streams demo events to the UI in LIVE mode.
 * Usage: node server/index.js
 * Then toggle "Live (SSE)" in the UI.
 */

import http from 'http';

const PORT = 3001;
let traceCounter = 1;

const WORKFLOWS = {
  'anomaly-rca': {
    sequence: [
      { from: 'kpi-ingestion', to: 'rapp-sensor', payload_type: 'RAN_KPI_BATCH', baseLatency: 120, failRate: 0.02 },
      { from: 'rapp-sensor', to: 'decision-anomaly', payload_type: 'ANOMALY_SCORE', baseLatency: 80, failRate: 0.05 },
      { from: 'decision-anomaly', to: 'enrichment', payload_type: 'ANOMALY_DETECTED', baseLatency: 40, failRate: 0.0 },
      { from: 'enrichment', to: 'vismon-ai', payload_type: 'ENRICHED_CONTEXT', baseLatency: 200, failRate: 0.03 },
      { from: 'vismon-ai', to: 'rapp-decision', payload_type: 'RCA_RECOMMENDATION', baseLatency: 350, failRate: 0.04 },
      { from: 'rapp-decision', to: 'noc-alert', payload_type: 'ALARM_EVENT', baseLatency: 60, failRate: 0.01 },
      { from: 'rapp-decision', to: 'netops-rapp', payload_type: 'EXECUTE_COMMAND', baseLatency: 90, failRate: 0.05 },
      { from: 'netops-rapp', to: 'validation', payload_type: 'ACTION_RESULT', baseLatency: 150, failRate: 0.03 },
    ],
  },
  'network-assurance': {
    sequence: [
      { from: 'ue-tracker', to: 'rapp-assurance', payload_type: 'UE_KPI_STREAM', baseLatency: 100, failRate: 0.02 },
      { from: 'rapp-assurance', to: 'decision-tput', payload_type: 'QOS_SCORE', baseLatency: 90, failRate: 0.04 },
      { from: 'decision-tput', to: 'metric-collect', payload_type: 'DEGRADATION_EVENT', baseLatency: 50, failRate: 0.0 },
      { from: 'metric-collect', to: 'vismon-ai', payload_type: 'ENRICHED_UE_CONTEXT', baseLatency: 180, failRate: 0.03 },
      { from: 'vismon-ai', to: 'policy-eval', payload_type: 'RCA_RESULT', baseLatency: 320, failRate: 0.04 },
      { from: 'policy-eval', to: 'netops-rapp', payload_type: 'ACTION_COMMAND', baseLatency: 70, failRate: 0.05 },
    ],
  },
  'pci-clash': {
    sequence: [
      { from: 'config-sensor', to: 'rapp-pci', payload_type: 'NEIGHBOR_TOPOLOGY', baseLatency: 110, failRate: 0.02 },
      { from: 'rapp-pci', to: 'decision-pci', payload_type: 'PCI_SCAN', baseLatency: 80, failRate: 0.04 },
      { from: 'decision-pci', to: 'vismon-ai', payload_type: 'CLASH_EVENT', baseLatency: 50, failRate: 0.0 },
      { from: 'vismon-ai', to: 'pci-calc', payload_type: 'NETWORK_KNOWLEDGE', baseLatency: 300, failRate: 0.03 },
      { from: 'pci-calc', to: 'netops-rapp', payload_type: 'OPTIMAL_PCI', baseLatency: 120, failRate: 0.02 },
      { from: 'netops-rapp', to: 'soft-handover', payload_type: 'HANDOVER_CMD', baseLatency: 200, failRate: 0.05 },
    ],
  },
  'intelligent-energy': {
    sequence: [
      { from: 'utilization-sensor', to: 'rapp-energy', payload_type: 'UTILIZATION_METRICS', baseLatency: 130, failRate: 0.02 },
      { from: 'rapp-energy', to: 'decision-energy', payload_type: 'ENERGY_SCORE', baseLatency: 90, failRate: 0.03 },
      { from: 'decision-energy', to: 'candidate-eval', payload_type: 'SAVING_TRIGGER', baseLatency: 50, failRate: 0.0 },
      { from: 'candidate-eval', to: 'netops-rapp', payload_type: 'CANDIDATE_CELLS', baseLatency: 110, failRate: 0.02 },
      { from: 'netops-rapp', to: 'handover-users', payload_type: 'HANDOVER_CMD', baseLatency: 220, failRate: 0.05 },
      { from: 'handover-users', to: 'lock-ru', payload_type: 'LOCK_CMD', baseLatency: 180, failRate: 0.03 },
      { from: 'lock-ru', to: 'vismon-energy', payload_type: 'POWER_TELEMETRY', baseLatency: 250, failRate: 0.02 },
    ],
  },
};

const WORKFLOW_IDS = Object.keys(WORKFLOWS);

function jitter(base) {
  return Math.round(base * (0.7 + Math.random() * 0.6));
}

function pickStatus(failRate) {
  const r = Math.random();
  if (r < failRate) return 'fail';
  if (r < failRate * 3) return 'warn';
  return 'ok';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function* generateEvents() {
  while (true) {
    const workflow_id = WORKFLOW_IDS[Math.floor(Math.random() * WORKFLOW_IDS.length)];
    const wf = WORKFLOWS[workflow_id];
    const trace_id = `${workflow_id.slice(0, 2).toUpperCase()}-${String(traceCounter++).padStart(5, '0')}`;

    for (const step of wf.sequence) {
      await sleep(jitter(step.baseLatency));
      const event = {
        ts: Date.now(),
        workflow_id,
        trace_id,
        from_node: step.from,
        to_node: step.to,
        status: pickStatus(step.failRate),
        latency_ms: jitter(step.baseLatency),
        payload_type: step.payload_type,
      };
      yield event;
      if (event.status === 'fail' && Math.random() > 0.5) break;
    }
    await sleep(jitter(1500));
  }
}

const clients = new Set();

async function streamToClients() {
  for await (const event of generateEvents()) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) {
      try {
        res.write(data);
      } catch (_) {
        clients.delete(res);
      }
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Cyient SSE Server] Listening on http://localhost:${PORT}/events`);
  console.log('[Cyient SSE Server] Toggle "Live (SSE)" mode in the UI to connect.');
});

streamToClients();
