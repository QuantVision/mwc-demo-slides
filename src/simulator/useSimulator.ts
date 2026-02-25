import { useCallback, useEffect, useRef } from 'react';
import type { TopologyEvent, TopologyToken } from '../types';
import type { CaseStudyId } from '../caseStudies/config';
import { CaseStudy1Simulator } from './caseStudy1';

interface UseSimulatorOptions {
  caseStudyId: CaseStudyId;
  playing: boolean;
  speed: number;
  closedLoop: boolean;
  onEvent: (event: TopologyEvent) => void;
  onToken: (token: TopologyToken) => void;
}

export function useSimulator({
  caseStudyId,
  playing,
  speed,
  closedLoop,
  onEvent,
  onToken,
}: UseSimulatorOptions) {
  const simulatorRef = useRef<CaseStudy1Simulator | null>(null);
  const playingRef = useRef(playing);

  useEffect(() => {
    simulatorRef.current = new CaseStudy1Simulator({ caseStudyId, onEvent, onToken });
    return () => simulatorRef.current?.stop();
  }, [caseStudyId, onEvent, onToken]);

  useEffect(() => {
    const sim = simulatorRef.current;
    playingRef.current = playing;
    if (!sim) return;
    if (playing) sim.start();
    else sim.stop();
  }, [playing]);

  useEffect(() => {
    simulatorRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    simulatorRef.current?.setClosedLoop(closedLoop);
  }, [closedLoop]);

  const triggerAnomaly = useCallback(() => {
    simulatorRef.current?.triggerAnomaly();
  }, []);

  const resetSimulator = useCallback(() => {
    simulatorRef.current?.reset();
    if (playingRef.current) simulatorRef.current?.start();
  }, []);

  return { triggerAnomaly, resetSimulator };
}
