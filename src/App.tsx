import React, { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import LayoutEngine from './components/LayoutEngine';
import HeaderBar from './components/HeaderBar';
import NarrativePanel from './components/NarrativePanel';
import TopologyPanelStatic from './components/TopologyPanelStatic';
import MetricsPane from './components/MetricsPane';
import WorkflowPane from './components/WorkflowPane';
import EventsPane from './components/EventsPane';
import TabsRow from './components/TabsRow';
import PartnersFooter from './components/PartnersFooter';
import { useSimulator } from './simulator/useSimulator';
import { useRadioResources } from './hooks/useRadioResources';
import {
  CASE_STUDIES,
  narrativeForStep,
  type CaseStudyId,
} from './caseStudies/config';
import type {
  SimulationStep,
  TopologyEvent,
  TopologyState,
  TopologySnapshot,
} from './types';

const MAX_EVENTS = 50;
const STEP_SYSTEMS: Record<SimulationStep, string[]> = {
  IDLE: [],
  DETECT: ['du-b', 'nonrt-ric'],
  ENRICH: ['nonrt-ric'],
  RCA: ['vismon-ai', 'nonrt-ric'],
  RECOMMEND: ['vismon-ai', 'nonrt-ric', 'noc-prompt'],
  ACT: ['nonrt-ric', 'cu', 'du-b'],
  VALIDATE: ['du-b', 'nonrt-ric'],
  ESCALATE: ['noc-prompt', 'vismon-ai'],
};

const DEFAULT_SNAPSHOT: TopologySnapshot = {
  ue1: { cell: 'A', prb_pct: 52, throughput_mbps: 88, sinr_db: 17, slice: 'Critical Slice (Gold)' },
  ue2: { cell: 'B', prb_pct: 28, throughput_mbps: 54, sinr_db: 16, slice: 'Best-Effort Slice (Silver)' },
  cpe: { cell: 'B', prb_pct: 32, throughput_mbps: 72, sinr_db: 18, slice: 'Fixed Wireless Access' },
  cell_a_pci: 101,
  cell_b_pci: 203,
  pci_clash: false,
  ru_b_restarting: false,
  cell_a_prb_total: 100,
  cell_a_prb_used: 64,
  cell_b_prb_total: 100,
  cell_b_prb_used: 38,
  contention: false,
  phase: 'steady',
};

function initialState(): TopologyState {
  return {
    playing: true,
    speed: 0.25,
    closedLoop: true,
    tokens: [],
    events: [],
    highlightedNodes: {},
    seenKeys: new Set(),
  };
}

type Action =
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'TOGGLE_CLOSED_LOOP' }
  | { type: 'RESET' }
  | { type: 'ADD_EVENT'; payload: TopologyEvent }
  | { type: 'HIGHLIGHT_NODE'; payload: { nodeId: string; ts: number } }
  | { type: 'SWEEP_HIGHLIGHTS'; payload: number };

function reducer(state: TopologyState, action: Action): TopologyState {
  switch (action.type) {
    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };
    case 'SET_SPEED':
      return { ...state, speed: action.payload };
    case 'TOGGLE_CLOSED_LOOP':
      return { ...state, closedLoop: !state.closedLoop };
    case 'RESET':
      return initialState();
    case 'ADD_EVENT': {
      const eventKey = `${action.payload.trace_id}|${action.payload.msg_type}|${action.payload.ts}`;
      if (state.seenKeys.has(eventKey)) return state;
      const nextKeys = new Set(state.seenKeys);
      nextKeys.add(eventKey);
      return {
        ...state,
        seenKeys: nextKeys,
        events: [action.payload, ...state.events].slice(0, MAX_EVENTS),
      };
    }
    case 'HIGHLIGHT_NODE':
      return {
        ...state,
        highlightedNodes: { ...state.highlightedNodes, [action.payload.nodeId]: action.payload.ts },
      };
    case 'SWEEP_HIGHLIGHTS': {
      const threshold = action.payload;
      const activeEntries = Object.entries(state.highlightedNodes).filter(([, ts]) => threshold - ts <= 700);
      return { ...state, highlightedNodes: Object.fromEntries(activeEntries) };
    }
    default:
      return state;
  }
}

function startRecording(durationMs: number, filename: string, onDone: () => void) {
  const saveRecording = async (blob: Blob) => {
    const saveWindow = window as Window & {
      showSaveFilePicker?: (options: Record<string, unknown>) => Promise<any>;
    };

    if (typeof saveWindow.showSaveFilePicker === 'function') {
      try {
        const handle = await saveWindow.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'WebM video',
              accept: { 'video/webm': ['.webm'] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        const err = error as { name?: string };
        if (err?.name === 'AbortError') return;
        console.warn('Save picker failed, falling back to browser download.', error);
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  let finished = false;
  const finalize = () => {
    if (finished) return;
    finished = true;
    onDone();
  };

  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    console.warn('Screen capture is not supported in this browser.');
    finalize();
    return;
  }

  void (async () => {
    let stream: MediaStream | null = null;

    try {
      const options: DisplayMediaStreamOptions = {
        audio: false,
        video: {
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        } as MediaTrackConstraints,
      };

      const videoConstraints = options.video as MediaTrackConstraints & Record<string, unknown>;
      videoConstraints.displaySurface = 'window';
      videoConstraints.selfBrowserSurface = 'include';

      stream = await navigator.mediaDevices.getDisplayMedia(options);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 7_000_000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream?.getTracks().forEach((track) => track.stop());
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mimeType });
          await saveRecording(blob);
        }
        finalize();
      };

      recorder.onerror = () => {
        stream?.getTracks().forEach((track) => track.stop());
        finalize();
      };

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
      });

      recorder.start(150);

      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, durationMs);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      console.warn('Recording was cancelled or failed.', error);
      finalize();
    }
  })();
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [isRecording, setIsRecording] = useState(false);
  const [anomalyTick, setAnomalyTick] = useState(0);
  const [activeCaseStudy, setActiveCaseStudy] = useState<CaseStudyId>('CS1');
  const nowRef = useRef(Date.now());

  const onEvent = useCallback((event: TopologyEvent) => {
    dispatch({ type: 'ADD_EVENT', payload: event });
  }, []);

  const onToken = useCallback(() => {}, []);

  const { triggerAnomaly, resetSimulator } = useSimulator({
    caseStudyId: activeCaseStudy,
    playing: state.playing,
    speed: state.speed,
    closedLoop: state.closedLoop,
    onEvent,
    onToken,
  });

  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      nowRef.current = Date.now();
      dispatch({ type: 'SWEEP_HIGHLIGHTS', payload: nowRef.current });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const latestEvent = useMemo(() => state.events[0], [state.events]);

  const latestSignalEvent = useMemo(
    () => state.events.find((event) => event.msg_type !== 'KPI'),
    [state.events]
  );

  const scenarioSnapshot = useMemo(
    () => latestEvent?.details.snapshot ?? DEFAULT_SNAPSHOT,
    [latestEvent]
  );

  const radio = useRadioResources({
    ue1DlMbps: scenarioSnapshot.ue1.throughput_mbps,
    ue2DlMbps: scenarioSnapshot.ue2.throughput_mbps,
    cpeDlMbps: scenarioSnapshot.cpe.throughput_mbps,
    anomalyTick,
    playing: state.playing,
  });

  const currentStep = useMemo<SimulationStep>(() => {
    if (scenarioSnapshot.phase === 'steady') return 'IDLE';
    return latestSignalEvent?.step ?? 'IDLE';
  }, [latestSignalEvent, scenarioSnapshot.phase]);

  const activeCaseConfig = useMemo(() => CASE_STUDIES[activeCaseStudy], [activeCaseStudy]);

  const narrativeText = useMemo(
    () => narrativeForStep(activeCaseConfig, currentStep, state.closedLoop),
    [activeCaseConfig, currentStep, state.closedLoop]
  );

  React.useEffect(() => {
    if (currentStep === 'IDLE') return;
    const systems = STEP_SYSTEMS[currentStep];
    if (!systems.length) return;

    const timers = systems.map((nodeId, index) =>
      window.setTimeout(() => {
        dispatch({ type: 'HIGHLIGHT_NODE', payload: { nodeId, ts: Date.now() } });
      }, index * 150)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [currentStep]);

  const onRecord = useCallback(() => {
    if (isRecording) return;
    setIsRecording(true);
    startRecording(15_000, 'mwc-case-study-1-full-page.webm', () => setIsRecording(false));
  }, [isRecording]);

  const onTriggerAnomaly = useCallback(() => {
    triggerAnomaly();
    setAnomalyTick((prev) => prev + 1);
  }, [triggerAnomaly]);

  const onReset = useCallback(() => {
    resetSimulator();
    dispatch({ type: 'RESET' });
  }, [resetSimulator]);

  React.useEffect(() => {
    resetSimulator();
    dispatch({ type: 'RESET' });
    setAnomalyTick((prev) => prev + 1);
  }, [activeCaseStudy, resetSimulator]);

  const overlay = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('overlay') === '1';
  }, []);

  return (
    <div className="app-shell">
      <LayoutEngine
        overlay={overlay}
        tabs={
          <TabsRow activeCaseStudy={activeCaseStudy} onChange={setActiveCaseStudy} />
        }
        headerBar={
          <HeaderBar
            caseStudyTitle={activeCaseConfig.headerTitle}
            playing={state.playing}
            speed={state.speed}
            closedLoop={state.closedLoop}
            isRecording={isRecording}
            onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
            onSetSpeed={(speed) => dispatch({ type: 'SET_SPEED', payload: speed })}
            onToggleClosedLoop={() => dispatch({ type: 'TOGGLE_CLOSED_LOOP' })}
            onTriggerAnomaly={onTriggerAnomaly}
            onReset={onReset}
            onRecord={onRecord}
          />
        }
        liveCallout={null}
        narrative={
          <NarrativePanel
            title={activeCaseConfig.narrativeTitle}
            narrative={narrativeText}
            currentStep={currentStep}
          />
        }
        topologyPanel={
          <TopologyPanelStatic
            caseStudyId={activeCaseStudy}
            highlightedNodes={state.highlightedNodes}
            now={nowRef.current}
            snapshot={scenarioSnapshot}
          />
        }
        metricsPane={
          <MetricsPane
            radio={radio}
            ue1Cell={scenarioSnapshot.ue1.cell}
            ue2Cell={scenarioSnapshot.ue2.cell}
            cpeCell={scenarioSnapshot.cpe.cell}
            ue1Sinr={scenarioSnapshot.ue1.sinr_db}
            ue2Sinr={scenarioSnapshot.ue2.sinr_db}
            cpeSinr={scenarioSnapshot.cpe.sinr_db}
          />
        }
        stageFlowPane={
          <WorkflowPane currentStep={currentStep} copy={activeCaseConfig.workflow} />
        }
        eventsPane={
          <EventsPane events={state.events} tracePrefix={activeCaseConfig.id} />
        }
        partnersFooter={<PartnersFooter />}
      />
    </div>
  );
};

export default App;
