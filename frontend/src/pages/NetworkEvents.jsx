import React, { useState, useEffect } from 'react';
import {
  Activity,
  Eye,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function NetworkEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await api.getEvents(params);
      if (res && res.data) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch network events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const params = { limit: 100 };
        if (eventTypeFilter) params.eventType = eventTypeFilter;
        if (severityFilter) params.severity = severityFilter;

        const res = await api.getEvents(params);
        if (isMounted && res && res.data) {
          setEvents(res.data);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [eventTypeFilter, severityFilter]);

  if (loading && events.length === 0) {
    return <LoadingSpinner text="Streaming network packet events from MongoDB..." />;
  }

  return (
    <div>
      {/* Filter and Controls Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              Network Protocol Event Audit Stream
            </h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Granular record of all synthesized TCP segments, handshakes, retransmissions, and state changes
            </p>
          </div>

          <button className="btn btn-secondary" onClick={fetchEvents}>
            <RefreshCw size={14} />
            <span>Refresh Events</span>
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Event Type:</span>
            <select
              className="form-select"
              style={{ width: '220px' }}
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
            >
              <option value="">All Event Types</option>
              <option value="HANDSHAKE_SYN">HANDSHAKE_SYN</option>
              <option value="HANDSHAKE_SYN_ACK">HANDSHAKE_SYN_ACK</option>
              <option value="HANDSHAKE_ACK">HANDSHAKE_ACK</option>
              <option value="DATA_TRANSFER">DATA_TRANSFER</option>
              <option value="RST_PACKET_RECEIVED">RST_PACKET_RECEIVED</option>
              <option value="TIMEOUT_EVENT">TIMEOUT_EVENT</option>
              <option value="PACKET_RETRANSMISSION">PACKET_RETRANSMISSION</option>
              <option value="STATE_TRANSITION">STATE_TRANSITION</option>
              <option value="ALERT_GENERATED">ALERT_GENERATED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Severity:</span>
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="card">
        {events.length === 0 ? (
          <EmptyState
            title="No Network Events Found"
            message="No events match the selected filters. Trigger simulator actions to generate real-time events."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Flag</th>
                  <th>Event Type</th>
                  <th>Source</th>
                  <th>Endpoint</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt._id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {evt.flag || '[TCP]'}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {evt.eventType}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {evt.source || 'CLIENT'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                      {evt.hostname}:{evt.port}
                    </td>
                    <td>
                      <StatusBadge status={evt.severity} />
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={evt.description}>
                      {evt.description}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => setSelectedEvent(evt)}
                        title="View Packet Headers"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Inspect Network Event</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>EVENT TYPE</span>
                  <div style={{ fontWeight: 700 }}>{selectedEvent.eventType}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SEVERITY</span>
                  <div><StatusBadge status={selectedEvent.severity} /></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>FLAG</span>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700 }}>{selectedEvent.flag}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SOURCE</span>
                  <div>{selectedEvent.source}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SEQUENCE NUMBER (SEQ)</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedEvent.sequenceNumber || 0}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ACKNOWLEDGMENT NUMBER (ACK)</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedEvent.ackNumber || 0}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>FULL DESCRIPTION</span>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>{selectedEvent.description}</div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Target: {selectedEvent.hostname}:{selectedEvent.port}
                <br />
                Logged At: {new Date(selectedEvent.timestamp).toLocaleString()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
