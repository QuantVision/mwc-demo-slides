import React, { useEffect, useMemo, useState } from 'react';
import layoutSpec from '../layout/mockup.caseStudy1.json';

interface LayoutEngineProps {
  tabs: React.ReactNode;
  headerBar: React.ReactNode;
  liveCallout: React.ReactNode;
  narrative: React.ReactNode;
  topologyPanel: React.ReactNode;
  metricsPane: React.ReactNode;
  stageFlowPane: React.ReactNode;
  eventsPane: React.ReactNode;
  partnersFooter: React.ReactNode;
  overlay: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const spec = layoutSpec as any;

function rectStyle(rect: Rect): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
  };
}

const LayoutEngine: React.FC<LayoutEngineProps> = ({
  tabs,
  headerBar,
  liveCallout,
  narrative,
  topologyPanel,
  metricsPane,
  stageFlowPane,
  eventsPane,
  partnersFooter,
  overlay,
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? spec.canvas.width : window.innerWidth,
    height: typeof window === 'undefined' ? spec.canvas.height : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stageScale = useMemo(() => {
    const sx = viewport.width / spec.canvas.width;
    const sy = viewport.height / spec.canvas.height;
    return Math.min(sx, sy);
  }, [viewport.height, viewport.width]);

  const stageOffset = useMemo(() => {
    const scaledW = spec.canvas.width * stageScale;
    const scaledH = spec.canvas.height * stageScale;
    return {
      x: Math.max(0, (viewport.width - scaledW) / 2),
      y: Math.max(0, (viewport.height - scaledH) / 2),
    };
  }, [stageScale, viewport.height, viewport.width]);

  const calloutRect: Rect = {
    x: spec.regions.leftTopology.x,
    y: spec.regions.rightNarrative.y,
    w: spec.regions.leftTopology.w,
    h: liveCallout ? spec.regions.rightNarrative.h : 0,
  };

  const outerPad = 8;
  const sectionGap = 12;
  const mainGap = 16;
  const paneGap = 12;

  const topFrameRect: Rect = {
    x: outerPad,
    y: outerPad,
    w: spec.canvas.width - outerPad * 2,
    h: 112,
  };

  const leftColumnX = outerPad;
  const rightColumnX = 954;
  const leftColumnW = rightColumnX - leftColumnX - mainGap;
  const rightColumnW = spec.canvas.width - outerPad - rightColumnX;

  const contentTop = topFrameRect.y + topFrameRect.h + sectionGap;

  const selectorRect: Rect = {
    x: leftColumnX,
    y: contentTop,
    w: leftColumnW,
    h: 54,
  };

  const narrativeRect: Rect = {
    x: rightColumnX,
    y: contentTop,
    w: rightColumnW,
    h: 166,
  };

  const footerRect: Rect = {
    x: outerPad,
    y: spec.canvas.height - 64,
    w: spec.canvas.width - outerPad * 2,
    h: 56,
  };

  const mainBottom = footerRect.y - 8;
  const panesTop = narrativeRect.y + narrativeRect.h + sectionGap;

  const topologyRect: Rect = {
    x: leftColumnX,
    y: selectorRect.y + selectorRect.h + sectionGap,
    w: leftColumnW,
    h: Math.max(420, mainBottom - (selectorRect.y + selectorRect.h + sectionGap)),
  };

  const paneWidth = (rightColumnW - paneGap * 2) / 3;

  const metricsRect: Rect = {
    x: rightColumnX,
    y: panesTop,
    w: paneWidth,
    h: Math.max(320, mainBottom - panesTop),
  };

  const workflowRect: Rect = {
    x: rightColumnX + paneWidth + paneGap,
    y: panesTop,
    w: paneWidth,
    h: Math.max(320, mainBottom - panesTop),
  };

  const eventsRect: Rect = {
    x: rightColumnX + paneWidth * 2 + paneGap * 2,
    y: panesTop,
    w: paneWidth,
    h: Math.max(320, mainBottom - panesTop),
  };

  const regionOverlays: Array<Rect & { id: string }> = [
    { id: 'topFrame', ...topFrameRect },
    { id: 'selector', ...selectorRect },
    { id: 'callout', ...calloutRect },
    { id: 'leftTopology', ...topologyRect },
    { id: 'rightNarrative', ...narrativeRect },
    { id: 'metrics', ...metricsRect },
    { id: 'workflow', ...workflowRect },
    { id: 'events', ...eventsRect },
    { id: 'footer', ...footerRect },
  ];

  return (
    <div className="stage-viewport">
      <div
        className="stage-transform"
        style={{
          width: `${spec.canvas.width}px`,
          height: `${spec.canvas.height}px`,
          transform: `translate(${stageOffset.x}px, ${stageOffset.y}px) scale(${stageScale})`,
        }}
      >
        <div className="stage" style={{ width: `${spec.canvas.width}px`, height: `${spec.canvas.height}px` }}>
          <div className="stage-region stage-region-top-frame" style={rectStyle(topFrameRect)}>
            <div className="headerStack">
              <div className="headerStack-main">{headerBar}</div>
            </div>
          </div>
          <div className="stage-region stage-region-selector" style={rectStyle(selectorRect)}>{tabs}</div>
          <div className="stage-region stage-region-narrative" style={rectStyle(narrativeRect)}>{narrative}</div>
          <div className="stage-region stage-region-topology" style={rectStyle(topologyRect)}>{topologyPanel}</div>
          <div className="stage-region stage-region-metrics" style={rectStyle(metricsRect)}>{metricsPane}</div>
          <div className="stage-region stage-region-workflow" style={rectStyle(workflowRect)}>{stageFlowPane}</div>
          <div className="stage-region stage-region-events" style={rectStyle(eventsRect)}>{eventsPane}</div>
          {liveCallout && (
            <div className="stage-region stage-region-callout" style={rectStyle(calloutRect)}>{liveCallout}</div>
          )}
          <div className="stage-region stage-region-footer" style={rectStyle(footerRect)}>{partnersFooter}</div>

          {overlay && (
            <div className="layout-overlay" aria-hidden="true">
              {regionOverlays.map((item) => (
                <div
                  key={`region-${item.id}`}
                  className="overlay-box kind-region"
                  style={rectStyle(item)}
                >
                  <span className="overlay-label">{item.id}</span>
                </div>
              ))}
              {spec.raw.map((item: any) => (
                <div
                  key={`raw-${item.kind}-${item.id}-${item.x}-${item.y}`}
                  className={`overlay-box kind-${item.kind}`}
                  style={rectStyle(item)}
                >
                  <span className="overlay-label">{item.name || item.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutEngine;
