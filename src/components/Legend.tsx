import React from 'react';
import type { MsgType } from '../types';
import { MSG_TYPE_COLOR, MSG_TYPE_LABEL } from '../topology/paths';

const ALL_TYPES: MsgType[] = [
  'KPI', 'ANOMALY', 'ENRICH', 'RCA_REQ', 'RCA_RESP',
  'RECO', 'ACTION', 'VALIDATION', 'TICKET',
];

const Legend: React.FC = () => (
  <div style={{
    padding: '10px 14px 12px',
    borderTop: '1px solid #1E3A5F',
    flexShrink: 0,
  }}>
    <div style={{
      fontSize: 9.5,
      fontWeight: 700,
      color: '#4A7AAF',
      letterSpacing: '0.08em',
      marginBottom: 8,
      fontFamily: 'Inter,Segoe UI,sans-serif',
    }}>
      MESSAGE TYPES
    </div>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '5px 10px',
    }}>
      {ALL_TYPES.map((mt) => (
        <div key={mt} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Token circle preview */}
          <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
            <circle cx={7} cy={7} r={6} fill="#0B1A2B" />
            <circle cx={7} cy={7} r={6} fill="none" stroke={MSG_TYPE_COLOR[mt]} strokeWidth={1.5} />
            <circle cx={7} cy={7} r={3} fill={MSG_TYPE_COLOR[mt]} />
          </svg>
          <span style={{
            fontSize: 9.5,
            color: MSG_TYPE_COLOR[mt],
            fontFamily: 'Inter,Segoe UI,sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {MSG_TYPE_LABEL[mt]}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default Legend;
