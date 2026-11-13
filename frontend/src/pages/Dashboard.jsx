import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function Dashboard() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res && res.data) {
        setStatsData(res.data);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const res = await api.getDashboardStats();
        if (isMounted && res && res.data) {
          setStatsData(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to fetch dashboard metrics.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && !statsData) {
    return <LoadingSpinner text="Connecting to backend and aggregating MongoDB telemetry..." />;
  }

  if (error && !statsData) {
    return (
      <div className="card" style={{ borderColor: 'var(--danger-border)', textAlign: 'center', padding: '2.5rem' }}>
        <XCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>Failed to Load Dashboard Data</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadData}>Retry Connection</button>
      </div>
    );
  }

  const { metrics, statusDistribution, failureBreakdown, timelineData, recentConnections, recentEvents, activeAlerts } = statsData || {
    metrics: {},
    statusDistribution: [],
    failureBreakdown: [],
    timelineData: [],
    recentConnections: [],
    recentEvents: [],
    activeAlerts: []
  };

  const statCards = [
    {
      label: 'Total Attempts',
      value: metrics.totalAttempts || 0,
      icon: Activity,
      accent: '#06b6d4',
      sub: 'All recorded TCP sessions'
    },
    {
      label: 'Successful',
      value: metrics.successfulConnections || 0,
      icon: CheckCircle2,
      accent: '#10b981',
      sub: `${metrics.successRate || 0}% overall success`
    },
    {
      label: 'Failed (RST/Refused)',
      value: metrics.failedConnections || 0,
      icon: XCircle,
      accent: '#ef4444',
      sub: 'Port closed or reset'
    },
    {
      label: 'Timeouts (RTO)',
      value: metrics.timeoutConnections || 0,
      icon: Clock,
      accent: '#f59e0b',
      sub: 'SYN unacknowledged'
    },
    {
      label: 'Success Rate',
      value: `${metrics.successRate || 0}%`,
      icon: TrendingUp,
      accent: '#10b981',
      sub: `Failure rate: ${metrics.failureRate || 0}%`
    },
    {
      label: 'Avg Handshake Latency',
      value: `${metrics.avgLatency || 0} ms`,
      icon: ArrowUpRight,
      accent: '#8b5cf6',
      sub: '3-way handshake roundtrip'
    }
  ];

  return (
    <div>
      {/* Database Mode Transparency Banner */}
      {statsData?.dbStatus && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: statsData.dbStatus.connected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: `1px solid ${statsData.dbStatus.connected ? 'var(--success-border)' : 'var(--warning-border)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statsData.dbStatus.connected ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block'
            }}></span>
            <strong style={{ color: statsData.dbStatus.connected ? '#86efac' : '#fcd34d' }}>
              {statsData.dbStatus.connected
                ? `MongoDB Connected: mongodb://${statsData.dbStatus.host}:${statsData.dbStatus.port}/${statsData.dbStatus.name}`
                : 'Demo Mode – In-Memory Storage Active'}
            </strong>
            <span style={{ color: 'var(--text-muted)' }}>
              {statsData.dbStatus.connected
                ? '• Persistent collections: ConnectionAttempt, NetworkEvent, SecurityAlert'
                : '• MongoDB service is offline. Running with resilient in-memory store (session data resets on restart).'}
            </span>
          </div>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            Status Verified: {statsData.dbStatus.timestamp ? new Date(statsData.dbStatus.timestamp).toLocaleTimeString() : 'Active'}
          </span>
        </div>
      )}

      {/* Active Alerts Banner if any */}
      {activeAlerts && activeAlerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />
            <strong style={{ color: '#fca5a5' }}>
              Active Security Alerts Detected ({activeAlerts.length})
            </strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#fee2e2' }}>
            {activeAlerts[0].message}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="stat-card" style={{ '--stat-accent': card.accent }}>
              <div className="stat-header">
                <span className="stat-label">{card.label}</span>
                <div className="stat-icon">
                  <Icon size={18} />
                </div>
              </div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-sub">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Status Distribution Pie Chart */}
        <div className="card">
          <h2 className="card-title">Connection Status Distribution</h2>
          <p className="card-subtitle">Real breakdown of all TCP connection outcomes from MongoDB</p>
          {metrics.totalAttempts === 0 ? (
            <EmptyState title="No Attempt Data" message="Run a simulation or create connection attempts to generate metrics." />
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Latency & Timeline Line Chart */}
        <div className="card">
          <h2 className="card-title">Handshake Latency Trend</h2>
          <p className="card-subtitle">Recent connection RTT roundtrip latency (milliseconds)</p>
          {timelineData.length === 0 ? (
            <EmptyState title="No Timeline Data" message="No recent attempts to plot on timeline." />
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="index" stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Attempt Sequence', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Failure Reasons Bar Chart */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 className="card-title">Failure Modes & Root Causes</h2>
          <p className="card-subtitle">Categorized breakdown of TCP refusal and timeout events</p>
          {failureBreakdown.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', margin: '0 auto 0.75rem' }} />
              <p>No connection failures detected in the database. All connections are healthy!</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="reason" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="count" name="Failure Incidents" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Attempts & Network Events Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Connections */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Recent Connection Attempts</h2>
          </div>
          {recentConnections.length === 0 ? (
            <EmptyState title="No Connections" message="No recent connection attempts recorded." />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Final State</th>
                    <th>Latency</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConnections.map((conn) => (
                    <tr key={conn._id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {conn.hostname}:{conn.port}
                      </td>
                      <td>
                        <StatusBadge status={conn.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {conn.finalState}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {conn.latencyMs} ms
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(conn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Network Events */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Recent Network Events</h2>
          </div>
          {recentEvents.length === 0 ? (
            <EmptyState title="No Events Logged" message="Network events will stream in when sessions run." />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Flag</th>
                    <th>Event Type</th>
                    <th>Severity</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((evt) => (
                    <tr key={evt._id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700 }}>
                        {evt.flag || '[TCP]'}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {evt.eventType}
                      </td>
                      <td>
                        <StatusBadge status={evt.severity} />
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={evt.description}>
                        {evt.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
