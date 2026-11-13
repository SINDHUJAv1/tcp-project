import React, { useState, useEffect } from 'react';
import {
  Play,
  Send,
  Clock,
  Square,
  RotateCcw,
  Info,
  Server,
  Laptop,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

const SCENARIOS = [
  { id: 'NORMAL_HANDSHAKE', name: 'Standard 3-Way Handshake (Normal Success)', desc: 'SYN -> SYN-ACK -> ACK. Channel opens in ESTABLISHED state.' },
  { id: 'CONNECTION_REFUSED', name: 'Connection Refused (ECONNREFUSED / RST)', desc: 'Port closed on target host. Peer returns TCP [RST, ACK].' },
  { id: 'TIMEOUT_DROP', name: 'Packet Drop & Retransmission Timeout (ETIMEDOUT)', desc: 'SYN dropped by firewall/network blackhole. RTO exponential backoff fails.' },
  { id: 'PACKET_LOSS_RETRANSMIT', name: 'Packet Loss with Retransmission Recovery', desc: 'Initial SYN lost; second SYN retransmission succeeds.' }
];

const PRESETS = [
  { host: 'api.velalar.edu', port: 443 },
  { host: 'localhost', port: 8080 },
  { host: 'db.internal.local', port: 27017 },
  { host: 'cloud-gateway.net', port: 80 }
];

export default function ConnectionSimulator() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form inputs
  const [hostname, setHostname] = useState('api.velalar.edu');
  const [port, setPort] = useState('443');
  const [scenario, setScenario] = useState('NORMAL_HANDSHAKE');
  const [latencyMs, setLatencyMs] = useState(30);
  const [dataPayload, setDataPayload] = useState('GET /api/v1/telemetry HTTP/1.1\r\nHost: api.velalar.edu\r\n\r\n');
  const [showDataModal, setShowDataModal] = useState(false);

  // Packet Inspector Modal
  const [selectedPacket, setSelectedPacket] = useState(null);

  // Sliding Window State
  const [windowState, setWindowState] = useState(null);
  const [windowLoading, setWindowLoading] = useState(false);

  // Load initial session & sliding window state
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [res, winRes] = await Promise.all([
          api.getSimulatorSession(),
          api.getSlidingWindow()
        ]);

        if (isMounted) {
          if (res && res.data) {
            setSession(res.data);
            if (res.data.hostname) setHostname(res.data.hostname);
            if (res.data.port) setPort(String(res.data.port));
          }
          if (winRes && winRes.data) {
            setWindowState(winRes.data);
          }
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load simulator session.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulatorConnect({
        hostname: hostname.trim(),
        port: Number(port),
        scenario,
        latencyMs: Number(latencyMs)
      });
      if (res && res.data) {
        setSession(res.data.session);
        setSuccessMsg(`Simulated TCP connect executed in scenario: ${scenario}`);
      }
    } catch (err) {
      setError(err.message || 'Simulation connect error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendData = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulatorSendData({ payload: dataPayload });
      if (res && res.data) {
        setSession(res.data.session);
        setShowDataModal(false);
        setSuccessMsg('TCP data segment transmitted and acknowledged with valid 16-bit checksum.');
      }
    } catch (err) {
      setError(err.message || 'Simulation send data error');
    } finally {
      setActionLoading(false);
    }
  };

  // Packet Corruption Simulation Action
  const handleCorruptPacket = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulatorCorruptPacket({});
      if (res && res.data) {
        setSession(res.data.session);
        setSelectedPacket(res.data.corruptedPacket);
        setError('Packet Corruption Simulated! 1-bit/byte noise injected in transit: Checksum mismatch detected. Segment dropped.');
      }
    } catch (err) {
      setError(err.message || 'Simulation corruption error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWait = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulatorWait({ durationMs: 1000 });
      if (res && res.data) {
        setSession(res.data.session);
        setSuccessMsg('TCP Keep-Alive idle probe transmitted.');
      }
    } catch (err) {
      setError(err.message || 'Simulation wait error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.simulatorDisconnect();
      if (res && res.data) {
        setSession(res.data.session);
        setSuccessMsg('TCP 4-way handshake teardown finalized gracefully.');
      }
    } catch (err) {
      setError(err.message || 'Simulation disconnect error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    setSelectedPacket(null);
    try {
      const res = await api.simulatorReset();
      if (res && res.data) {
        setSession(res.data.session);
        setSuccessMsg('TCP simulation context reset to idle Closed state.');
      }
    } catch (err) {
      setError(err.message || 'Simulation reset error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Sliding Window Actions ---
  const handleWinSend = async (bytes = 512) => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowSend(bytes);
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  const handleWinAck = async () => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowAck();
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  const handleWinFill = async () => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowFillBuffer();
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  const handleWinProbe = async () => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowProbe();
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  const handleWinFree = async (bytes = 2048) => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowFreeBuffer(bytes);
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  const handleWinReset = async () => {
    setWindowLoading(true);
    setError(null);
    try {
      const res = await api.slidingWindowReset();
      if (res && res.data) setWindowState(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWindowLoading(false);
    }
  };

  if (loading && !session) {
    return <LoadingSpinner text="Initializing TCP Simulation Engine & Flow Control..." />;
  }

  const allowed = session?.allowedActions || {
    canConnect: true,
    canSendData: false,
    canWait: false,
    canDisconnect: false,
    canReset: true
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Educational Disclaimer Banner */}
      <div className="notice-box">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong>Educational TCP Protocol Simulator:</strong> Emulates 3-way handshakes, 16-bit One's Complement Checksums (RFC 793 / RFC 1071), packet corruption detection, sliding window flow control (`rwnd`), and Zero Window Probing without opening real raw socket interfaces.
        </div>
      </div>

      {/* Global Status / Error Message */}
      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.88rem' }}>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.88rem' }}>{successMsg}</span>
        </div>
      )}

      {/* Simulation Controls Panel */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title">TCP Protocol Scenario Controller</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Configure network socket parameters, protocol scenarios, and initiate live TCP exchanges
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active State:</span>
            <StatusBadge status={session?.state || 'Closed'} />
          </div>
        </div>

        <form onSubmit={handleConnect}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Destination Hostname / IP</label>
              <input
                type="text"
                className="form-input form-mono"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="e.g. api.velalar.edu"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Destination Port</label>
              <input
                type="number"
                className="form-input form-mono"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                min="1"
                max="65535"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Protocol Scenario</label>
              <select
                className="form-select"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Simulated Latency: {latencyMs} ms</label>
              <input
                type="range"
                min="5"
                max="300"
                value={latencyMs}
                onChange={(e) => setLatencyMs(e.target.value)}
                style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '0.25rem' }}>Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}
                onClick={() => {
                  setHostname(p.host);
                  setPort(String(p.port));
                }}
              >
                {p.host}:{p.port}
              </button>
            ))}
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!allowed.canConnect || actionLoading}
            >
              <Play size={16} />
              <span>Connect (SYN)</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={!allowed.canSendData || actionLoading}
              onClick={() => setShowDataModal(true)}
            >
              <Send size={16} />
              <span>Send Data</span>
            </button>

            {/* Packet Corruption Simulation Button */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ borderColor: 'var(--danger-border)', color: '#fca5a5' }}
              disabled={!allowed.canSendData || actionLoading}
              onClick={handleCorruptPacket}
              title="Inject simulated bit-flip/payload corruption and detect checksum mismatch"
            >
              <AlertTriangle size={16} />
              <span>Corrupt Packet</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={!allowed.canWait || actionLoading}
              onClick={handleWait}
            >
              <Clock size={16} />
              <span>Wait (Keep-Alive)</span>
            </button>

            <button
              type="button"
              className="btn btn-danger"
              disabled={!allowed.canDisconnect || actionLoading}
              onClick={handleDisconnect}
            >
              <Square size={16} />
              <span>Disconnect (FIN)</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={actionLoading}
            >
              <RotateCcw size={16} />
              <span>Reset Context</span>
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* PACKET TIMELINE & INSPECTOR TRIGGER */}
      {/* ======================================================== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">Client-Server Communication Timeline</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Chronological sequence of exchanged TCP packets. Click on any packet to inspect 16-bit checksum and pseudo-header fields.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Bytes Sent: <strong style={{ color: 'var(--primary)' }}>{session?.bytesSent || 0} B</strong></span>
            <span>Bytes Recv: <strong style={{ color: 'var(--purple)' }}>{session?.bytesReceived || 0} B</strong></span>
          </div>
        </div>

        <div className="packet-exchange-container">
          {/* Endpoints Header Bar */}
          <div className="endpoints-bar">
            <div className="endpoint-client">
              <Laptop size={18} />
              <span>CLIENT ({session?.clientIp || '192.168.1.105'}:{session?.clientPort || '49152'})</span>
            </div>
            <div className="endpoint-server">
              <span>SERVER ({session?.hostname || hostname}:{session?.port || port})</span>
              <Server size={18} />
            </div>
          </div>

          {/* Packet Rows */}
          {(!session?.packets || session.packets.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
              <p>Socket is currently idle in CLOSED state. Click "Connect (SYN)" above to initiate the 3-way handshake.</p>
            </div>
          ) : (
            <div className="packet-flow-list">
              {session.packets.map((pkt, index) => {
                const isClientToServer = pkt.direction === 'CLIENT_TO_SERVER';
                const isDropped = pkt.status === 'DROPPED';
                const isRejected = pkt.status === 'REJECTED';
                const isCorrupted = pkt.status === 'CORRUPTED';

                return (
                  <div
                    key={pkt.id || index}
                    className="packet-row"
                    onClick={() => setSelectedPacket(pkt)}
                    style={{
                      cursor: 'pointer',
                      borderColor: isCorrupted ? 'var(--danger-border)' : (isDropped ? 'var(--warning-border)' : (isRejected ? 'var(--danger-border)' : undefined)),
                      background: isCorrupted ? 'rgba(239, 68, 68, 0.08)' : undefined
                    }}
                  >
                    <div className={`packet-direction-arrow ${isClientToServer ? 'client-to-server' : 'server-to-client'}`}>
                      {isClientToServer ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    </div>

                    <div className="packet-flag">
                      <span style={{
                        color: isCorrupted ? 'var(--danger)' : (isDropped ? 'var(--warning)' : (isRejected ? 'var(--danger)' : (isClientToServer ? 'var(--primary)' : 'var(--purple)')))
                      }}>
                        {pkt.flag}
                      </span>
                    </div>

                    <div className="packet-info">
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{pkt.details}</span>
                        {isCorrupted && (
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#fca5a5' }}>
                            CHECKSUM MISMATCH
                          </span>
                        )}
                      </div>
                      <div className="packet-meta">
                        <span>Seq={pkt.seq}</span>
                        <span>Ack={pkt.ack}</span>
                        <span>Win={pkt.windowSize || 64240}B</span>
                        <span>Len={pkt.payloadSize || 0}B</span>
                        <span style={{ color: isCorrupted ? '#fca5a5' : 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          Checksum={pkt.checksumHex || '0x0000'} {pkt.checksumStatus === 'CORRUPTED' ? '✗' : '✓'}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>{new Date(pkt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedPacket(pkt); }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                      <StatusBadge status={pkt.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DYNAMIC SLIDING WINDOW FLOW CONTROL (rwnd) */}
      {/* ======================================================== */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 className="card-title">Dynamic TCP Sliding Window Flow Control (rwnd)</h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Interactive receiver buffer management, advertised window tracking, Zero Window exhaustion, and Zero Window Probes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Advertised Window (`rwnd`):</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 800,
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: windowState?.isZeroWindow ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${windowState?.isZeroWindow ? 'var(--danger-border)' : 'var(--success-border)'}`,
              color: windowState?.isZeroWindow ? '#fca5a5' : '#86efac'
            }}>
              {windowState?.advertisedWindow || 0} B {windowState?.isZeroWindow ? '[ZERO WINDOW]' : ''}
            </span>
          </div>
        </div>

        {/* Sliding Window Track Visualizer */}
        <div style={{ padding: '1.25rem', background: '#090d16', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
            <span>Receiver Buffer Capacity: 4096 Bytes</span>
            <span>Buffer Utilization: {windowState?.receiverBufferUsed || 0} / 4096 B ({windowState?.bufferUtilizationPct || 0}%)</span>
          </div>

          {/* Visual Track Bar */}
          <div style={{ height: '24px', width: '100%', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', position: 'relative', border: '1px solid var(--border-color)' }}>
            {/* Filled / Used Buffer portion */}
            <div
              style={{
                width: `${windowState?.bufferUtilizationPct || 0}%`,
                background: windowState?.isZeroWindow ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>

          {/* Window Legend Indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Bytes In-Flight</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                {windowState?.inFlightBytes || 0} B
              </div>
            </div>

            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Sender Usable Window</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#86efac' }}>
                {windowState?.usableWindow || 0} B
              </div>
            </div>

            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Next Sequence #</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {windowState?.clientSeq || 1000}
              </div>
            </div>

            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Acknowledged Ack #</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {windowState?.serverAck || 1000}
              </div>
            </div>
          </div>
        </div>

        {/* Sliding Window Control Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            disabled={windowLoading || windowState?.usableWindow === 0}
            onClick={() => handleWinSend(512)}
          >
            Send 512 Bytes
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
            disabled={windowLoading || (windowState?.inFlightBytes === 0)}
            onClick={handleWinAck}
          >
            Send ACK (Slide Window)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }}
            disabled={windowLoading || windowState?.isZeroWindow}
            onClick={handleWinFill}
            title="Saturate receiver buffer to trigger TCP Zero Window"
          >
            Fill Buffer (Trigger Zero Window)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderColor: 'var(--warning-border)', color: '#fcd34d' }}
            disabled={windowLoading || !windowState?.isZeroWindow}
            onClick={handleWinProbe}
            title="Transmit 1-byte probe segment to query receiver buffer availability"
          >
            Send Zero Window Probe (ZWP)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderColor: 'var(--success-border)', color: '#86efac' }}
            disabled={windowLoading || windowState?.receiverBufferUsed === 0}
            onClick={() => handleWinFree(2048)}
            title="Simulate application reading 2048B from buffer, sending TCP Window Update"
          >
            Free Buffer (Window Update)
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', marginLeft: 'auto' }}
            disabled={windowLoading}
            onClick={handleWinReset}
          >
            <RotateCcw size={14} />
            <span>Reset Window</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PACKET INSPECTOR MODAL */}
      {/* ======================================================== */}
      {selectedPacket && (
        <div className="modal-overlay" onClick={() => setSelectedPacket(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>TCP Packet Inspector & Checksum Breakdown</h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedPacket(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Checksum Status Header Banner */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                background: selectedPacket.status === 'CORRUPTED' ? 'var(--danger-bg)' : 'var(--success-bg)',
                border: `1px solid ${selectedPacket.status === 'CORRUPTED' ? 'var(--danger-border)' : 'var(--success-border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                {selectedPacket.status === 'CORRUPTED' ? (
                  <XCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: selectedPacket.status === 'CORRUPTED' ? '#fca5a5' : '#86efac' }}>
                    {selectedPacket.status === 'CORRUPTED' ? 'CHECKSUM VERIFICATION FAILED (CORRUPTED)' : 'CHECKSUM VERIFIED (DATA INTEGRITY INTACT)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {selectedPacket.status === 'CORRUPTED'
                      ? 'Receiver computed a checksum mismatch. Segment corrupted in transit and discarded.'
                      : '16-bit One\'s Complement sum over pseudo-header, header, and payload matched.'}
                  </div>
                </div>
              </div>

              {/* 12-Field Packet Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Source Address</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedPacket.srcIp || '192.168.1.105'}:{selectedPacket.srcPort || '49152'}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Destination Address</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedPacket.dstIp || '192.168.10.45'}:{selectedPacket.dstPort || '443'}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Sequence Number (SEQ)</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {selectedPacket.seq}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Acknowledgment Number (ACK)</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: '#86efac' }}>
                    {selectedPacket.ack}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>TCP Control Flags</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--purple)' }}>
                    {selectedPacket.flag}
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Window Size (WIN)</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedPacket.windowSize || 64240} Bytes
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Calculated Checksum</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 800, color: selectedPacket.status === 'CORRUPTED' ? '#fca5a5' : 'var(--primary)' }}>
                    {selectedPacket.checksumHex || '0x0000'} ({selectedPacket.checksumStatus || 'VALID'})
                  </div>
                </div>

                <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payload Size (LEN)</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedPacket.payloadSize || 0} Bytes
                  </div>
                </div>
              </div>

              {/* Pseudo-Header Mathematical Formulation */}
              <div style={{ padding: '0.85rem 1rem', background: '#090d16', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--primary)' }}>RFC 793 / RFC 1071 Checksum Algorithm:</strong>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  1. Sum 16-bit words of Pseudo-Header: Source IP + Dest IP + Protocol (6) + Segment Length (20B + {selectedPacket.payloadSize || 0}B).<br />
                  2. Sum 16-bit words of TCP Header (20 Bytes) with Checksum field initialized to 0.<br />
                  3. Sum 16-bit words of Payload (padded with 0x00 if odd length).<br />
                  4. Fold 32-bit carries: <span style={{ fontFamily: 'var(--font-mono)' }}>sum = (sum & 0xFFFF) + (sum &gt;&gt; 16)</span>.<br />
                  5. One's Complement: <span style={{ fontFamily: 'var(--font-mono)' }}>checksum = ~sum & 0xFFFF</span> $\to$ <strong>{selectedPacket.checksumHex}</strong>.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPacket(null)}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPUTER NETWORKS (CN) THEORY & CURRICULUM SECTION */}
      {/* ======================================================== */}
      <div className="card">
        <h2 className="card-title">Computer Networks (22ITT52) Theoretical Curriculum Guide</h2>
        <p className="card-subtitle">
          Core protocol concepts, layering architecture, connection lifecycle, and reliability mechanisms
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>
              1. TCP/IP vs OSI Layers
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The application operates at Layer 7 (HTTP/JSON). TCP provides Layer 4 (Transport) reliable, in-order byte stream delivery with flow and congestion control, riding over Layer 3 (IP) best-effort packet routing.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--info)', marginBottom: '0.4rem' }}>
              2. 3-Way Handshake & 4-Way Teardown
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Handshake synchronizes sequence numbers: <span style={{ fontFamily: 'var(--font-mono)' }}>SYN (seq=x) → SYN-ACK (seq=y, ack=x+1) → ACK (ack=y+1)</span>. Teardown half-closes gracefully via <span style={{ fontFamily: 'var(--font-mono)' }}>FIN → ACK → FIN → ACK</span>.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.4rem' }}>
              3. TCP Checksum & Pseudo-Header
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The 16-bit 1's complement sum incorporates an IPv4 pseudo-header (Source IP, Destination IP, Protocol 6, TCP length) to protect against misrouted segments delivered to the wrong host or socket.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.4rem' }}>
              4. Sliding Window Flow Control (`rwnd`)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Prevents sender from overwhelming receiver buffer. When buffer fills, receiver advertises <span style={{ fontFamily: 'var(--font-mono)' }}>rwnd = 0</span> (Zero Window). Sender polls using 1-byte Zero Window Probes (ZWP) until Window Update arrives.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--purple)', marginBottom: '0.4rem' }}>
              5. TCP vs UDP Comparison
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              TCP is connection-oriented, reliable, and byte-stream oriented with retransmissions and acknowledgments. UDP is connectionless, unreliable, and message-oriented with lower header overhead and zero handshake delay.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f43f5e', marginBottom: '0.4rem' }}>
              6. Failure Modes (RST vs TIMEOUT)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>ECONNREFUSED</span>: Remote host actively returns a TCP [RST, ACK] segment when no process is listening on the target port. <span style={{ fontFamily: 'var(--font-mono)' }}>ETIMEDOUT</span>: Packets silently dropped by network/firewalls, exhausting retransmission timers.
            </p>
          </div>
        </div>
      </div>

      {/* Send Data Modal */}
      {showDataModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Transmit Application Data</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowDataModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Specify application payload bytes to transmit over established TCP socket:
              </p>
              <div className="form-group">
                <label className="form-label">Payload String / HTTP Request</label>
                <textarea
                  className="form-textarea form-mono"
                  rows={5}
                  value={dataPayload}
                  onChange={(e) => setDataPayload(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDataModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendData} disabled={actionLoading}>
                <Send size={15} />
                <span>Transmit Segment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
