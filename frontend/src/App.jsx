import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

import Dashboard from './pages/Dashboard';
import ConnectionSimulator from './pages/ConnectionSimulator';
import TCPStateVisualizer from './pages/TCPStateVisualizer';
import ConnectionHistory from './pages/ConnectionHistory';
import FailureAnalysis from './pages/FailureAnalysis';
import NetworkEvents from './pages/NetworkEvents';
import FLATTheoryLab from './pages/FLATTheoryLab';
import AboutProject from './pages/AboutProject';

const PAGE_TITLES = {
  '/': 'Network Monitoring Dashboard',
  '/simulator': 'TCP Connection Simulator',
  '/fsm': 'TCP Finite State Machine Visualizer',
  '/history': 'Connection History & Database Records',
  '/failure-analysis': 'Failure Analysis & Security Alert Engine',
  '/events': 'Network Event Audit Stream',
  '/flat-lab': 'FLAT Theory Lab (Automata & Grammars)',
  '/about': 'About Project & Academic Mapping'
};

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] || 'TCP Connection Failure Analysis System';

  return (
    <div className="app-container">
      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="main-wrapper">
        <Header
          title={title}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="content-body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/simulator" element={<ConnectionSimulator />} />
            <Route path="/fsm" element={<TCPStateVisualizer />} />
            <Route path="/history" element={<ConnectionHistory />} />
            <Route path="/failure-analysis" element={<FailureAnalysis />} />
            <Route path="/events" element={<NetworkEvents />} />
            <Route path="/flat-lab" element={<FLATTheoryLab />} />
            <Route path="/about" element={<AboutProject />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}
