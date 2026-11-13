import React from 'react';
import {
  Server,
  Layers,
  GraduationCap,
  Cpu,
  Database,
  Globe
} from 'lucide-react';

export default function AboutProject() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(99, 102, 241, 0.08))', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <div className="brand-icon" style={{ width: 48, height: 48 }}>
            <Server size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              TCP Connection Failure Analysis System
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              Problem Statement #43 • Project-Based Assessment
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 900 }}>
          An integrated full-stack web engineering and formal automata platform that simulates TCP client-server communications, evaluates socket state transitions using finite state machines, monitors repeated connection failure anomalies with Node.js event emitters, and models network transactions using formal automata theory.
        </p>
      </div>

      {/* Student & Institutional Information */}
      <div className="card">
        <h2 className="card-title">
          <GraduationCap size={18} style={{ color: 'var(--primary)' }} />
          Student & Academic Credentials
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Candidate Roll Number</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)', marginTop: '0.2rem' }}>104</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class: 25IT5A & B (Odd Semester)</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Department</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>Information Technology</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Velalar College of Engineering & Technology</div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Academic Year</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>2026 - 27 (Odd)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Erode - 638 012, Tamil Nadu</div>
          </div>
        </div>
      </div>

      {/* Course Outcomes (CO) Curriculum Mapping */}
      <div className="card">
        <h2 className="card-title">
          <Layers size={18} style={{ color: 'var(--primary)' }} />
          Course Outcomes (CO) Assessment Mapping
        </h2>
        <p className="card-subtitle">
          Comprehensive implementation alignment across the three target subjects
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* FSWD */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem' }}>
              Subject 1: 22ITT51 - Full Stack Web Development (FSWD)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div><strong style={{ color: '#fff' }}>• CO1 (Web Page Design and Validation):</strong> Responsive network dashboard with input fields for Hostname/IP and Port. Real-time client and backend regex validation enforcing 1-65535 boundaries.</div>
              <div><strong style={{ color: '#fff' }}>• CO2 (Full-Stack Architecture & Communication):</strong> Browser client interacting with React frontend, communicating over REST API to Node.js/Express backend, persisted into MongoDB.</div>
              <div><strong style={{ color: '#fff' }}>• CO3 (React Components, State Management & Routing):</strong> Modular components, stateful dashboards using Recharts, and multi-page routing via React Router.</div>
              <div><strong style={{ color: '#fff' }}>• CO4 (Event-Driven Processing & EventEmitter):</strong> Node.js <span style={{ fontFamily: 'var(--font-mono)' }}>EventEmitter</span> architecture detecting repeated connection failures (≥3 within 60s) to trigger automated security alerts.</div>
              <div><strong style={{ color: '#fff' }}>• CO5 (MongoDB & Mongoose Operations):</strong> Complete CRUD operations on <span style={{ fontFamily: 'var(--font-mono)' }}>ConnectionAttempt</span>, <span style={{ fontFamily: 'var(--font-mono)' }}>NetworkEvent</span>, and <span style={{ fontFamily: 'var(--font-mono)' }}>SecurityAlert</span> collections with search and pagination.</div>
            </div>
          </div>

          {/* CN */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.75rem' }}>
              Subject 2: 22ITT52 - Computer Networks (CN)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div><strong style={{ color: '#fff' }}>• 3-Way Handshake Simulation:</strong> Explicit tracking of SYN, SYN-ACK, ACK sequence numbers, acknowledgment numbers, and window sizes.</div>
              <div><strong style={{ color: '#fff' }}>• Failure Modes:</strong> Accurate emulation of ECONNREFUSED (TCP RST on closed ports) and ETIMEDOUT (SYN drop with exponential backoff RTO).</div>
              <div><strong style={{ color: '#fff' }}>• Reliable Data Transfer & Teardown:</strong> PSH-ACK payload exchanges, RTT latency monitoring, and graceful 4-way FIN/ACK connection dismantling.</div>
            </div>
          </div>

          {/* FLAT */}
          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#c084fc', marginBottom: '0.75rem' }}>
              Subject 3: 22ITT53 - Formal Languages and Automata Theory (FLAT)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div><strong style={{ color: '#fff' }}>• CO1 (Finite Automata):</strong> Deterministic FSM <span style={{ fontFamily: 'var(--font-mono)' }}>M = (Q, Σ, δ, q₀, F)</span> modeling 7 required states with strict transition enforcement.</div>
              <div><strong style={{ color: '#fff' }}>• CO2 (Regular Expressions):</strong> Formal regular expressions validating RFC 1123 domain names, IPv4 dotted decimals, and 16-bit ports with boundary test benches.</div>
              <div><strong style={{ color: '#fff' }}>• CO3 (Context-Free Grammar):</strong> Production rules <span style={{ fontFamily: 'var(--font-mono)' }}>G = (V, Σ, R, S)</span> and step-by-step leftmost derivations of TCP event sequences.</div>
              <div><strong style={{ color: '#fff' }}>• CO4 (Pushdown Automata):</strong> Stack automaton modeling balanced packet-acknowledgment frames via push and pop transitions.</div>
              <div><strong style={{ color: '#fff' }}>• CO5 (Turing Machine & Decidability):</strong> Decidability theorem proving that finite TCP trace verification is decidable in O(n) linear time, contrasted with undecidable distributed problems like the Two Generals' Problem.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="card">
        <h2 className="card-title">Full-Stack Technology Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <Globe size={16} style={{ color: 'var(--primary)' }} />
              <span>Frontend Client</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              React 19, Vite, React Router, Recharts, Lucide Icons, Cyber Dark CSS
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <Cpu size={16} style={{ color: 'var(--info)' }} />
              <span>Backend Service</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Node.js v24, Express 5, EventEmitter, CORS, Morgan, Dotenv
            </div>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <Database size={16} style={{ color: 'var(--success)' }} />
              <span>Database Layer</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              MongoDB Atlas / Local MongoDB 9.0, Mongoose, Resilient Fallback Storage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
