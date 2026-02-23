import React, { useMemo, useRef } from 'react';
import type { TopologySnapshot } from '../types';
import { TOPOLOGY_MAP, pointInRect, clamp01, rectToPercentStyle } from '../topology/topologyMap';
import type { NormalizedRect } from '../topology/topologyMap';

interface TopologyPanelStaticProps {
  highlightedNodes: Record<string, number>;
  now: number;
  snapshot: TopologySnapshot;
}

interface Marker {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'ue' | 'cpe';
  hot: boolean;
  note: string;
}

function inHighlightWindow(highlightedNodes: Record<string, number>, now: number, nodeIds: string[]): boolean {
  return nodeIds.some((id) => {
    const ts = highlightedNodes[id];
    return ts !== undefined && now - ts <= 760;
  });
}

function wobble(seed: number, t: number): { x: number; y: number } {
  const x = 0.5 + Math.sin(t * (0.55 + seed * 0.11) + seed * 1.9) * 0.32;
  const y = 0.5 + Math.cos(t * (0.44 + seed * 0.09) + seed * 2.2) * 0.34;
  return { x: clamp01(x), y: clamp01(y) };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function composeRect(frame: NormalizedRect, inset: NormalizedRect): NormalizedRect {
  return {
    x: frame.x + frame.w * inset.x,
    y: frame.y + frame.h * inset.y,
    w: frame.w * inset.w,
    h: frame.h * inset.h,
  };
}

const TopologyPanelStatic: React.FC<TopologyPanelStaticProps> = ({ highlightedNodes, now, snapshot }) => {
  const t = now / 1000;
  const ue2Target = snapshot.ue2.cell === 'A' || snapshot.contention ? 1 : 0;
  const ue2BiasRef = useRef(0);
  ue2BiasRef.current = lerp(ue2BiasRef.current, ue2Target, 0.05);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hostname.includes('localhost')) return;

    const aiPanes = document.querySelectorAll('[data-pane="vismon-ai"]');
    const energyPanes = document.querySelectorAll('[data-pane="vismon-energy"]');

    if (aiPanes.length > 1) {
      console.warn(`[TopologyPanelStatic] Expected 1 VISMON AI pane, found ${aiPanes.length}.`);
    }
    if (energyPanes.length > 1) {
      console.warn(`[TopologyPanelStatic] Expected 1 VISMON Energy pane, found ${energyPanes.length}.`);
    }
  }, []);

  const markers = useMemo<Marker[]>(() => {
    const ue1Wobble = wobble(1, t);
    const ue2Wobble = wobble(2, t);
    const cpeWobble = wobble(3, t);

    const ue2AreaX = lerp(TOPOLOGY_MAP.areas.ue2.x, TOPOLOGY_MAP.areas.ue1.x, ue2BiasRef.current);
    const ue2AreaY = lerp(TOPOLOGY_MAP.areas.ue2.y, TOPOLOGY_MAP.areas.ue1.y, ue2BiasRef.current);
    const ue2AreaW = lerp(TOPOLOGY_MAP.areas.ue2.w, TOPOLOGY_MAP.areas.ue1.w, ue2BiasRef.current);
    const ue2AreaH = lerp(TOPOLOGY_MAP.areas.ue2.h, TOPOLOGY_MAP.areas.ue1.h, ue2BiasRef.current);

    const ue2Area = { x: ue2AreaX, y: ue2AreaY, w: ue2AreaW, h: ue2AreaH };

    const ue1Pos = pointInRect(TOPOLOGY_MAP.areas.ue1, ue1Wobble.x, ue1Wobble.y);
    const ue2Pos = pointInRect(ue2Area, ue2Wobble.x, ue2Wobble.y);
    const cpePos = pointInRect(TOPOLOGY_MAP.areas.cpe, cpeWobble.x, cpeWobble.y);

    const ue1Hot = snapshot.contention || inHighlightWindow(highlightedNodes, now, ['du-b', 'nonrt-ric']);
    const ue2Hot = snapshot.contention || inHighlightWindow(highlightedNodes, now, ['du-a', 'du-b', 'ru-b']);
    const cpeHot = inHighlightWindow(highlightedNodes, now, ['core', 'cu']);

    return [
      { id: 'ue1', label: 'UE1', x: ue1Pos.x, y: ue1Pos.y, kind: 'ue', hot: ue1Hot, note: `Cell ${snapshot.ue1.cell}` },
      { id: 'ue2', label: 'UE2', x: ue2Pos.x, y: ue2Pos.y, kind: 'ue', hot: ue2Hot, note: `Cell ${snapshot.ue2.cell}` },
      { id: 'cpe', label: 'CPE', x: cpePos.x, y: cpePos.y, kind: 'cpe', hot: cpeHot, note: 'Gateway' },
    ];
  }, [highlightedNodes, now, snapshot, t]);

  const aiOverlayRect = useMemo(
    () =>
      TOPOLOGY_MAP.vismon.aiContent ??
      composeRect(TOPOLOGY_MAP.vismon.aiFrame, TOPOLOGY_MAP.vismon.aiContentInset),
    []
  );
  const energyOverlayRect = useMemo(
    () =>
      TOPOLOGY_MAP.vismon.energyContent ??
      composeRect(TOPOLOGY_MAP.vismon.energyFrame, TOPOLOGY_MAP.vismon.energyContentInset),
    []
  );

  return (
    <section className="topology-panel">
      <div className="topology-panel-inner topology-static">
        <div className="topologyStage">
          <img className="topologyBase" src="/assets/topology_frame.png" alt="Topology base" />

          <div className="vismon-activity vismon-ai-activity" style={rectToPercentStyle(aiOverlayRect)}>
            <div className="vismon-ai-scan" />
            <div className="vismon-ai-lines" />
            <div className="vismon-ai-cursor" />
          </div>

          <div className="vismon-activity vismon-energy-activity" style={rectToPercentStyle(energyOverlayRect)}>
            <div className="vismon-energy-track" />
            <div className="vismon-energy-dot" />
          </div>

          <div className="overlayLayer">
            {markers.map((marker) => (
              <div
                key={marker.id}
                className={`overlayMarker ${marker.kind} ${marker.hot ? 'hot' : ''}`}
                style={{
                  left: `${marker.x * 100}%`,
                  top: `${marker.y * 100}%`,
                }}
                title={`${marker.label} · ${marker.note}`}
              >
                {marker.kind === 'ue' ? (
                  <img src="/assets/UE Icon.png" alt={marker.label} className="markerIcon" />
                ) : (
                  <img src="/assets/CPE Icon.png" alt={marker.label} className="markerIcon cpe" />
                )}
                <span className="markerLabel">{marker.label}</span>
                {marker.hot && <span className="markerRing" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopologyPanelStatic;
