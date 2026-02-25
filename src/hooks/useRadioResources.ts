import { useEffect, useMemo, useRef, useState } from 'react';

export type DeviceKey = 'ue1' | 'ue2' | 'cpe';
export type ScsKhz = 15 | 30;
export type EffSePreset = 'low' | 'med' | 'high';

interface RadioInput {
  ue1DlMbps?: number;
  ue2DlMbps?: number;
  cpeDlMbps?: number;
  anomalyTick: number;
  playing: boolean;
}

interface DeviceRates {
  dlMbps: number;
  ulMbps: number | null;
}

interface DeviceAllocation {
  prbs: number;
  needed: number;
  sharePct: number;
}

export interface RadioResourcesState {
  scsKhz: ScsKhz;
  setScsKhz: (next: ScsKhz) => void;
  effSePreset: EffSePreset;
  setEffSePreset: (next: EffSePreset) => void;
  effSe: number;
  totalPrbs: number;
  capacityPerPrbBps: number;
  throughputs: Record<DeviceKey, DeviceRates>;
  allocations: Record<DeviceKey, DeviceAllocation>;
  history: Record<DeviceKey, number[]>;
  totals: {
    usedPrbs: number;
    freePrbs: number;
    utilizationPct: number;
    totalDlMbps: number;
  };
}

const DEVICE_KEYS: DeviceKey[] = ['ue1', 'ue2', 'cpe'];

const SCS_TO_TOTAL_PRBS: Record<ScsKhz, number> = {
  15: 106,
  30: 51,
};

const EFF_SE_PRESETS: Record<EffSePreset, number> = {
  low: 1.5,
  med: 3.0,
  high: 5.0,
};

const OVERHEAD = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function fallbackRate(key: DeviceKey): number {
  if (key === 'ue1') return 36;
  if (key === 'ue2') return 20;
  return 72;
}

function getRange(key: DeviceKey): { min: number; max: number } {
  if (key === 'ue1') return { min: 10, max: 60 };
  if (key === 'ue2') return { min: 5, max: 40 };
  return { min: 20, max: 120 };
}

function toNeededPrbs(dlMbps: number, capacityPerPrbBps: number): number {
  if (dlMbps <= 0 || capacityPerPrbBps <= 0) return 0;
  const dlBps = dlMbps * 1_000_000;
  return Math.ceil(dlBps / capacityPerPrbBps);
}

function normalizeAllocations(prbsNeeded: number[], totalPrbs: number): number[] {
  const sumNeeded = prbsNeeded.reduce((acc, value) => acc + value, 0);
  if (sumNeeded <= totalPrbs) return [...prbsNeeded];
  if (sumNeeded === 0 || totalPrbs <= 0) return prbsNeeded.map(() => 0);

  const raw = prbsNeeded.map((needed) => (needed / sumNeeded) * totalPrbs);
  const floors = raw.map((value) => Math.floor(value));
  let remaining = totalPrbs - floors.reduce((acc, value) => acc + value, 0);

  const ranked = raw
    .map((value, index) => ({ index, frac: value - floors[index], needed: prbsNeeded[index] }))
    .sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (b.needed !== a.needed) return b.needed - a.needed;
      return a.index - b.index;
    });

  const alloc = [...floors];
  let ptr = 0;
  while (remaining > 0 && ranked.length > 0) {
    alloc[ranked[ptr % ranked.length].index] += 1;
    ptr += 1;
    remaining -= 1;
  }

  return alloc;
}

export function useRadioResources(input: RadioInput): RadioResourcesState {
  const [scsKhz, setScsKhz] = useState<ScsKhz>(30);
  const [effSePreset, setEffSePreset] = useState<EffSePreset>('med');
  const [simDl, setSimDl] = useState<Record<DeviceKey, number>>({ ue1: 36, ue2: 20, cpe: 72 });
  const [history, setHistory] = useState<Record<DeviceKey, number[]>>({
    ue1: Array(60).fill(36),
    ue2: Array(60).fill(20),
    cpe: Array(60).fill(72),
  });

  const anomalyUntilRef = useRef(0);
  const lastAnomalyTickRef = useRef<number | null>(null);
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (lastAnomalyTickRef.current === null) {
      lastAnomalyTickRef.current = input.anomalyTick;
      return;
    }
    if (lastAnomalyTickRef.current === input.anomalyTick) return;
    lastAnomalyTickRef.current = input.anomalyTick;
    anomalyUntilRef.current = Date.now() + 10_000;
  }, [input.anomalyTick]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!inputRef.current.playing) return;

      const now = Date.now();
      const anomalyActive = now < anomalyUntilRef.current;

      setSimDl((prev) => {
        const next: Record<DeviceKey, number> = { ...prev };

        DEVICE_KEYS.forEach((key) => {
          const range = getRange(key);
          const fromInput =
            key === 'ue1'
              ? inputRef.current.ue1DlMbps
              : key === 'ue2'
                ? inputRef.current.ue2DlMbps
                : inputRef.current.cpeDlMbps;

          const usingInput = Number.isFinite(fromInput);
          const base = usingInput ? (fromInput as number) : prev[key] || fallbackRate(key);
          const jitter = key === 'cpe' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 3;

          let candidate = base + jitter;
          if (anomalyActive && !usingInput) {
            if (key === 'ue1') candidate *= 0.82;
            if (key === 'ue2') candidate *= 1.18;
          }

          next[key] = usingInput
            ? clamp(round1(candidate), 0, 400)
            : clamp(round1(candidate), range.min, range.max);
        });

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setHistory((prev) => {
      const next: Record<DeviceKey, number[]> = {
        ue1: [...prev.ue1, simDl.ue1].slice(-60),
        ue2: [...prev.ue2, simDl.ue2].slice(-60),
        cpe: [...prev.cpe, simDl.cpe].slice(-60),
      };
      return next;
    });
  }, [simDl]);

  const effSe = EFF_SE_PRESETS[effSePreset];
  const totalPrbs = SCS_TO_TOTAL_PRBS[scsKhz];

  const capacityPerPrbBps = useMemo(() => {
    const rbBandwidthHz = 12 * scsKhz * 1000;
    return effSe * rbBandwidthHz * (1 - OVERHEAD);
  }, [effSe, scsKhz]);

  const throughputs = useMemo<Record<DeviceKey, DeviceRates>>(() => {
    return {
      ue1: { dlMbps: simDl.ue1, ulMbps: null },
      ue2: { dlMbps: simDl.ue2, ulMbps: null },
      cpe: { dlMbps: simDl.cpe, ulMbps: null },
    };
  }, [simDl]);

  const allocations = useMemo<Record<DeviceKey, DeviceAllocation>>(() => {
    const needed = DEVICE_KEYS.map((key) => toNeededPrbs(throughputs[key].dlMbps, capacityPerPrbBps));
    const normalized = normalizeAllocations(needed, totalPrbs);

    return {
      ue1: {
        needed: needed[0],
        prbs: normalized[0],
        sharePct: totalPrbs > 0 ? (normalized[0] / totalPrbs) * 100 : 0,
      },
      ue2: {
        needed: needed[1],
        prbs: normalized[1],
        sharePct: totalPrbs > 0 ? (normalized[1] / totalPrbs) * 100 : 0,
      },
      cpe: {
        needed: needed[2],
        prbs: normalized[2],
        sharePct: totalPrbs > 0 ? (normalized[2] / totalPrbs) * 100 : 0,
      },
    };
  }, [capacityPerPrbBps, throughputs, totalPrbs]);

  const totals = useMemo(() => {
    const usedPrbs = allocations.ue1.prbs + allocations.ue2.prbs + allocations.cpe.prbs;
    const freePrbs = Math.max(0, totalPrbs - usedPrbs);
    const utilizationPct = totalPrbs > 0 ? (usedPrbs / totalPrbs) * 100 : 0;

    return {
      usedPrbs,
      freePrbs,
      utilizationPct,
      totalDlMbps: throughputs.ue1.dlMbps + throughputs.ue2.dlMbps + throughputs.cpe.dlMbps,
    };
  }, [allocations, throughputs, totalPrbs]);

  return {
    scsKhz,
    setScsKhz,
    effSePreset,
    setEffSePreset,
    effSe,
    totalPrbs,
    capacityPerPrbBps,
    throughputs,
    allocations,
    history,
    totals,
  };
}
