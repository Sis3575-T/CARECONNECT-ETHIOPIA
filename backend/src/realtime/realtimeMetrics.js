/**
 * CareConnect Ethiopia - Real-Time Telemetry & Monitoring Service
 * Tracks connection health, authentication/authorization failures, event throughput,
 * heartbeat timeouts, and exposes role-protected administrative diagnostics.
 */

import { connectionRegistry } from './connectionRegistry.js';
import { subscriptionManager } from './subscriptionManager.js';
import { eventBroadcaster } from './eventBroadcaster.js';

export class RealtimeMetricsService {
  constructor(options = {}) {
    this.registry = options.registry || connectionRegistry;
    this.subscriptionManager = options.subscriptionManager || subscriptionManager;
    this.broadcaster = options.broadcaster || eventBroadcaster;
    this.startedAt = new Date().toISOString();

    this.counters = {
      connectionAttempts: 0,
      disconnections: 0,
      authSuccess: 0,
      authFailures: 0,
      authTimeouts: 0,
      unauthorizedSubscriptionAttempts: 0,
      rateLimitViolations: 0,
      heartbeatSweeps: 0,
      heartbeatTimeoutsTerminated: 0,
      syncRequests: 0,
      syncEventsReplayed: 0
    };
  }

  // Increment helper methods
  recordConnectionAttempt() { this.counters.connectionAttempts++; }
  recordDisconnection() { this.counters.disconnections++; }
  recordAuthSuccess() { this.counters.authSuccess++; }
  recordAuthFailure() { this.counters.authFailures++; }
  recordAuthTimeout() { this.counters.authTimeouts++; }
  recordUnauthorizedSubscription() { this.counters.unauthorizedSubscriptionAttempts++; }
  recordRateLimitViolation() { this.counters.rateLimitViolations++; }
  recordHeartbeatSweep() { this.counters.heartbeatSweeps++; }
  recordHeartbeatTimeout() { this.counters.heartbeatTimeoutsTerminated++; }
  recordSyncRequest(replayed = 0) {
    this.counters.syncRequests++;
    this.counters.syncEventsReplayed += replayed;
  }

  /**
   * Generates sanitized real-time health and operational metrics report
   */
  getDiagnostics() {
    const uptimeSec = Math.floor((Date.now() - new Date(this.startedAt).getTime()) / 1000);
    const subMetrics = this.subscriptionManager.getMetrics();
    const broadMetrics = this.broadcaster.metrics;

    return {
      status: 'operational',
      uptimeSeconds: uptimeSec,
      startedAt: this.startedAt,
      connections: {
        activeTotal: this.registry.count(),
        activeAuthenticated: this.registry.authenticatedCount(),
        attemptsTotal: this.counters.connectionAttempts,
        disconnectionsTotal: this.counters.disconnections,
        authSuccessTotal: this.counters.authSuccess,
        authFailuresTotal: this.counters.authFailures,
        authTimeoutsTotal: this.counters.authTimeouts,
        heartbeatSweepsTotal: this.counters.heartbeatSweeps,
        heartbeatTimeoutsTotal: this.counters.heartbeatTimeoutsTerminated,
        rateLimitViolationsTotal: this.counters.rateLimitViolations
      },
      subscriptions: {
        activeChannels: subMetrics.activeChannels,
        totalSubscriptions: subMetrics.totalSubscriptions,
        unauthorizedAttemptsTotal: this.counters.unauthorizedSubscriptionAttempts,
        channelBreakdown: subMetrics.channels
      },
      events: {
        eventsBroadcastTotal: broadMetrics.eventsBroadcast,
        framesDeliveredTotal: broadMetrics.framesDelivered,
        deliveryFailuresTotal: broadMetrics.deliveryFailures,
        lastEventAt: broadMetrics.lastEventAt,
        syncRequestsTotal: this.counters.syncRequests,
        syncEventsReplayedTotal: this.counters.syncEventsReplayed
      },
      memory: {
        rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMb: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 10) / 10
      }
    };
  }

  reset() {
    this.counters = {
      connectionAttempts: 0,
      disconnections: 0,
      authSuccess: 0,
      authFailures: 0,
      authTimeouts: 0,
      unauthorizedSubscriptionAttempts: 0,
      rateLimitViolations: 0,
      heartbeatSweeps: 0,
      heartbeatTimeoutsTerminated: 0,
      syncRequests: 0,
      syncEventsReplayed: 0
    };
  }
}

export const realtimeMetrics = new RealtimeMetricsService();
export default realtimeMetrics;
