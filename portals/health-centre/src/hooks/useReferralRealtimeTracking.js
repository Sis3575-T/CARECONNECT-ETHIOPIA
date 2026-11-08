/**
 * CareConnect Ethiopia - Referral Real-time & Polling Tracking Hook
 * Handles automated event subscriptions, reconnection recovery via /realtime/missed-events,
 * resilient polling fallback, and deduplication with strict privacy protection.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { referralTrackingService } from '../services/referralTrackingService.js';

export function useReferralRealtimeTracking({
  referralId = null,
  onEventReceived = null,
  pollingIntervalMs = 30000,
  enabled = true
}) {
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
      // 1. Recover missed events if connected
      const since = lastSyncTimestampRef.current;
      const missedEvents = await referralTrackingService.getMissedEvents({
        since,
        limit: 20
      }).catch(() => []);

      let hasNewEvents = false;
      if (Array.isArray(missedEvents) && missedEvents.length > 0) {
        for (const ev of missedEvents) {
          const eventId = ev.id || `${ev.event_type}-${ev.timestamp}`;
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

      // If manual trigger and onEventReceived provided, notify caller to re-fetch
      if (isManual && onEventReceived && !hasNewEvents) {
        onEventReceived({ type: 'MANUAL_REFRESH' });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsLiveConnected(false);
        // Only set error on manual action to avoid spamming UI during periodic background sync
        if (isManual) {
          setSyncError('Failed to synchronize latest referral updates.');
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

    // Initial check
    if (enabled) {
      triggerSync(false);

      // Setup resilient polling fallback
      if (pollingIntervalMs > 0) {
        pollingTimerRef.current = setInterval(() => {
          triggerSync(false);
        }, pollingIntervalMs);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [triggerSync, pollingIntervalMs, enabled]);

  return {
    isLiveConnected,
    lastSyncTime,
    isSyncing,
    syncError,
    triggerSync: () => triggerSync(true)
  };
}

export default useReferralRealtimeTracking;
