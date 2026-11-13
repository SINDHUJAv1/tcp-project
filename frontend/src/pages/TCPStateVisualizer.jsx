import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  Table,
  Info,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';

const ALL_STATES = [
  { id: 'Closed', name: 'Closed', type: 'initial', desc: 'Initial quiescent state; socket idle' },
  { id: 'Connecting', name: 'Connecting', type: 'transient', desc: 'SYN sent; awaiting SYN-ACK' },
  { id: 'Established', name: 'Established', type: 'active', desc: 'Channel synchronized; data open' },
  { id: 'Waiting', name: 'Waiting', type: 'teardown', desc: 'FIN transmitted; awaiting peer ACK' },
  { id: 'Terminated', name: 'Terminated', type: 'final', desc: 'Graceful teardown complete' },
  { id: 'Failed', name: 'Failed', type: 'final-error', desc: 'Active RST received or aborted' },
  { id: 'Timeout', name: 'Timeout', type: 'final-error', desc: 'Handshake timer expired' }
];

const ALL_INPUTS = [
  { symbol: 'SYN_SENT', label: 'SYN_SENT - Send SYN initiation packet' },
  { symbol: 'SYN_ACK_RCVD', label: 'SYN_ACK_RCVD - Receive SYN-ACK from server' },
  { symbol: 'ACK_SENT', label: 'ACK_SENT - Send final 3-way handshake ACK' },
  { symbol: 'DATA_TRANSFER', label: 'DATA_TRANSFER - Transmit application data payload' },
  { symbol: 'FIN_SENT', label: 'FIN_SENT - Send FIN teardown request' },
  { symbol: 'FIN_ACK_RCVD', label: 'FIN_ACK_RCVD - Receive peer FIN-ACK' },
  { symbol: 'RST_RCVD', label: 'RST_RCVD - Receive TCP Reset [RST]' },
  { symbol: 'TIMEOUT_TRIGGER', label: 'TIMEOUT_TRIGGER - Retransmission timer expired' },
  { symbol: 'NETWORK_ERROR', label: 'NETWORK_ERROR - Network interface failure' },
  { symbol: 'RETRY_CONNECT', label: 'RETRY_CONNECT - Attempt reconnection' },
  { symbol: 'RESET_FSM', label: 'RESET_FSM - Administrative reset to Closed' }
];

export default function TCPStateVisualizer() {
  const [fsmData, setFsmData] = useState(null);
  const [formalSpec, setFormalSpec] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState('SYN_SENT');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [transitionResult, setTransitionResult] = useState(null);
  const [transitionError, setTransitionError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [stateRes, specRes] = await Promise.all([
          api.getFSMState(),
          api.getFSMSpec()
        ]);
        if (isMounted) {
          if (stateRes && stateRes.data) setFsmData(stateRes.data);
          if (specRes && specRes.data) setFormalSpec(specRes.data);
        }
      } catch (err) {
        if (isMounted) setTransitionError(err.message || 'Failed to fetch FSM state');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTrigger = async (e) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    setTransitionResult(null);
    setTransitionError(null);

    try {
      const res = await api.triggerFSMTransition({ event: selectedEvent });
      if (res && res.data) {
        setFsmData(prev => ({
          ...prev,
          currentState: res.data.currentState,
          allowedTransitions: res.data.allowedTransitions,
          history: [...(prev?.history || []), res.data.transition.record]
        }));
        setTransitionResult(`Transition Successful: ${res.data.transition.fromState} ──(${selectedEvent})──> ${res.data.transition.toState}. ${res.data.transition.description}`);
      }
    } catch (err) {
      setTransitionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    setTransitionResult(null);
    setTransitionError(null);
    try {
      const res = await api.resetFSM();
      if (res && res.data) {
        setFsmData(prev => ({
          ...prev,
          currentState: res.data.currentState,
          allowedTransitions: res.data.allowedTransitions,
          history: res.data.history
        }));
        setTransitionResult('FSM successfully reset to initial Closed state.');
      }
    } catch (err) {
      setTransitionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !fsmData) {
    return <LoadingSpinner text="Loading TCP Automaton State Engine..." />;
  }

  const currentState = fsmData?.currentState || 'Closed';
  const allowedEvents = (fsmData?.allowedTransitions || []).map(t => t.event);

  return (
    <div>
      {/* Overview Notice */}
      <div className="notice-box">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Formal Language & Automata Theory (CO1):</strong> The TCP connection protocol is formally modeled as a Deterministic Finite Automaton (DFA) <span style={{ fontFamily: 'var(--font-mono)' }}>M = (Q, Σ, δ, q0, F)</span>. The interactive tester below executes the actual state-transition logic in JavaScript and strictly rejects illegal transitions according to the transition function δ.
        </div>
      </div>

      {/* State Transitions Node Graph */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title">
              <GitBranch size={18} style={{ color: 'var(--primary)' }} />
              Real-Time TCP State Graph
            </h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Glowing highlighted node indicates the active socket automaton state
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current State:</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 800,
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)'
            }}>
              {currentState}
            </span>
          </div>
        </div>

        {/* Node diagram */}
        <div className="fsm-graph">
          {ALL_STATES.map((state) => {
            const isActive = state.id === currentState;
            return (
              <div key={state.id} className={`fsm-node ${isActive ? 'active' : ''}`}>
                <div className="fsm-node-title">{state.name}</div>
                <div className="fsm-node-desc">{state.desc}</div>
                {state.type === 'initial' && (
                  <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.65rem', background: '#1e293b', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#94a3b8' }}>q₀ (Start)</span>
                )}
                {(state.type === 'final' || state.type === 'final-error') && (
                  <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#fca5a5' }}>F (Final)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Transition Tester */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Interactive State Transition Tester</h2>
        <p className="card-subtitle">
          Test valid and invalid input events against the current state. Invalid transitions will be rejected with formal error diagnostics.
        </p>

        {/* Alert/Error Feedback */}
        {transitionError && (
          <div style={{ padding: '1rem 1.25rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: '#fca5a5', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertOctagon size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Transition Rejected by Automaton:</strong>
              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{transitionError}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#fee2e2' }}>
                Legal input symbols from state <strong style={{ color: '#fff' }}>'{currentState}'</strong>: [ {allowedEvents.join(', ') || 'None (Terminal state)'} ]
              </div>
            </div>
          </div>
        )}

        {transitionResult && (
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: '#86efac', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.88rem' }}>{transitionResult}</span>
          </div>
        )}

        <form onSubmit={handleTrigger} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '280px' }}>
            <label className="form-label">Select Input Symbol (Σ):</label>
            <select
              className="form-select form-mono"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {ALL_INPUTS.map((inp) => {
                const isValidFromCurrent = allowedEvents.includes(inp.symbol);
                return (
                  <option key={inp.symbol} value={inp.symbol}>
                    {inp.label} {isValidFromCurrent ? '✓ (Valid)' : '✗ (Invalid)'}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={actionLoading}
          >
            <Play size={16} />
            <span>Trigger Transition (δ)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={actionLoading}
          >
            <RotateCcw size={16} />
            <span>Reset FSM</span>
          </button>
        </form>
      </div>

      {/* State-Transition Table & History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Transition Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <Table size={18} style={{ color: 'var(--primary)' }} />
              State-Transition Table δ(State, Symbol)
            </h2>
          </div>
          <div className="table-responsive" style={{ maxHeight: '380px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Current State (Q)</th>
                  <th>Input Symbol (Σ)</th>
                  <th>Next State δ(q, σ)</th>
                </tr>
              </thead>
              <tbody>
                {formalSpec?.transitionTable ? (
                  Object.entries(formalSpec.transitionTable).flatMap(([state, transitions]) =>
                    Object.entries(transitions).map(([symbol, target]) => {
                      const isCurrentStateRow = state === currentState;
                      return (
                        <tr
                          key={`${state}-${symbol}`}
                          style={{
                            backgroundColor: isCurrentStateRow ? 'rgba(6, 182, 212, 0.08)' : undefined
                          }}
                        >
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: isCurrentStateRow ? 800 : 500, color: isCurrentStateRow ? 'var(--primary)' : 'inherit' }}>
                            {state}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {symbol}
                          </td>
                          <td>
                            <StatusBadge status={target.nextState} />
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  <tr>
                    <td colSpan={3}>Loading transition table...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transition Audit Trail */}
        <div className="card">
          <h2 className="card-title">Transition Audit Trail</h2>
          <p className="card-subtitle">Real-time log of state transitions executed on this socket</p>
          {(!fsmData?.history || fsmData.history.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transitions logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
              {fsmData.history.slice().reverse().map((rec, idx) => (
                <div key={idx} style={{ padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{rec.from || 'START'}</span>
                      <ArrowRight size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--primary)' }}>{rec.to}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Symbol: <span style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0' }}>{rec.event}</span> • {rec.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
