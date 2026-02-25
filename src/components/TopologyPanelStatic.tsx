import React, { useMemo, useRef } from 'react';
import type { TopologySnapshot } from '../types';
import { TOPOLOGY_MAP, pointInRect, clamp01, rectToPercentStyle } from '../topology/topologyMap';
import type { NormalizedRect } from '../topology/topologyMap';
import type { CaseStudyId } from '../caseStudies/config';

interface TopologyPanelStaticProps {
  caseStudyId: CaseStudyId;
  highlightedNodes: Record<string, number>;
  now: number;
  snapshot: TopologySnapshot;
}

interface Marker {
  id: string;
  label: string;
  x: number;
  y: number;
  servingCell: 'A' | 'B';
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

const TopologyPanelStatic: React.FC<TopologyPanelStaticProps> = ({ caseStudyId, highlightedNodes, now, snapshot }) => {
  const t = now / 1000;
  const ue1Target = snapshot.ue1.cell === 'B' ? 1 : 0;
  const ue2Target = snapshot.ue2.cell === 'A' || snapshot.contention ? 1 : 0;
  const effectiveCpeCell: 'A' | 'B' = caseStudyId === 'CS2' ? snapshot.ue2.cell : snapshot.cpe.cell;
  const cpeTarget = effectiveCpeCell === 'A' ? 1 : 0;
  const ue1BiasRef = useRef(0);
  const ue2BiasRef = useRef(0);
  const cpeBiasRef = useRef(0);
  ue1BiasRef.current = lerp(ue1BiasRef.current, ue1Target, 0.02);
  ue2BiasRef.current = lerp(ue2BiasRef.current, ue2Target, 0.02);
  cpeBiasRef.current = lerp(cpeBiasRef.current, cpeTarget, 0.03);

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

    const ue1Area = {
      x: lerp(TOPOLOGY_MAP.areas.ue1A.x, TOPOLOGY_MAP.areas.ue1B.x, ue1BiasRef.current),
      y: lerp(TOPOLOGY_MAP.areas.ue1A.y, TOPOLOGY_MAP.areas.ue1B.y, ue1BiasRef.current),
      w: lerp(TOPOLOGY_MAP.areas.ue1A.w, TOPOLOGY_MAP.areas.ue1B.w, ue1BiasRef.current),
      h: lerp(TOPOLOGY_MAP.areas.ue1A.h, TOPOLOGY_MAP.areas.ue1B.h, ue1BiasRef.current),
    };
    const ue2Area = {
      x: lerp(TOPOLOGY_MAP.areas.ue2B.x, TOPOLOGY_MAP.areas.ue2A.x, ue2BiasRef.current),
      y: lerp(TOPOLOGY_MAP.areas.ue2B.y, TOPOLOGY_MAP.areas.ue2A.y, ue2BiasRef.current),
      w: lerp(TOPOLOGY_MAP.areas.ue2B.w, TOPOLOGY_MAP.areas.ue2A.w, ue2BiasRef.current),
      h: lerp(TOPOLOGY_MAP.areas.ue2B.h, TOPOLOGY_MAP.areas.ue2A.h, ue2BiasRef.current),
    };
    const cpeArea = {
      x: lerp(TOPOLOGY_MAP.areas.cpeB.x, TOPOLOGY_MAP.areas.cpeA.x, cpeBiasRef.current),
      y: lerp(TOPOLOGY_MAP.areas.cpeB.y, TOPOLOGY_MAP.areas.cpeA.y, cpeBiasRef.current),
      w: lerp(TOPOLOGY_MAP.areas.cpeB.w, TOPOLOGY_MAP.areas.cpeA.w, cpeBiasRef.current),
      h: lerp(TOPOLOGY_MAP.areas.cpeB.h, TOPOLOGY_MAP.areas.cpeA.h, cpeBiasRef.current),
    };

    const ue1Pos = pointInRect(ue1Area, ue1Wobble.x, ue1Wobble.y);
    const ue2Pos = pointInRect(ue2Area, ue2Wobble.x, ue2Wobble.y);
    const cpePos = pointInRect(cpeArea, cpeWobble.x, cpeWobble.y);

    const ue1Hot = true;
    const ue2Hot = false;
    const cpeHot = false;

    return [
      {
        id: 'ue1',
        label: 'UE1',
        x: ue1Pos.x,
        y: ue1Pos.y,
        servingCell: snapshot.ue1.cell,
        kind: 'ue',
        hot: ue1Hot,
        note: `Cell ${snapshot.ue1.cell}`,
      },
      {
        id: 'ue2',
        label: 'UE2',
        x: ue2Pos.x,
        y: ue2Pos.y,
        servingCell: snapshot.ue2.cell,
        kind: 'ue',
        hot: ue2Hot,
        note: `Cell ${snapshot.ue2.cell}`,
      },
      {
        id: 'cpe',
        label: 'CPE',
        x: cpePos.x,
        y: cpePos.y,
        servingCell: effectiveCpeCell,
        kind: 'cpe',
        hot: cpeHot,
        note: `Cell ${effectiveCpeCell}`,
      },
    ];
  }, [caseStudyId, effectiveCpeCell, highlightedNodes, now, snapshot, t]);

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
            {caseStudyId === 'CS3' && (
              <>
                <div className={`pci-label cell-a ${snapshot.pci_clash ? 'clash' : ''}`}>
                  Cell A PCI: {snapshot.cell_a_pci}
                </div>
                <div className={`pci-label cell-b ${snapshot.pci_clash ? 'clash' : ''}`}>
                  Cell B PCI: {snapshot.cell_b_pci}
                </div>
                {snapshot.ru_b_restarting && (
                  <div className="ru-restart-badge">
                    RU-B restarting...
                  </div>
                )}
              </>
            )}

            <svg className="overlayLinks" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
              {markers.map((marker) => {
                const anchor = TOPOLOGY_MAP.servingAnchors[marker.servingCell];
                return (
                  <line
                    key={`${marker.id}-serve`}
                    x1={anchor.x}
                    y1={anchor.y}
                    x2={marker.x}
                    y2={marker.y - (marker.kind === 'cpe' ? 0.02 : 0.03)}
                    className={`overlayLink ${marker.kind} ${marker.hot ? 'hot' : ''}`}
                  />
                );
              })}
            </svg>

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
                {marker.id === 'ue1' && <span className="markerRing" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TopologyPanelStatic;
