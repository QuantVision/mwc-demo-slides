import { useReducer, useCallback } from 'react';
import type { AppState, AppAction, WorkflowEvent, Token, NodeStats, WorkflowId } from '../types';

const MAX_EVENTS = 200;
const TOKEN_TRANSIT_MS = 800; // base duration; adjusted by speed externally

function makeIdempotencyKey(e: WorkflowEvent): string {
  return `${e.workflow_id}|${e.trace_id}|${e.from_node}|${e.to_node}|${e.ts}`;
}

function emptyStats(): NodeStats {
  return { in_flight: 0, success: 0, fail: 0, warn: 0 };
}

function initState(): AppState {
  return {
    playing: true,
    speed: 1,
    mode: 'demo',
    activeWorkflow: 'anomaly-rca',
    tokens: [],
    nodeStats: {},
    events: [],
    highlightedNodes: {},
    seenEvents: new Set(),
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_WORKFLOW':
      return {
        ...initState(),
        activeWorkflow: action.payload,
        playing: state.playing,
        speed: state.speed,
        mode: state.mode,
      };

    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };

    case 'SET_SPEED':
      return { ...state, speed: action.payload };

    case 'SET_MODE':
      return { ...initState(), mode: action.payload, activeWorkflow: state.activeWorkflow };

    case 'RESET':
      return {
        ...initState(),
        playing: state.playing,
        speed: state.speed,
        mode: state.mode,
        activeWorkflow: state.activeWorkflow,
      };

    case 'ADD_EVENT': {
      const ev = action.payload;
      if (ev.workflow_id !== state.activeWorkflow) return state;

      const key = makeIdempotencyKey(ev);
      if (state.seenEvents.has(key)) return state;

      const newSeen = new Set(state.seenEvents);
      newSeen.add(key);

      // Create token
      const token: Token = {
        id: key,
        trace_id: ev.trace_id,
        workflow_id: ev.workflow_id,
        from_node: ev.from_node,
        to_node: ev.to_node,
        status: ev.status,
        progress: 0,
        startTime: Date.now(),
        duration: TOKEN_TRANSIT_MS,
      };

      // Update node stats: from_node loses in_flight, to_node gains in_flight
      const newStats = { ...state.nodeStats };
      if (!newStats[ev.from_node]) newStats[ev.from_node] = emptyStats();
      if (!newStats[ev.to_node]) newStats[ev.to_node] = emptyStats();

      // to_node gains in_flight
      newStats[ev.to_node] = {
        ...newStats[ev.to_node],
        in_flight: newStats[ev.to_node].in_flight + 1,
      };

      // Events list (capped)
      const newEvents = [ev, ...state.events].slice(0, MAX_EVENTS);

      return {
        ...state,
        seenEvents: newSeen,
        tokens: [...state.tokens, token],
        nodeStats: newStats,
        events: newEvents,
      };
    }

    case 'TICK': {
      const now = action.payload.now;
      const expiredTokenIds = new Set<string>();
      const arrivedAtNodes: string[] = [];

      // Remove tokens that finished transit
      const liveTokens = state.tokens.filter((tok) => {
        const age = now - tok.startTime;
        if (age >= tok.duration) {
          expiredTokenIds.add(tok.id);
          arrivedAtNodes.push(tok.to_node);
          return false;
        }
        return true;
      });

      if (expiredTokenIds.size === 0 && Object.keys(state.highlightedNodes).length === 0) {
        return state;
      }

      // Update stats for arrived tokens
      let newStats = state.nodeStats;
      if (arrivedAtNodes.length > 0) {
        newStats = { ...state.nodeStats };
        state.tokens.forEach((tok) => {
          if (expiredTokenIds.has(tok.id)) {
            const toNode = tok.to_node;
            if (!newStats[toNode]) newStats[toNode] = emptyStats();
            newStats[toNode] = {
              ...newStats[toNode],
              in_flight: Math.max(0, newStats[toNode].in_flight - 1),
              success: tok.status === 'ok' ? newStats[toNode].success + 1 : newStats[toNode].success,
              fail: tok.status === 'fail' ? newStats[toNode].fail + 1 : newStats[toNode].fail,
              warn: tok.status === 'warn' ? newStats[toNode].warn + 1 : newStats[toNode].warn,
            };
          }
        });
      }

      // Highlight arrived nodes
      let newHighlights = state.highlightedNodes;
      if (arrivedAtNodes.length > 0) {
        newHighlights = { ...state.highlightedNodes };
        arrivedAtNodes.forEach((nodeId) => {
          newHighlights[nodeId] = now;
        });
      }

      // Remove stale highlights (> 900ms)
      const staleHl = Object.entries(newHighlights).filter(([, ts]) => now - ts > 900);
      if (staleHl.length > 0) {
        newHighlights = { ...newHighlights };
        staleHl.forEach(([k]) => delete newHighlights[k]);
      }

      return {
        ...state,
        tokens: liveTokens,
        nodeStats: newStats,
        highlightedNodes: newHighlights,
      };
    }

    case 'HIGHLIGHT_NODE': {
      return {
        ...state,
        highlightedNodes: {
          ...state.highlightedNodes,
          [action.payload.nodeId]: action.payload.ts,
        },
      };
    }

    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const setWorkflow = useCallback((id: WorkflowId) => dispatch({ type: 'SET_WORKFLOW', payload: id }), []);
  const togglePlay = useCallback(() => dispatch({ type: 'TOGGLE_PLAY' }), []);
  const setSpeed = useCallback((s: number) => dispatch({ type: 'SET_SPEED', payload: s }), []);
  const setMode = useCallback((m: 'demo' | 'live') => dispatch({ type: 'SET_MODE', payload: m }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const addEvent = useCallback((ev: WorkflowEvent) => dispatch({ type: 'ADD_EVENT', payload: ev }), []);
  const tick = useCallback((now: number) => dispatch({ type: 'TICK', payload: { now } }), []);

  return { state, setWorkflow, togglePlay, setSpeed, setMode, reset, addEvent, tick };
}
