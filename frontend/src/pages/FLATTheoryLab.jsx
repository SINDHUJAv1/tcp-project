import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  SkipForward,
  Pause,
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FLATTheoryLab() {
  const [activeTab, setActiveTab] = useState('finite-automata');

  // ==========================================
  // CO2: Regex Tab State
  // ==========================================
  const [regexType, setRegexType] = useState('hostname');
  const [testInput, setTestInput] = useState('api.velalar.edu');
  const [validationResult, setValidationResult] = useState(null);
  const [regexMeta, setRegexMeta] = useState(null);

  // ==========================================
  // CO3: CFG Tab State (Interactive Parser)
  // ==========================================
  const [cfgData, setCfgData] = useState(null);
  const [cfgInput, setCfgInput] = useState('CONNECT SYN SYN_ACK ACK DATA DATA_ACK FIN ACK');
  const [parseResult, setParseResult] = useState(null);
  const [cfgLoading, setCfgLoading] = useState(false);

  // ==========================================
  // CO4: PDA Tab State (Stack Demonstration)
  // ==========================================
  const [pdaInput, setPdaInput] = useState('SYN, SYN_ACK, DATA, DATA_ACK, FIN, FIN_ACK');
  const [pdaTrace, setPdaTrace] = useState(null);
  const [pdaLoading, setPdaLoading] = useState(false);

  // ==========================================
  // CO5: Turing Machine Tab State (Tape Simulator)
  // ==========================================
  const [tmInput, setTmInput] = useState('SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, ACK');
  const [tmSimulationData, setTmSimulationData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);

  // Load initial metadata
  useEffect(() => {
    let isMounted = true;
    const fetchFlatData = async () => {
      try {
        setLoading(true);
        const [regRes, cfgRes, simPdaRes, tmRes] = await Promise.all([
          api.getRegexDetails(),
          api.getCFG(),
          api.simulatePDA(['SYN', 'SYN_ACK', 'DATA', 'DATA_ACK', 'FIN', 'FIN_ACK']),
          api.simulateTuringMachine(['SYN', 'SYN_ACK', 'ACK', 'DATA', 'DATA_ACK', 'FIN', 'ACK'])
        ]);

        if (isMounted) {
          if (regRes && regRes.data) setRegexMeta(regRes.data);
          if (cfgRes && cfgRes.data) setCfgData(cfgRes.data);
          if (simPdaRes && simPdaRes.data) setPdaTrace(simPdaRes.data);
          if (tmRes && tmRes.data) {
            setTmSimulationData(tmRes.data);
            setCurrentStepIndex(0);
          }

          // Initial CFG parse
          const initialParse = await api.parseCFG({ sequence: 'CONNECT SYN SYN_ACK ACK DATA DATA_ACK FIN ACK' });
          if (initialParse && initialParse.data) {
            setParseResult(initialParse.data);
          }
        }
      } catch (err) {
        console.error('FLAT lab data error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFlatData();
    return () => {
      isMounted = false;
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Auto-play timer for Turing Machine
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (!tmSimulationData || prev >= tmSimulationData.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 750);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, tmSimulationData]);

  // ==========================================
  // Handlers for CO2 Regex
  // ==========================================
  const handleValidateRegex = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await api.validateRegex({ type: regexType, value: testInput });
      if (res && res.data) {
        setValidationResult(res.data);
      }
    } catch (err) {
      setValidationResult({
        isValid: false,
        message: err.message,
        value: testInput
      });
    }
  };

  const setRegexPreset = (type, val) => {
    setRegexType(type);
    setTestInput(val);
    setValidationResult(null);
  };

  // ==========================================
  // Handlers for CO3 CFG Parser
  // ==========================================
  const handleParseCFG = async (e) => {
    if (e) e.preventDefault();
    setCfgLoading(true);
    try {
      const res = await api.parseCFG({ sequence: cfgInput });
      if (res && res.data) {
        setParseResult(res.data);
      }
    } catch (err) {
      setParseResult({
        accepted: false,
        reason: err.message,
        derivationSteps: []
      });
    } finally {
      setCfgLoading(false);
    }
  };

  const setCFGPreset = (seq) => {
    setCfgInput(seq);
    api.parseCFG({ sequence: seq }).then(res => {
      if (res && res.data) setParseResult(res.data);
    }).catch(console.error);
  };

  // ==========================================
  // Handlers for CO4 PDA Stack Trace
  // ==========================================
  const handleSimulatePDA = async (e) => {
    if (e) e.preventDefault();
    setPdaLoading(true);
    try {
      const tokens = pdaInput.split(/[\s,]+/).filter(Boolean);
      const res = await api.simulatePDA(tokens);
      if (res && res.data) {
        setPdaTrace(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPdaLoading(false);
    }
  };

  const setPDAPreset = (tokensStr) => {
    setPdaInput(tokensStr);
    const tokens = tokensStr.split(/[\s,]+/).filter(Boolean);
    api.simulatePDA(tokens).then(res => {
      if (res && res.data) setPdaTrace(res.data);
    }).catch(console.error);
  };

  // ==========================================
  // Handlers for CO5 Turing Machine
  // ==========================================
  const loadTMSimulation = async (seqString) => {
    setIsPlaying(false);
    const tokens = seqString.split(/[\s,]+/).filter(Boolean);
    try {
      const res = await api.simulateTuringMachine(tokens);
      if (res && res.data) {
        setTmSimulationData(res.data);
        setCurrentStepIndex(0);
      }
    } catch (err) {
      console.error('TM simulation error:', err);
    }
  };

  const handleNextTMStep = () => {
    if (!tmSimulationData) return;
    if (currentStepIndex < tmSimulationData.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleResetTM = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  if (loading && !regexMeta) {
    return <LoadingSpinner text="Compiling FLAT Automata & Formal Grammars..." />;
  }

  // Active step of Turing Machine
  const activeTMStep = tmSimulationData?.steps?.[currentStepIndex] || null;
  const currentTape = activeTMStep ? activeTMStep.tapeSnapshot : (tmSimulationData?.initialTape || []);
  const currentHead = activeTMStep ? activeTMStep.headPosition : 0;

  return (
    <div>
      {/* Header Tabs Navigation */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem' }}>
        <div className="tabs-nav" style={{ margin: 0, border: 'none' }}>
          <button
            className={`tab-btn ${activeTab === 'finite-automata' ? 'active' : ''}`}
            onClick={() => setActiveTab('finite-automata')}
          >
            A. Finite Automata (DFA)
          </button>
          <button
            className={`tab-btn ${activeTab === 'regular-expressions' ? 'active' : ''}`}
            onClick={() => setActiveTab('regular-expressions')}
          >
            B. Regular Expressions (Regex)
          </button>
          <button
            className={`tab-btn ${activeTab === 'context-free-grammar' ? 'active' : ''}`}
            onClick={() => setActiveTab('context-free-grammar')}
          >
            C. Context-Free Grammar (CFG)
          </button>
          <button
            className={`tab-btn ${activeTab === 'pushdown-automata' ? 'active' : ''}`}
            onClick={() => setActiveTab('pushdown-automata')}
          >
            D. Pushdown Automata (PDA)
          </button>
          <button
            className={`tab-btn ${activeTab === 'turing-machine' ? 'active' : ''}`}
            onClick={() => setActiveTab('turing-machine')}
          >
            E. Turing Machine & Decidability
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB A: FINITE AUTOMATA (CO1) */}
      {/* ======================================================== */}
      {activeTab === 'finite-automata' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 className="card-title">Finite State Automaton Specification (CO1)</h2>
            <p className="card-subtitle">
              Formal 5-tuple definition of the TCP Connection Lifecycle Automaton
            </p>

            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                M = (Q, Σ, δ, q₀, F)
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>• <strong style={{ color: '#fff' }}>Q (Set of States):</strong> {'{ Closed, Connecting, Established, Waiting, Terminated, Failed, Timeout }'}</div>
                <div>• <strong style={{ color: '#fff' }}>Σ (Input Alphabet):</strong> {'{ SYN_SENT, SYN_ACK_RCVD, ACK_SENT, DATA_TRANSFER, FIN_SENT, FIN_ACK_RCVD, RST_RCVD, TIMEOUT_TRIGGER, NETWORK_ERROR, RESET_FSM, RETRY_CONNECT }'}</div>
                <div>• <strong style={{ color: '#fff' }}>q₀ (Initial State):</strong> Closed</div>
                <div>• <strong style={{ color: '#fff' }}>F (Final / Terminal States):</strong> {'{ Terminated, Failed, Timeout }'}</div>
                <div>• <strong style={{ color: '#fff' }}>δ: Q × Σ → Q:</strong> Deterministic State-Transition Function</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Formal State Definitions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--primary)' }}>Closed (q₀)</strong>: Quiescent initial state. Socket allocated with no active communication channel.
              </div>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--info)' }}>Connecting</strong>: Client has transmitted initial SYN and is awaiting SYN-ACK from server.
              </div>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--success)' }}>Established</strong>: 3-way handshake finalized. Bidirectional reliable byte streaming is active.
              </div>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--warning)' }}>Waiting</strong>: FIN transmitted by client. Waiting for peer acknowledgment and half-close completion.
              </div>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--purple)' }}>Terminated (F)</strong>: Final clean teardown state. Connection gracefully dismantled.
              </div>
              <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--danger)' }}>Failed / Timeout (F)</strong>: Terminal error states resulting from TCP RST rejection or RTO expiry.
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Explore live node state highlighting and test invalid transition rejections in the <strong>TCP State Visualizer</strong>.
              </div>
              <a href="/fsm" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
                Open FSM Visualizer →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB B: REGULAR EXPRESSIONS (CO2) */}
      {/* ======================================================== */}
      {activeTab === 'regular-expressions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 className="card-title">Formal Regular Expression Validator (CO2)</h2>
            <p className="card-subtitle">
              Syntax and semantic validation for Hostnames, IPv4 addresses, Ports, TCP Control Flags, and Packet Records
            </p>

            {/* Quick Test Bench Presets */}
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Quick Presets:</span>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setRegexPreset('tcp_flags', '[SYN, ACK]')}>
                Flags: [SYN, ACK] (Valid)
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setRegexPreset('tcp_flags', '[SYN, FIN]')}>
                Flags: [SYN, FIN] (Illegal)
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setRegexPreset('packet_record', 'SEQ:1000 ACK:0 FLAGS:[SYN] WIN:64240 LEN:0')}>
                Packet: SYN (Valid)
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setRegexPreset('packet_record', 'SEQ:1000 ACK:0 FLAGS:[SYN] WIN:999999 LEN:0')}>
                Packet: WIN Overflow (Invalid)
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setRegexPreset('ipv4', '192.168.1.1')}>
                IPv4: 192.168.1.1 (Valid)
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setRegexPreset('port', '99999')}>
                Port: 99999 (Invalid)
              </button>
            </div>

            <form onSubmit={handleValidateRegex} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Grammar Target</label>
                  <select
                    className="form-select"
                    value={regexType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegexType(val);
                      if (val === 'hostname') setTestInput('api.velalar.edu');
                      else if (val === 'ipv4') setTestInput('192.168.1.1');
                      else if (val === 'port') setTestInput('8080');
                      else if (val === 'tcp_flags') setTestInput('[SYN, ACK]');
                      else if (val === 'packet_record') setTestInput('SEQ:1000 ACK:0 FLAGS:[SYN] WIN:64240 LEN:0');
                      setValidationResult(null);
                    }}
                  >
                    <option value="hostname">RFC 1123 Hostname / Domain</option>
                    <option value="ipv4">IPv4 Dotted Decimal Address</option>
                    <option value="port">TCP Port Number (1 - 65535)</option>
                    <option value="tcp_flags">TCP Control Flags (SYN, ACK, FIN, RST, PSH)</option>
                    <option value="packet_record">TCP Packet Record Format</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Test Input String</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input form-mono"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Enter string to evaluate against regex..."
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                      <Play size={15} />
                      <span>Validate Regex</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Pattern Display & Explanation */}
            {regexMeta?.patterns?.[regexType] && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Formal Regular Expression</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--primary)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  /{regexMeta.patterns[regexType].pattern}/{regexMeta.patterns[regexType].flags || ''}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                  {regexMeta.patterns[regexType].description}
                </div>
              </div>
            )}

            {/* Live Result */}
            {validationResult && (
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                background: validationResult.isValid ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${validationResult.isValid ? 'var(--success-border)' : 'var(--danger-border)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                {validationResult.isValid ? (
                  <CheckCircle2 size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <XCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, color: validationResult.isValid ? '#86efac' : '#fca5a5', fontSize: '0.95rem' }}>
                    {validationResult.isValid ? 'ACCEPT: Syntactically & Semantically Valid' : 'REJECT: Regular Expression / Semantic Constraint Violated'}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                    {validationResult.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                    Evaluated Value: "{validationResult.value}"
                  </div>
                </div>
              </div>
            )}

            {/* Examples Bench Table */}
            {regexMeta?.examples?.[regexType] && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  Formal Language Example Test Bench:
                </h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sample Input</th>
                        <th>Status</th>
                        <th>Formal Language Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regexMeta.examples[regexType].map((ex, idx) => (
                        <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => { setTestInput(ex.input); setValidationResult(null); }}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                            {ex.input}
                          </td>
                          <td>
                            {ex.valid ? (
                              <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ Valid</span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 700 }}>✗ Invalid</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {ex.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB C: CONTEXT-FREE GRAMMAR (CO3) */}
      {/* ======================================================== */}
      {activeTab === 'context-free-grammar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 className="card-title">Context-Free Grammar & Interactive Event Parser (CO3)</h2>
            <p className="card-subtitle">
              Formal grammar G = (V, Σ, R, S) and parser verifying whether arbitrary TCP event sequences belong to language L(G)
            </p>

            {/* Grammar 4-Tuple Specification */}
            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                G = (V, Σ, R, S)
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>• <strong style={{ color: '#fff' }}>V (Variables / Non-Terminals):</strong> {'{ S, Handshake, SessionBody, DataPhase, DataUnit, Teardown, FailureResponse }'}</div>
                <div>• <strong style={{ color: '#fff' }}>Σ (Terminals):</strong> {'{ CONNECT, SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, FIN_ACK, RST, TIMEOUT }'}</div>
                <div>• <strong style={{ color: '#fff' }}>S (Start Symbol):</strong> S</div>
              </div>
            </div>

            {/* Interactive Parser Input Form */}
            <div style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Interactive TCP Event Sequence Parser
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Enter an arbitrary sequence of TCP communication events separated by spaces or commas:
              </p>

              {/* Sequence Presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Test Presets:</span>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setCFGPreset('CONNECT SYN SYN_ACK ACK DATA DATA_ACK FIN ACK')}>
                  Full Session (Valid)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setCFGPreset('SYN SYN_ACK ACK RST')}>
                  Handshake + Reset (Valid)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setCFGPreset('SYN TIMEOUT')}>
                  Handshake Timeout (Valid)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setCFGPreset('SYN FIN')}>
                  Premature FIN (Invalid)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setCFGPreset('SYN SYN_ACK DATA')}>
                  Missing Handshake ACK (Invalid)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setCFGPreset('DATA DATA_ACK FIN ACK')}>
                  Data Without Handshake (Invalid)
                </button>
              </div>

              <form onSubmit={handleParseCFG} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input form-mono"
                  style={{ flex: 1, minWidth: '320px' }}
                  value={cfgInput}
                  onChange={(e) => setCfgInput(e.target.value)}
                  placeholder="e.g. CONNECT SYN SYN_ACK ACK DATA FIN ACK"
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={cfgLoading} style={{ flexShrink: 0 }}>
                  <Play size={16} />
                  <span>Parse Sequence</span>
                </button>
              </form>
            </div>

            {/* Parser Result Feedback */}
            {parseResult && (
              <div style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                background: parseResult.accepted ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${parseResult.accepted ? 'var(--success-border)' : 'var(--danger-border)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {parseResult.accepted ? (
                    <CheckCircle2 size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  ) : (
                    <XCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: parseResult.accepted ? '#86efac' : '#fca5a5' }}>
                      {parseResult.accepted ? 'ACCEPTED: Sequence Belongs to Language L(G)' : 'REJECTED: Grammar Production Rule Violation'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                      {parseResult.reason || parseResult.explanation}
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Derivation */}
                {parseResult.derivationSteps && parseResult.derivationSteps.length > 0 && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                      Step-by-Step Leftmost Derivation:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      {parseResult.derivationSteps.map((s) => (
                        <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', width: '60px' }}>Step {s.step}:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>{s.text}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>[{s.rule}]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Production Rules Reference Table */}
            {cfgData?.productions && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Production Rules (R)</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Left-Hand Side</th>
                        <th>Arrow</th>
                        <th>Right-Hand Side (RHS)</th>
                        <th>Protocol Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cfgData.productions.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{p.lhs}</td>
                          <td style={{ color: 'var(--text-dim)' }}>→</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#86efac' }}>{p.rhs.join(' ')}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB D: PUSHDOWN AUTOMATA (CO4) */}
      {/* ======================================================== */}
      {activeTab === 'pushdown-automata' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 className="card-title">Pushdown Automaton (PDA) Stack Model (CO4)</h2>
            <p className="card-subtitle">
              Modeling balanced packet-acknowledgment frames and session nesting via a LIFO stack
            </p>

            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                P = (Q, Σ, Γ, δ, q₀, Z₀, F)
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>• <strong style={{ color: '#fff' }}>Γ (Stack Alphabet):</strong> {'{ Z₀ (Bottom-of-stack marker), S_FRAME, D_FRAME, F_FRAME }'}</div>
                <div>• <strong style={{ color: '#fff' }}>Protocol Stack Rule:</strong> Every transmitted request frame pushes a tracking token onto the stack; the matching peer acknowledgment pops the frame. When the stack returns to Z₀ at teardown, the sequence is accepted.</div>
              </div>
            </div>

            {/* Theoretical note regarding DFA vs PDA */}
            <div className="notice-box" style={{ marginBottom: '1.5rem' }}>
              <Info size={20} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--info)' }} />
              <div style={{ fontSize: '0.84rem' }}>
                <strong>Theoretical Distinction Note:</strong> The standard TCP Finite State Machine itself is recognized by a Deterministic Finite Automaton (DFA) because its state graph is strictly finite. The Pushdown Automaton (PDA) demonstrated here models <em>context-free nested request-response tracking and buffer balance</em> (ensuring every transmitted frame has a corresponding pop upon matching acknowledgment).
              </div>
            </div>

            {/* Custom PDA Sequence Form */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>PDA Presets:</span>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setPDAPreset('SYN, SYN_ACK, DATA, DATA_ACK, FIN, FIN_ACK')}>
                  Balanced Full Session (Accepted)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={() => setPDAPreset('SYN, SYN_ACK, DATA, DATA_ACK, DATA, DATA_ACK, FIN, FIN_ACK')}>
                  Multi-Data Exchange (Accepted)
                </button>
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }} onClick={() => setPDAPreset('SYN, SYN_ACK, DATA, FIN_ACK')}>
                  Unbalanced Data ACK (Rejected)
                </button>
              </div>

              <form onSubmit={handleSimulatePDA} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input form-mono"
                  style={{ flex: 1 }}
                  value={pdaInput}
                  onChange={(e) => setPdaInput(e.target.value)}
                  placeholder="e.g. SYN, SYN_ACK, DATA, DATA_ACK, FIN, FIN_ACK"
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={pdaLoading}>
                  <Play size={16} />
                  <span>Run Stack Trace</span>
                </button>
              </form>
            </div>

            {/* Stack Trace Table */}
            {pdaTrace && (
              <div>
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  background: pdaTrace.isAccepted ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${pdaTrace.isAccepted ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  {pdaTrace.isAccepted ? <CheckCircle2 size={18} style={{ color: 'var(--success)' }} /> : <XCircle size={18} style={{ color: 'var(--danger)' }} />}
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: pdaTrace.isAccepted ? '#86efac' : '#fca5a5' }}>
                    {pdaTrace.resultSummary}
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Input Token</th>
                        <th>State (Q)</th>
                        <th>Stack (Top → Bottom)</th>
                        <th>Stack Transition Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdaTrace.steps.map((st, idx) => (
                        <tr key={idx} style={{ background: st.valid ? 'transparent' : 'rgba(239, 68, 68, 0.08)' }}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{idx}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                            {st.token}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {st.state}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#86efac', fontWeight: 700 }}>
                            [ {st.stack.slice().reverse().join(' | ')} ]
                          </td>
                          <td style={{ fontSize: '0.82rem', color: st.valid ? 'var(--text-muted)' : '#fca5a5' }}>
                            {st.action}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB E: TURING MACHINE (CO5) - INTERACTIVE TAPE SIMULATOR */}
      {/* ======================================================== */}
      {activeTab === 'turing-machine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 className="card-title">Interactive Turing Machine Tape Simulator (CO5)</h2>
            <p className="card-subtitle">
              Deterministic Turing Machine M = (Q, Σ, Γ, δ, q₀, B, F) reading TCP event sequences on a discrete tape and detecting missing ACKs and TIMEOUT markers
            </p>

            {/* Formal Definition Banner */}
            <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                M_TM = (Q, Σ, Γ, δ, q0_start, B, F)
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>• <strong style={{ color: '#fff' }}>Q:</strong> {'{ q0_start, q1_syn_seen, q2_synack_seen, q3_established, q4_data_pending, q5_fin_seen, q_accept, q_missing_ack, q_timeout_detected, q_reject }'}</div>
                <div>• <strong style={{ color: '#fff' }}>Γ (Tape Alphabet):</strong> {'{ SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, FIN_ACK, RST, TIMEOUT, B (Blank) }'}</div>
                <div>• <strong style={{ color: '#86efac' }}>Decidability Theorem:</strong> Protocol sequence checking is strictly decidable in O(n) linear deterministic tape steps.</div>
              </div>
            </div>

            {/* Presets for Missing ACK and Timeout Detection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Select Simulation Scenario:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => { setTmInput('SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, ACK'); loadTMSimulation('SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, ACK'); }}
                >
                  Standard Session (Accepted)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }}
                  onClick={() => { setTmInput('SYN, SYN_ACK'); loadTMSimulation('SYN, SYN_ACK'); }}
                >
                  Missing Handshake ACK (q_missing_ack)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', borderColor: 'var(--danger-border)', color: '#fca5a5' }}
                  onClick={() => { setTmInput('SYN, SYN_ACK, ACK, DATA'); loadTMSimulation('SYN, SYN_ACK, ACK, DATA'); }}
                >
                  Missing Data ACK (q_missing_ack)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', borderColor: 'var(--warning-border)', color: '#fcd34d' }}
                  onClick={() => { setTmInput('SYN, TIMEOUT'); loadTMSimulation('SYN, TIMEOUT'); }}
                >
                  Handshake Timeout (q_timeout_detected)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', borderColor: 'var(--warning-border)', color: '#fcd34d' }}
                  onClick={() => { setTmInput('SYN, SYN_ACK, ACK, TIMEOUT'); loadTMSimulation('SYN, SYN_ACK, ACK, TIMEOUT'); }}
                >
                  Established Timeout (q_timeout_detected)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => { setTmInput('SYN, RST'); loadTMSimulation('SYN, RST'); }}
                >
                  Connection Refused RST (q_reject)
                </button>
              </div>
            </div>

            {/* Custom Tape Input */}
            <form onSubmit={(e) => { e.preventDefault(); loadTMSimulation(tmInput); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-input form-mono"
                value={tmInput}
                onChange={(e) => setTmInput(e.target.value)}
                placeholder="Enter custom sequence (e.g. SYN, SYN_ACK, ACK, DATA, DATA_ACK, FIN, ACK)..."
                required
              />
              <button type="submit" className="btn btn-secondary" style={{ flexShrink: 0 }}>
                Load Custom Tape
              </button>
            </form>

            {/* Interactive Tape Display Container */}
            <div style={{
              padding: '1.5rem',
              background: '#090d16',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
              {/* Tape Controller Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Machine State:</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: activeTMStep?.state.includes('accept')
                      ? 'rgba(16, 185, 129, 0.2)'
                      : (activeTMStep?.state.includes('missing') || activeTMStep?.state.includes('reject') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)'),
                    color: activeTMStep?.state.includes('accept')
                      ? '#86efac'
                      : (activeTMStep?.state.includes('missing') || activeTMStep?.state.includes('reject') ? '#fca5a5' : 'var(--primary)'),
                    border: '1px solid currentColor'
                  }}>
                    {activeTMStep ? activeTMStep.state : (tmSimulationData?.finalState || 'q0_start')}
                  </span>
                </div>

                {/* Step controls */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={handleNextTMStep}
                    disabled={isPlaying || (tmSimulationData && currentStepIndex >= tmSimulationData.steps.length - 1)}
                  >
                    <SkipForward size={16} />
                    <span>Next Step</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span>{isPlaying ? 'Pause' : 'Auto Run'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={handleResetTM}
                  >
                    <RotateCcw size={16} />
                    <span>Reset Tape</span>
                  </button>
                </div>
              </div>

              {/* Tape Cells View with Head Pointer */}
              <div style={{ overflowX: 'auto', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '100%' }}>
                  
                  {/* Tape Cells Row */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {currentTape.map((symbol, idx) => {
                      const isHeadHere = idx === currentHead;
                      return (
                        <div
                          key={idx}
                          style={{
                            width: '90px',
                            height: '56px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isHeadHere ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-input)',
                            border: isHeadHere ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: symbol === 'B' ? 'var(--text-dim)' : (isHeadHere ? '#fff' : 'var(--text-main)'),
                            position: 'relative',
                            boxShadow: isHeadHere ? '0 0 16px rgba(6, 182, 212, 0.4)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', position: 'absolute', top: 3, left: 5 }}>
                            #{idx}
                          </span>
                          <span>{symbol}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tape Head Cursor Indicator */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {currentTape.map((_, idx) => {
                      const isHeadHere = idx === currentHead;
                      return (
                        <div
                          key={idx}
                          style={{
                            width: '90px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            visibility: isHeadHere ? 'visible' : 'hidden'
                          }}
                        >
                          <div style={{ color: 'var(--primary)', fontSize: '1rem', lineHeight: 1 }}>▲</div>
                          <div style={{
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--primary)',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            marginTop: '2px'
                          }}>
                            TAPE HEAD
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Operation Feedback */}
              {activeTMStep && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', marginRight: '0.5rem' }}>Step {activeTMStep.stepNumber} of {tmSimulationData?.steps?.length}:</span>
                    <strong style={{ color: 'var(--primary)' }}>{activeTMStep.actionDescription}</strong>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Direction: <strong>{activeTMStep.moveDirection}</strong> | Symbol Read: <strong>'{activeTMStep.currentSymbol}'</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Verdict & Detection Banners */}
            {activeTMStep?.isHalted && (
              <div style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                background: activeTMStep.verdict === 'ACCEPTED'
                  ? 'var(--success-bg)'
                  : (activeTMStep.verdict === 'REJECTED_TIMEOUT' ? 'var(--warning-bg)' : 'var(--danger-bg)'),
                border: `1px solid ${activeTMStep.verdict === 'ACCEPTED' ? 'var(--success-border)' : (activeTMStep.verdict === 'REJECTED_TIMEOUT' ? 'var(--warning-border)' : 'var(--danger-border)')}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {activeTMStep.verdict === 'ACCEPTED' && <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />}
                  {activeTMStep.verdict === 'REJECTED_TIMEOUT' && <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />}
                  {activeTMStep.verdict.includes('MISSING') && <XCircle size={24} style={{ color: 'var(--danger)' }} />}
                  {activeTMStep.verdict === 'REJECTED' && <XCircle size={24} style={{ color: 'var(--danger)' }} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: activeTMStep.verdict === 'ACCEPTED' ? '#86efac' : (activeTMStep.verdict === 'REJECTED_TIMEOUT' ? '#fcd34d' : '#fca5a5') }}>
                      TURING MACHINE HALTED: {activeTMStep.verdict}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                      {tmSimulationData?.explanation}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step-by-Step History Log Table */}
            {tmSimulationData?.steps && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Turing Machine Execution Trace
                </h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>State</th>
                        <th>Head Position</th>
                        <th>Read Symbol</th>
                        <th>Next State</th>
                        <th>Head Move</th>
                        <th>Operation Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tmSimulationData.steps.map((st, idx) => {
                        const isCurrent = idx === currentStepIndex;
                        return (
                          <tr
                            key={idx}
                            style={{
                              background: isCurrent ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                              cursor: 'pointer'
                            }}
                            onClick={() => { setCurrentStepIndex(idx); setIsPlaying(false); }}
                          >
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: isCurrent ? 800 : 400, color: isCurrent ? 'var(--primary)' : 'inherit' }}>
                              {st.stepNumber} {isCurrent && '◀'}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{st.state}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>[{st.headPosition}]</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{st.currentSymbol}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', color: '#86efac' }}>{st.nextState}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{st.moveDirection}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{st.actionDescription}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Formal Decidability Theorem Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Decidable Problems */}
              <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                  Decidable Network Verification Problems
                </h3>
                <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                  <li><strong>Finite Sequence Conformance:</strong> Strictly decidable in O(n) tape operations because the machine halts when reaching end marker B.</li>
                  <li><strong>Missing ACK Detection:</strong> Decidable in deterministic linear time by recognizing state transitions to q_missing_ack upon scanning B.</li>
                  <li><strong>Timeout Marker Detection:</strong> Decidable in O(n) steps by immediately shifting to q_timeout_detected upon scanning TIMEOUT.</li>
                  <li><strong>Hostname & IPv4 Syntax:</strong> Decidable in O(n) via deterministic finite state automaton (Regular Language).</li>
                </ul>
              </div>

              {/* Undecidable Problems */}
              <div style={{ padding: '1.25rem', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>
                  Inherently Undecidable Problems in Networking
                </h3>
                <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                  <li><strong>The Two Generals' Problem:</strong> Provably impossible to guarantee consensus over an unreliable network with packet loss.</li>
                  <li><strong>Protocol Halting with Unbounded Buffers:</strong> Determining whether an arbitrary distributed protocol deadlocks or halts is undecidable (equivalent to the Halting Problem).</li>
                  <li><strong>Generalized Dynamic Routing Ambiguity:</strong> Reducible to Post's Correspondence Problem (PCP) for unrestricted distributed message routing topologies.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
