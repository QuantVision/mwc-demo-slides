import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { WorkflowDef, Token, NodeStats, EdgeDef, NodeDef } from '../types';

// ─── Color constants ────────────────────────────────────────────────────────
const C = {
  bg: '#0B1A2B',
  nodeFill: '#0F2540',
  nodeBorder: '#1E3A5F',
  nodeText: '#E8EDF5',
  nodeSub: '#7A9BBF',
  teal: '#00A6A6',
  edgeLine: '#1E3A5F',
  edgeLabel: '#4A7AAF',
  tokenOk: '#00C8A0',
  tokenFail: '#E05050',
  tokenWarn: '#E0A840',
  highlight: '#00A6A6',
  statSuccess: '#00C8A0',
  statFail: '#E05050',
  statWarn: '#E0A840',
  statInFlight: '#7A9BBF',
} as const;

// ─── Node type colors ────────────────────────────────────────────────────────
const NODE_ACCENT: Record<string, string> = {
  rapp: '#00A6A6',
  ai: '#5A7FFF',
  netops: '#9060E0',
  noc: '#C07030',
  kpi: '#3090C0',
  decision: '#60A060',
  validation: '#40B890',
};

// ─── Geometry helpers ────────────────────────────────────────────────────────
interface Point { x: number; y: number; }

function nodeCenter(node: NodeDef): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function edgeEndpoints(
  from: NodeDef,
  to: NodeDef,
  waypoints?: Point[]
): { path: string; midPoint: Point } {
  const s = nodeCenter(from);
  const e = nodeCenter(to);

  if (waypoints && waypoints.length > 0) {
    const pts = [s, ...waypoints, e];
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const mid = pts[Math.floor(pts.length / 2)];
    return { path: d, midPoint: mid };
  }

  // Straight line with slight curve if vertical
  const dx = e.x - s.x;
  const dy = e.y - s.y;

  // Control point for slight curve
  const mx = (s.x + e.x) / 2 + (Math.abs(dy) > Math.abs(dx) ? 0 : dy * 0.1);
  const my = (s.y + e.y) / 2 + (Math.abs(dx) > Math.abs(dy) ? 0 : dx * 0.1);

  return {
    path: `M ${s.x} ${s.y} Q ${mx} ${my} ${e.x} ${e.y}`,
    midPoint: { x: mx, y: my },
  };
}

function pointOnQuadBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
  const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
  return { x, y };
}

function pointOnPolyline(pts: Point[], t: number): Point {
  if (pts.length < 2) return pts[0] ?? { x: 0, y: 0 };
  const totalPts = pts.length - 1;
  const segment = Math.min(Math.floor(t * totalPts), totalPts - 1);
  const localT = (t * totalPts) - segment;
  const a = pts[segment];
  const b = pts[segment + 1];
  return { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT };
}

function getTokenPosition(
  from: NodeDef,
  to: NodeDef,
  edge: EdgeDef,
  t: number
): Point {
  const s = nodeCenter(from);
  const e = nodeCenter(to);

  if (edge.waypoints && edge.waypoints.length > 0) {
    const pts = [s, ...edge.waypoints, e];
    return pointOnPolyline(pts, t);
  }

  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const mx = (s.x + e.x) / 2 + (Math.abs(dy) > Math.abs(dx) ? 0 : dy * 0.1);
  const my = (s.y + e.y) / 2 + (Math.abs(dx) > Math.abs(dy) ? 0 : dx * 0.1);

  return pointOnQuadBezier(s, { x: mx, y: my }, e, t);
}

// Easing: ease-in-out cubic
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface WorkflowCanvasProps {
  workflow: WorkflowDef;
  tokens: Token[];
  nodeStats: Record<string, NodeStats>;
  highlightedNodes: Record<string, number>;
  width?: number;
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  workflow,
  tokens,
  nodeStats,
  highlightedNodes,
  width = 820,
  height = 800,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const nowRef = useRef<number>(Date.now());

  // Build lookup maps
  const nodeMap = useMemo(() => {
    const m: Record<string, NodeDef> = {};
    workflow.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [workflow]);

  const edgeMap = useMemo(() => {
    const m: Record<string, EdgeDef> = {};
    workflow.edges.forEach((e) => (m[e.id] = e));
    return m;
  }, [workflow]);

  // Edge lookup by from+to
  const edgeByEndpoints = useMemo(() => {
    const m: Record<string, EdgeDef> = {};
    workflow.edges.forEach((e) => {
      m[`${e.from}>${e.to}`] = e;
    });
    return m;
  }, [workflow]);

  // ── Draw helpers ──────────────────────────────────────────────────────────
  const drawRoundedRect = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },
    []
  );

  const drawArrowhead = useCallback(
    (ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const len = 10;
      const spread = 0.35;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - len * Math.cos(angle - spread),
        to.y - len * Math.sin(angle - spread)
      );
      ctx.lineTo(
        to.x - len * Math.cos(angle + spread),
        to.y - len * Math.sin(angle + spread)
      );
      ctx.closePath();
      ctx.fill();
    },
    []
  );

  // ── Main draw loop ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const now = Date.now();
    nowRef.current = now;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;

    // Clear
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // ── Draw edges ──────────────────────────────────────────────────────────
    workflow.edges.forEach((edge) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];
      if (!fromNode || !toNode) return;

      const { path, midPoint } = edgeEndpoints(fromNode, toNode, edge.waypoints);
      const isDashed = edge.style === 'dashed';

      ctx.strokeStyle = C.edgeLine;
      ctx.lineWidth = 1.5;
      if (isDashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      const p = new Path2D(path);
      ctx.stroke(p);
      ctx.setLineDash([]);

      // Arrowhead at target
      const s = nodeCenter(fromNode);
      const e = nodeCenter(toNode);
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const mx = (s.x + e.x) / 2 + (Math.abs(dy) > Math.abs(dx) ? 0 : dy * 0.1);
      const my = (s.y + e.y) / 2 + (Math.abs(dx) > Math.abs(dy) ? 0 : dx * 0.1);
      const tNearEnd = 0.9;
      const dirPt = edge.waypoints?.length
        ? (() => {
            const pts = [s, ...(edge.waypoints || []), e];
            return pointOnPolyline(pts, tNearEnd);
          })()
        : pointOnQuadBezier(s, { x: mx, y: my }, e, tNearEnd);

      ctx.fillStyle = C.edgeLine;
      drawArrowhead(ctx, dirPt, e);

      // Edge label
      if (edge.label) {
        ctx.font = '10px Inter, Segoe UI, sans-serif';
        ctx.fillStyle = C.edgeLabel;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // offset label slightly
        const labelX = midPoint.x + 4;
        const labelY = midPoint.y - 10;
        ctx.fillText(edge.label, labelX, labelY);
      }
    });

    // ── Draw nodes ──────────────────────────────────────────────────────────
    workflow.nodes.forEach((node) => {
      const { x, y, width: w, height: h, type } = node;
      const accent = NODE_ACCENT[type] ?? C.teal;
      const isHighlighted = highlightedNodes[node.id] !== undefined;
      const hlAge = isHighlighted ? (now - highlightedNodes[node.id]) : 0;
      const hlAlpha = isHighlighted
        ? Math.max(0, 1 - hlAge / 800) // fade out over 800ms
        : 0;
      const stats = nodeStats[node.id];

      // Shadow for depth
      ctx.shadowColor = accent + '33';
      ctx.shadowBlur = isHighlighted ? 18 : 6;

      // Fill
      drawRoundedRect(ctx, x, y, w, h, 6);
      ctx.fillStyle = C.nodeFill;
      ctx.fill();

      // Accent border left strip
      ctx.fillStyle = accent;
      ctx.shadowBlur = 0;
      ctx.fillRect(x, y + 6, 3, h - 12);

      // Highlight border
      if (hlAlpha > 0) {
        ctx.strokeStyle = C.highlight + Math.floor(hlAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, x, y, w, h, 6);
        ctx.stroke();
      } else {
        ctx.strokeStyle = C.nodeBorder;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, x, y, w, h, 6);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Decision diamond indicator
      if (type === 'decision') {
        ctx.fillStyle = accent + '40';
        ctx.beginPath();
        const cx = x + w - 18;
        const cy = y + h / 2;
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.fill();
      }

      // Node label
      ctx.font = '600 12px Inter, Segoe UI, sans-serif';
      ctx.fillStyle = C.nodeText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textX = x + 14;
      const textY = node.sublabel ? y + h / 2 - 9 : y + h / 2;
      ctx.fillText(node.label, textX, textY);

      if (node.sublabel) {
        ctx.font = '400 10px Inter, Segoe UI, sans-serif';
        ctx.fillStyle = C.nodeSub;
        ctx.fillText(node.sublabel, textX, y + h / 2 + 9);
      }

      // Stats (in-flight, success, fail)
      if (stats) {
        const iconY = y + h - 14;
        const iconX = x + w - 80;
        ctx.font = '400 9px Inter, Segoe UI, sans-serif';

        if (stats.in_flight > 0) {
          ctx.fillStyle = C.statInFlight;
          ctx.fillText(`⬆ ${stats.in_flight}`, iconX, iconY);
        }
        if (stats.success > 0) {
          ctx.fillStyle = C.statSuccess;
          ctx.fillText(`✓ ${stats.success}`, iconX + 28, iconY);
        }
        if (stats.fail > 0) {
          ctx.fillStyle = C.statFail;
          ctx.fillText(`✗ ${stats.fail}`, iconX + 56, iconY);
        }
      }
    });

    // ── Draw tokens ─────────────────────────────────────────────────────────
    tokens.forEach((token) => {
      const fromNode = nodeMap[token.from_node];
      const toNode = nodeMap[token.to_node];
      if (!fromNode || !toNode) return;

      const edge = edgeByEndpoints[`${token.from_node}>${token.to_node}`];
      if (!edge) return;

      const elapsed = now - token.startTime;
      const rawT = Math.min(elapsed / token.duration, 1);
      const t = easeInOut(rawT);

      const pos = getTokenPosition(fromNode, toNode, edge, t);

      const tokenColor =
        token.status === 'fail' ? C.tokenFail :
        token.status === 'warn' ? C.tokenWarn :
        C.tokenOk;

      // Token glow
      ctx.shadowColor = tokenColor;
      ctx.shadowBlur = 12;

      // Outer ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = C.bg;
      ctx.fill();
      ctx.strokeStyle = tokenColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = tokenColor;
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    animFrameRef.current = requestAnimationFrame(draw);
  }, [workflow, tokens, nodeStats, highlightedNodes, nodeMap, edgeByEndpoints, drawRoundedRect, drawArrowhead]);

  // ── Canvas resize + DPR ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [width, height]);

  // ── Start/stop animation loop ────────────────────────────────────────────
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', borderRadius: 8 }}
    />
  );
};

export default WorkflowCanvas;
