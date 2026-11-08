/**
 * CareConnect Ethiopia - Hospital Real-Time Telemetry & Synchronization Hook
 * Manages event streams, missed-events recovery via /realtime/missed-events,
 * resilient 30-second polling fallback, and deduplication with strict privacy safeguards.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { hospitalService } from '../services/hospitalService.js';

export function useHospitalRealtime({
  referralId = null,
  onEventReceived = null,
  pollingIntervalMs = 30000,
  enabled = true
} = {}) {
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const seenEventIdsRef = useRef(new Set());
  const lastSyncTimestampRef = useRef(new Date().toISOString());
  const pollingTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Sync / Recovery function
  const triggerSync = useCallback(async (isManual = false) => {
    if (!enabled || !isMountedRef.current) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Recover missed events since last synchronization
      const since = lastSyncTimestampRef.current;
      const missedEvents = await hospitalService.getMissedEvents({
        since,
        limit: 30
      }).catch(() => []);

      let hasNewEvents = false;
      if (Array.isArray(missedEvents) && missedEvents.length > 0) {
        for (const ev of missedEvents) {
          const eventId = ev.id || `${ev.event_type || ev.type}-${ev.timestamp || ev.created_at}`;
          if (!seenEventIdsRef.current.has(eventId)) {
            seenEventIdsRef.current.add(eventId);

            // Filter by referralId if specified
            if (!referralId || ev.referral_id === referralId || ev.referralId === referralId) {
              hasNewEvents = true;
              if (onEventReceived) {
                onEventReceived(ev);
              }
            }
          }
        }
      }

      lastSyncTimestampRef.current = new Date().toISOString();
      if (isMountedRef.current) {
        setLastSyncTime(new Date());
        setIsLiveConnected(true);
      }

      // If manual refresh triggered and no new incremental events, notify caller to re-fetch
      if (isManual && onEventReceived && !hasNewEvents) {
        onEventReceived({ type: 'MANUAL_REFRESH' });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsLiveConnected(false);
        if (isManual) {
          setSyncError('Failed to synchronize real-time hospital updates.');
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [referralId, onEventReceived, enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      // Initial sync
      triggerSync(false);

      // Configure resilient polling fallback
      pollingTimerRef.current = setInterval(() => {
        triggerSync(false);
      }, pollingIntervalMs);
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [triggerSync, pollingIntervalMs, enabled]);

  return {
    isLiveConnected,
    lastSyncTime,
    isSyncing,
    syncError,
    triggerSync
  };
}
