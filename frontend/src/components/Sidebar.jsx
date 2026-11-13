import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  GitBranch,
  History,
  ShieldAlert,
  Activity,
  BookOpen,
  Info,
  Server
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/simulator', label: 'Connection Simulator', icon: Cpu },
  { path: '/fsm', label: 'TCP State Visualizer', icon: GitBranch },
  { path: '/history', label: 'Connection History', icon: History },
  { path: '/failure-analysis', label: 'Failure Analysis', icon: ShieldAlert },
  { path: '/events', label: 'Network Events', icon: Activity },
  { path: '/flat-lab', label: 'FLAT Theory Lab', icon: BookOpen },
  { path: '/about', label: 'About Project', icon: Info }
];

export default function Sidebar({ isOpen, onCloseMobile }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon">
          <Server size={22} />
        </div>
        <div>
          <div className="brand-title">TCP Analyzer</div>
          <div className="brand-subtitle">FSWD • CN • FLAT</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onCloseMobile}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="roll-badge">
          <span>Roll Number:</span>
          <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>104</strong>
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Velalar College of Engg & Tech
        </div>
      </div>
    </aside>
  );
}
