import React from 'react';
import type { TopologyEvent } from '../types';
import { MSG_TYPE_COLOR, MSG_TYPE_LABEL } from '../topology/paths';

interface EventsPaneProps {
  events: TopologyEvent[];
  tracePrefix?: string;
}

const STATUS_ICON: Record<string, string> = {
  ok: 'OK',
  warn: 'WARN',
  fail: 'FAIL',
};

const STATUS_COLOR: Record<string, string> = {
  ok: '#43C38F',
  warn: '#E0A840',
  fail: '#E05050',
};

function displayTrace(traceId: string, prefix?: string): string {
  if (!prefix) return traceId;
  return traceId.replace(/^CS\d+/, prefix);
}

const EventsPane: React.FC<EventsPaneProps> = ({ events, tracePrefix }) => {
  return (
    <section className="dashboard-pane events-pane">
      <header className="pane-header">
        <h3 className="pane-title">Event/Signalling Pane</h3>
        <span className="pane-state">{events.length} / 50</span>
      </header>

      <div className="pane-body events-pane-body">
        {events.length === 0 && <div className="events-empty">Waiting for telemetry events...</div>}

        {events.map((event, index) => {
          const isAnomalyWarning = event.msg_type === 'ANOMALY';
          return (
            <div
              key={`${event.trace_id}-${event.msg_type}-${event.ts}-${index}`}
              className={`event-row ${isAnomalyWarning ? 'warning' : ''}`}
            >
              <div className="event-top">
                <span className="event-time">{new Date(event.ts).toTimeString().slice(0, 8)}</span>
                <span className="event-type" style={{ color: MSG_TYPE_COLOR[event.msg_type] }}>
                  {event.msg_type}
                </span>
                <span className="event-status" style={{ color: STATUS_COLOR[event.status] }}>
                  {STATUS_ICON[event.status]}
                </span>
              </div>

              <div className="event-mid">
                <span>{MSG_TYPE_LABEL[event.msg_type]}</span>
                <span>
                  {event.from} -&gt; {event.to}
                </span>
              </div>

              <div className="event-bottom">
                <span>{displayTrace(event.trace_id, tracePrefix)}</span>
                {event.details.cell && <span>Cell {event.details.cell}</span>}
                {event.details.ue && <span>{event.details.ue}</span>}
                {event.details.kpi?.prb_drop !== undefined && <span>PRB↓{event.details.kpi.prb_drop}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default EventsPane;
