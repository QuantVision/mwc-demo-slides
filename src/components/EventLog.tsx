import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { WorkflowEvent, EventStatus } from '../types';

interface EventLogProps {
  events: WorkflowEvent[];
}

const STATUS_COLOR: Record<EventStatus, string> = {
  ok: '#00C8A0',
  fail: '#E05050',
  warn: '#E0A840',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  ok: 'OK',
  fail: 'FAIL',
  warn: 'WARN',
};

const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const [filterTrace, setFilterTrace] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | EventStatus>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterTrace && !e.trace_id.toLowerCase().includes(filterTrace.toLowerCase())) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterTrace, filterStatus]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [filtered, autoScroll]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#070F1C',
      borderRadius: 6,
      border: '1px solid #1E3A5F',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #1E3A5F',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ color: '#00A6A6', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em' }}>
          LIVE EVENT LOG
        </span>
        <span style={{ color: '#4A7AAF', fontSize: 11, marginLeft: 4 }}>
          {filtered.length} events
        </span>
      </div>

      {/* Filters */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #1E3A5F',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <input
          placeholder="Filter trace_id..."
          value={filterTrace}
          onChange={(e) => setFilterTrace(e.target.value)}
          style={{
            background: '#0F2540',
            border: '1px solid #1E3A5F',
            borderRadius: 4,
            color: '#E8EDF5',
            fontSize: 11,
            padding: '4px 8px',
            outline: 'none',
            flex: 1,
            minWidth: 100,
            fontFamily: 'Inter, Segoe UI, sans-serif',
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | EventStatus)}
          style={{
            background: '#0F2540',
            border: '1px solid #1E3A5F',
            borderRadius: 4,
            color: '#E8EDF5',
            fontSize: 11,
            padding: '4px 6px',
            outline: 'none',
            fontFamily: 'Inter, Segoe UI, sans-serif',
          }}
        >
          <option value="all">All</option>
          <option value="ok">OK</option>
          <option value="warn">WARN</option>
          <option value="fail">FAIL</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A9BBF', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            style={{ accentColor: '#00A6A6' }}
          />
          Auto
        </label>
      </div>

      {/* List */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          fontFamily: 'monospace',
          fontSize: 10.5,
        }}
      >
        {filtered.map((ev, i) => (
          <EventRow key={`${ev.trace_id}-${ev.from_node}-${ev.to_node}-${i}`} event={ev} />
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#4A7AAF', textAlign: 'center', paddingTop: 24, fontSize: 11 }}>
            No events yet…
          </div>
        )}
      </div>
    </div>
  );
};

const EventRow: React.FC<{ event: WorkflowEvent }> = React.memo(({ event }) => {
  const time = new Date(event.ts).toTimeString().slice(0, 8);
  const color = STATUS_COLOR[event.status];

  return (
    <div style={{
      padding: '4px 12px',
      borderBottom: '1px solid #0D2035',
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
      lineHeight: 1.4,
    }}>
      <span style={{ color: '#4A7AAF', flexShrink: 0, fontSize: 10 }}>{time}</span>
      <span style={{
        color,
        flexShrink: 0,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.05em',
        background: color + '20',
        padding: '1px 4px',
        borderRadius: 3,
      }}>
        {STATUS_LABEL[event.status]}
      </span>
      <span style={{ color: '#00A6A6', flexShrink: 0 }}>{event.trace_id}</span>
      <span style={{ color: '#7A9BBF', flexShrink: 0 }}>
        {event.from_node} → {event.to_node}
      </span>
      <span style={{ color: '#4A7AAF', fontSize: 10 }}>
        {event.payload_type}
      </span>
      <span style={{ color: '#2E5A80', marginLeft: 'auto', flexShrink: 0, fontSize: 10 }}>
        {event.latency_ms}ms
      </span>
    </div>
  );
});

EventRow.displayName = 'EventRow';

export default EventLog;
