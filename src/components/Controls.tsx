import React from 'react';

interface ControlsProps {
  playing: boolean;
  speed: number;
  closedLoop: boolean;
  isRecording: boolean;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onToggleClosedLoop: () => void;
  onTriggerAnomaly: () => void;
  onReset: () => void;
  onRecord: () => void;
}

const SPEEDS = [0.25, 0.5, 1, 2];

const Controls: React.FC<ControlsProps> = ({
  playing,
  speed,
  closedLoop,
  isRecording,
  onTogglePlay,
  onSetSpeed,
  onToggleClosedLoop,
  onTriggerAnomaly,
  onReset,
  onRecord,
}) => (
  <div className="controls-bar">
    <button className={`control-btn ${playing ? 'active' : ''}`} onClick={onTogglePlay}>
      {playing ? 'Pause' : 'Play'}
    </button>
    {SPEEDS.map((value) => (
      <button
        key={value}
        className={`control-btn speed ${value === speed ? 'active' : ''}`}
        onClick={() => onSetSpeed(value)}
      >
        {value}x
      </button>
    ))}
    <button className={`control-btn ${closedLoop ? 'active' : ''}`} onClick={onToggleClosedLoop}>
      Closed Loop: {closedLoop ? 'ON' : 'OFF'}
    </button>
    <button className="control-btn accent" onClick={onTriggerAnomaly}>
      Trigger Anomaly
    </button>
    <button className="control-btn" onClick={onReset}>
      Reset
    </button>
    <button className={`control-btn ${isRecording ? 'recording' : ''}`} onClick={onRecord}>
      {isRecording ? 'Recording...' : 'Record'}
    </button>
  </div>
);

export default Controls;
