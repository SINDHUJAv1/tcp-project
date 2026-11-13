import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyState({ title = 'No records found', message = 'There is currently no data available in this section.', icon: Icon = Database }) {
  return (
    <div className="empty-state">
      <Icon className="empty-state-icon" />
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h3>
      <p style={{ fontSize: '0.85rem' }}>{message}</p>
    </div>
  );
}
