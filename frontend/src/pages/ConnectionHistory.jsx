import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function ConnectionHistory() {
  const [connections, setConnections] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    hostname: '',
    port: '80',
    status: 'SUCCESS',
    finalState: 'Established',
    failureReason: 'None',
    latencyMs: '20',
    notes: ''
  });

  const fetchConnections = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.getConnections(params);
      if (res && res.data) {
        setConnections(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch connection history:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, search, statusFilter]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const params = {
          page: 1,
          limit: pagination.limit
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;

        const res = await api.getConnections(params);
        if (isMounted && res && res.data) {
          setConnections(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [statusFilter, pagination.limit, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchConnections(1);
  };

  // Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createConnection({
        hostname: formData.hostname.trim(),
        port: Number(formData.port),
        status: formData.status,
        finalState: formData.finalState,
        failureReason: formData.status === 'SUCCESS' ? 'None' : formData.failureReason,
        latencyMs: Number(formData.latencyMs) || 0,
        notes: formData.notes
      });
      setShowCreateModal(false);
      setFormData({
        hostname: '',
        port: '80',
        status: 'SUCCESS',
        finalState: 'Established',
        failureReason: 'None',
        latencyMs: '20',
        notes: ''
      });
      fetchConnections(1);
    } catch (err) {
      alert(err.message || 'Error creating record');
    }
  };

  // Edit / Update
  const handleEditOpen = (record) => {
    setSelectedRecord(record);
    setFormData({
      hostname: record.hostname,
      port: String(record.port),
      status: record.status,
      finalState: record.finalState,
      failureReason: record.failureReason || 'None',
      latencyMs: String(record.latencyMs || 0),
      notes: record.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.updateConnection(selectedRecord._id, {
        notes: formData.notes,
        status: formData.status,
        failureReason: formData.failureReason
      });
      setShowEditModal(false);
      fetchConnections(pagination.page);
    } catch (err) {
      alert(err.message || 'Error updating record');
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!selectedRecord) return;
    try {
      await api.deleteConnection(selectedRecord._id);
      setShowDeleteModal(false);
      fetchConnections(pagination.page);
    } catch (err) {
      alert(err.message || 'Error deleting record');
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(connections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tcp_connections_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div>
      {/* Header controls & actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="card-title">
              <History size={18} style={{ color: 'var(--primary)' }} />
              Stored Connection Records (MongoDB CRUD)
            </h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Full database history of TCP connection attempts with search, filtering, update, and deletion
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExportJSON} title="Export current view to JSON">
              <Download size={15} />
              <span>Export JSON</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>Create Manual Record</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by hostname or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              <Search size={15} />
              <span>Search</span>
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ width: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
              <option value="TIMEOUT">Timeout Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {loading && connections.length === 0 ? (
          <LoadingSpinner text="Querying connection records from database..." />
        ) : connections.length === 0 ? (
          <EmptyState
            title="No Connection Attempts Found"
            message="No connection records match the active query. Click 'Create Manual Record' or run a simulation."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hostname / Target</th>
                  <th>Port</th>
                  <th>Status</th>
                  <th>Initial State</th>
                  <th>Final State</th>
                  <th>Failure Reason</th>
                  <th>Latency</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => (
                  <tr key={conn._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-main)' }}>
                      {conn.hostname}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {conn.port}
                    </td>
                    <td>
                      <StatusBadge status={conn.status} />
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {conn.initialState || 'Closed'}
                    </td>
                    <td>
                      <StatusBadge status={conn.finalState} />
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={conn.failureReason}>
                      {conn.failureReason || 'None'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {conn.latencyMs} ms
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(conn.createdAt).toLocaleDateString()} {new Date(conn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem' }}
                          title="View Details"
                          onClick={() => setSelectedRecord(conn)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem' }}
                          title="Edit / Annotate"
                          onClick={() => handleEditOpen(conn)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.5rem' }}
                          title="Delete Record"
                          onClick={() => {
                            setSelectedRecord(conn);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total records)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem' }}
              disabled={!pagination.hasPrevPage || loading}
              onClick={() => fetchConnections(pagination.page - 1)}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem' }}
              disabled={!pagination.hasNextPage || loading}
              onClick={() => fetchConnections(pagination.page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Create Connection Record (MongoDB CO5)</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Hostname or IPv4 Address</label>
                  <input
                    type="text"
                    className="form-input form-mono"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    placeholder="e.g. 192.168.1.1 or api.velalar.edu"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Port (1-65535)</label>
                    <input
                      type="number"
                      className="form-input form-mono"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({
                        ...formData,
                        status: e.target.value,
                        finalState: e.target.value === 'SUCCESS' ? 'Established' : (e.target.value === 'TIMEOUT' ? 'Timeout' : 'Failed')
                      })}
                    >
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="FAILED">FAILED</option>
                      <option value="TIMEOUT">TIMEOUT</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Final State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.finalState}
                      onChange={(e) => setFormData({ ...formData, finalState: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Latency (ms)</label>
                    <input
                      type="number"
                      className="form-input form-mono"
                      value={formData.latencyMs}
                      onChange={(e) => setFormData({ ...formData, latencyMs: e.target.value })}
                    />
                  </div>
                </div>

                {formData.status !== 'SUCCESS' && (
                  <div className="form-group">
                    <label className="form-label">Failure Reason</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.failureReason}
                      onChange={(e) => setFormData({ ...formData, failureReason: e.target.value })}
                      placeholder="e.g. ECONNREFUSED - Server rejected connection"
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Operational Notes</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter diagnostic notes or analysis remarks..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / ANNOTATE MODAL */}
      {showEditModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Edit Connection Record</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  Target: <strong>{selectedRecord.hostname}:{selectedRecord.port}</strong> (ID: {selectedRecord._id})
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILED">FAILED</option>
                    <option value="TIMEOUT">TIMEOUT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Failure Reason</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.failureReason}
                    onChange={(e) => setFormData({ ...formData, failureReason: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes & Diagnosis</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {selectedRecord && !showEditModal && !showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Connection Attempt Details</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedRecord(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>HOSTNAME</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{selectedRecord.hostname}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>PORT</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedRecord.port}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>STATUS</span>
                  <div><StatusBadge status={selectedRecord.status} /></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>FINAL STATE</span>
                  <div><StatusBadge status={selectedRecord.finalState} /></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ROUNDTRIP LATENCY</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedRecord.latencyMs} ms</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>PACKET LOSS</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{selectedRecord.packetLossRate || 0}%</div>
                </div>
              </div>

              {selectedRecord.failureReason && selectedRecord.failureReason !== 'None' && (
                <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: '#fca5a5' }}>
                  <strong>Failure Diagnosis:</strong> {selectedRecord.failureReason}
                </div>
              )}

              {selectedRecord.notes && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>OPERATIONAL NOTES</span>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>{selectedRecord.notes}</div>
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Record ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedRecord._id}</span>
                <br />
                Recorded At: {new Date(selectedRecord.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--danger)' }}>Confirm Deletion</h3>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Are you sure you want to permanently delete the connection attempt record for <strong style={{ color: '#fff' }}>{selectedRecord.hostname}:{selectedRecord.port}</strong>?
              </p>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Record ID: {selectedRecord._id}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>Delete Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
