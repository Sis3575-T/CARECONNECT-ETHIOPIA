import React from 'react';

/**
 * CareConnect Ethiopia - Screen Reader Live Announcer
 * Politeness: 'polite' for routine updates, 'assertive' for emergency triage alerts.
 */
export function LiveAnnouncer({ message, politeness = 'polite' }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export default LiveAnnouncer;
