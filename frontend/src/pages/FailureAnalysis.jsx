import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  Zap,
  Info,
  RotateCcw
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function FailureAnalysis() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [triggerSuccess, setTriggerSuccess] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts();
      if (res && res.data) {
        setAlerts(res.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.getAlerts();
        if (isMounted && res && res.data) {
          setAlerts(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to fetch alerts');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.resolveAlert(id);
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all security alerts?')) return;
    try {
      await api.clearAlerts();
      fetchAlerts();
    } catch (err) {
      alert(err.message);
    }
  };

  // Trigger test repeated failures (CO4 verification)
  const handleSimulateRepeatedFailure = async () => {
    setTriggerLoading(true);
    setTriggerSuccess(null);
    setError(null);
    try {
      const targetHost = 'victim-test-' + Math.floor(Math.random() * 900 + 100) + '.net';
      const targetPort = 3306;

      // Execute 3 consecutive failed attempts
      for (let i = 1; i <= 3; i++) {
        await api.simulatorConnect({
          hostname: targetHost,
          port: targetPort,
          scenario: 'CONNECTION_REFUSED'
        });
      }

      setTriggerSuccess(`Simulated 3 consecutive failed TCP handshakes on ${targetHost}:${targetPort}. Node.js EventEmitter detected the pattern and generated a SecurityAlert!`);
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'Failed to trigger repeated failures');
    } finally {
      setTriggerLoading(false);
    }
  };

  if (loading && alerts.length === 0) {
    return <LoadingSpinner text="Analyzing failure telemetry and EventEmitter alerts..." />;
  }

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div>
      {/* CO4 Technical Architecture Explanation */}
      <div className="notice-box">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Full-Stack Architecture & Event-Driven Processing (CO4):</strong> The backend implements a specialized <span style={{ fontFamily: 'var(--font-mono)' }}>FailureAnalysisEngine</span> extending Node.js <span style={{ fontFamily: 'var(--font-mono)' }}>EventEmitter</span>. When client connection attempts are processed, events (<span style={{ fontFamily: 'var(--font-mono)' }}>connection:failed, connection:timeout, fsm:invalid_transition</span>) are dispatched to registered listeners. A sliding window monitors consecutive failure frequency ($\ge 3$ within 60s) to automatically trigger security alerts and persist them to MongoDB.
        </div>
      </div>

      {triggerSuccess && (
        <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle size={18} />
          <span style={{ fontSize: '0.88rem' }}>{triggerSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Engine Metrics & Test Trigger Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <ShieldAlert size={18} style={{ color: 'var(--danger)' }} />
              Failure Detector Engine Status
            </h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Live sliding window parameters and anomaly detection rules
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleSimulateRepeatedFailure}
              disabled={triggerLoading}
              title="Executes 3 rapid failed handshakes on a target to trigger EventEmitter"
            >
              <Zap size={15} />
              <span>{triggerLoading ? 'Simulating Failures...' : 'Test Repeated Failure Trigger (3x)'}</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleClearAll}
              disabled={alerts.length === 0}
            >
              <RotateCcw size={15} />
              <span>Clear Alerts</span>
            </button>
          </div>
        </div>

        {/* Detector Rule Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Consecutive Threshold</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.2rem' }}>3 Failures</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trigger condition for high alert</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Sliding Window Duration</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '0.2rem' }}>60 Seconds</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Velocity monitoring period</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Active Alerts</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: activeAlertsCount > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.2rem' }}>
              {activeAlertsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unresolved security incidents</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Detection Mechanisms</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.35rem' }}>EventEmitter + Callback</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asynchronous event architecture</div>
          </div>
        </div>
      </div>

      {/* Security Alerts List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Security & Failure Alerts (Stored in MongoDB)</h2>
        <p className="card-subtitle">
          Incidents generated by repeated connection failures, timeouts, and unexpected FSM transitions
        </p>

        {alerts.length === 0 ? (
          <EmptyState
            title="No Active Alerts"
            message="No repeated failures or protocol violations detected. System is running cleanly."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Alert Type</th>
                  <th>Target Host</th>
                  <th>Failures</th>
                  <th>Message / Diagnostics</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alt) => (
                  <tr key={alt._id}>
                    <td>
                      <StatusBadge status={alt.severity} />
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {alt.alertType}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontWeight: 600 }}>
                      {alt.hostname}:{alt.port}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--danger)', fontWeight: 800 }}>
                      {alt.consecutiveFailures}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 300 }}>
                      {alt.message}
                    </td>
                    <td>
                      <span className={`badge ${alt.status === 'ACTIVE' ? 'badge-danger' : (alt.status === 'ACKNOWLEDGED' ? 'badge-warning' : 'badge-success')}`}>
                        {alt.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(alt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {alt.status === 'ACTIVE' && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={() => handleAcknowledge(alt._id)}
                            title="Acknowledge alert"
                          >
                            Ack
                          </button>
                        )}
                        {alt.status !== 'RESOLVED' && (
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                            onClick={() => handleResolve(alt._id)}
                            title="Mark resolved"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Network Failure Modes Reference (CN Guide) */}
      <div className="card">
        <h2 className="card-title">Computer Networks (CN) Failure Taxonomy</h2>
        <p className="card-subtitle">Formal network protocol analysis of connection failure modes</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>
              1. ECONNREFUSED (Active TCP Reset)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Occurs when the client SYN arrives at the destination operating system, but no application process has bound or called <code style={{ color: 'var(--primary)' }}>listen()</code> on the specified TCP port. The kernel immediately replies with a <strong style={{ color: '#fff' }}>[RST, ACK]</strong> packet with RST flag set, terminating the connection without timeout delay.
            </p>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.5rem' }}>
              2. ETIMEDOUT (SYN Drop & RTO Backoff)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Occurs when the SYN packet is silently dropped by an intermediate router, network congestion, or stateful firewall drop rule. Because no response arrives, the client enters exponential backoff (<span style={{ fontFamily: 'var(--font-mono)' }}>RTO = 1s, 2s, 4s...</span>) until the maximum SYN retry limit is reached, generating an <strong style={{ color: '#fff' }}>ETIMEDOUT</strong> exception.
            </p>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--info)', marginBottom: '0.5rem' }}>
              3. UNEXPECTED_STATE_TRANSITION
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Occurs when an incoming packet flag or application action violates the current automaton state constraints (e.g., transmitting payload data while the socket is still in <span style={{ fontFamily: 'var(--font-mono)' }}>CONNECTING</span> or <span style={{ fontFamily: 'var(--font-mono)' }}>CLOSED</span>). The FSM rejects the illegal transition and logs a critical protocol exception.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
