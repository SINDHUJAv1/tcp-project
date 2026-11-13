import React from 'react';

export default function StatusBadge({ status }) {
  const norm = String(status || '').toUpperCase();
  let badgeClass = 'badge-info';

  if (norm === 'SUCCESS' || norm === 'ESTABLISHED') {
    badgeClass = 'badge-success';
  } else if (norm === 'FAILED' || norm === 'ERROR' || norm === 'CRITICAL') {
    badgeClass = 'badge-failed';
  } else if (norm === 'TIMEOUT' || norm === 'WARNING') {
    badgeClass = 'badge-timeout';
  } else if (norm === 'CLOSED') {
    badgeClass = 'badge-closed';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}
