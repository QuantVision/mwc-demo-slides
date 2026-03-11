export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export const TOPOLOGY_MAP = {
  coverage: {
    oru1: { x: 0.0079, y: 0.7556, w: 0.3106, h: 0.1306 } satisfies NormalizedRect,
    oru2: { x: 0.3783, y: 0.7556, w: 0.3106, h: 0.1306 } satisfies NormalizedRect,
  },
  areas: {
    ue1: { x: 0.0600, y: 0.8000, w: 0.2200, h: 0.1500 } satisfies NormalizedRect,
    ue2: { x: 0.4300, y: 0.7950, w: 0.2400, h: 0.1550 } satisfies NormalizedRect,
    cpe: { x: 0.2550, y: 0.8350, w: 0.3000, h: 0.1400 } satisfies NormalizedRect,
    ue1A: { x: 0.0600, y: 0.8000, w: 0.2200, h: 0.1500 } satisfies NormalizedRect,
    ue1B: { x: 0.4300, y: 0.7950, w: 0.2200, h: 0.1500 } satisfies NormalizedRect,
    ue2A: { x: 0.1050, y: 0.8200, w: 0.1850, h: 0.1200 } satisfies NormalizedRect,
    ue2B: { x: 0.4300, y: 0.7950, w: 0.2400, h: 0.1550 } satisfies NormalizedRect,
    cpeA: { x: 0.1700, y: 0.8650, w: 0.1100, h: 0.0900 } satisfies NormalizedRect,
    cpeB: { x: 0.4300, y: 0.8850, w: 0.1100, h: 0.0850 } satisfies NormalizedRect,
  },
  servingAnchors: {
    A: { x: 0.195, y: 0.842 } satisfies NormalizedPoint,
    B: { x: 0.555, y: 0.842 } satisfies NormalizedPoint,
  },
  vismon: {
    aiFrame: { x: 0.6840, y: 0.0520, w: 0.2921, h: 0.2355 } satisfies NormalizedRect,
    energyFrame: { x: 0.6867, y: 0.3424, w: 0.2921, h: 0.2355 } satisfies NormalizedRect,
    aiContentInset: { x: 0.0900, y: 0.1700, w: 0.8200, h: 0.6500 } satisfies NormalizedRect,
    energyContentInset: { x: 0.0900, y: 0.1700, w: 0.8200, h: 0.6500 } satisfies NormalizedRect,
    aiContent: { x: 0.7153, y: 0.0716, w: 0.2603, h: 0.1816 } satisfies NormalizedRect,
    energyContent: { x: 0.7246, y: 0.4631, w: 0.2524, h: 0.1241 } satisfies NormalizedRect,
    aiContentWindow: { x: 0.6488, y: 0.0658, w: 0.3186, h: 0.1818 } satisfies NormalizedRect,
    energyContentWindow: { x: 0.6488, y: 0.3802, w: 0.3186, h: 0.1818 } satisfies NormalizedRect,
  },
  markerSizes: {
    ue: { x: 0.024, y: 0.048 } satisfies NormalizedPoint,
    cpe: { x: 0.042, y: 0.043 } satisfies NormalizedPoint,
  },
};

export function rectToPercentStyle(rect: NormalizedRect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function pointInRect(rect: NormalizedRect, x: number, y: number): NormalizedPoint {
  return {
    x: clamp01(rect.x + rect.w * x),
    y: clamp01(rect.y + rect.h * y),
  };
}
