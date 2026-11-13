import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Database, Menu } from 'lucide-react';
import { api } from '../api/client';

export default function Header({ title, onToggleSidebar, onRefresh }) {
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'checking', host: null });
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      if (res && res.database) {
        setDbStatus(res.database);
      }
    } catch {
      setDbStatus({ connected: false, mode: 'fallback', host: null });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.getHealth();
        if (isMounted && res && res.database) {
          setDbStatus(res.database);
        }
      } catch {
        if (isMounted) setDbStatus({ connected: false, mode: 'fallback', host: null });
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
    if (onRefresh) await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="btn btn-secondary mobile-menu-btn"
          style={{ display: 'none', padding: '0.4rem 0.6rem' }}
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation"
        >
          <Menu size={18} />
        </button>
        <h1 className="page-heading">{title}</h1>
      </div>

      <div className="header-right">
        {/* Database status pill - Accurately distinguishes MongoDB from In-Memory Demo Storage */}
        <div
          className={`db-badge ${dbStatus.connected ? 'connected' : 'fallback'}`}
          title={dbStatus.connected ? `MongoDB Active: Connected to ${dbStatus.host || '127.0.0.1'}:${dbStatus.port || '27017'}/${dbStatus.name || 'tcp_connection_analyzer'}` : 'MongoDB is currently offline. Demo Mode – In-Memory Storage active (data resets on restart)'}
        >
          <span className="db-dot" style={{ background: dbStatus.connected ? '#10b981' : '#f59e0b' }}></span>
          <Database size={13} />
          <span>
            {dbStatus.connected ? `MongoDB: Connected (${dbStatus.name || 'tcp_connection_analyzer'})` : 'Demo Mode – In-Memory Storage'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          className="btn btn-secondary"
          onClick={handleManualRefresh}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
          title="Refresh real data"
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
}
