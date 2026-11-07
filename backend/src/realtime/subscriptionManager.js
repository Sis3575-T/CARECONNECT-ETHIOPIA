/**
 * CareConnect Ethiopia - Real-Time Subscription Manager
 * Enforces server-side channel authorization, tenancy isolation, subscription limits,
 * and maintains inverted channel-to-connection mapping for instant event routing.
 */

import config from '../config/env.js';
import { CHANNEL_TYPES, SERVER_MESSAGE_TYPES, CLIENT_MESSAGE_TYPES } from '../constants/realtime.js';
import referralRepository from '../repositories/referralRepository.js';

export class SubscriptionManager {
  constructor(options = {}) {
    this.maxSubscriptionsPerClient = options.maxSubscriptionsPerClient || config.realtime?.maxSubscriptionsPerClient || 25;
    this.channelToConnections = new Map(); // channelName -> Set<connectionId>
    this.connectionRegistry = options.registry || null;
    this.referralRepo = options.referralRepo || referralRepository;
  }

  setRegistry(registry) {
    this.connectionRegistry = registry;
  }

  /**
   * Parses and validates channel string structure
   * @param {string} channel
   * @returns {{ valid: boolean, type?: string, target?: string, error?: string }}
   */
  parseChannel(channel) {
    if (!channel || typeof channel !== 'string') {
      return { valid: false, error: 'Channel name must be a non-empty string' };
    }

    const cleanChannel = channel.trim();
    if (cleanChannel.length > 100) {
      return { valid: false, error: 'Channel name exceeds maximum length of 100 characters' };
    }

    // Prohibit traversal, wildcards, injection characters
    if (/[\s*?<>#&\\/]/g.test(cleanChannel)) {
      return { valid: false, error: 'Channel name contains invalid special characters' };
    }

    const parts = cleanChannel.split(':');
    const type = parts[0].toLowerCase();
    const target = parts.slice(1).join(':') || null;

    const allowedTypes = Object.values(CHANNEL_TYPES);
    if (!allowedTypes.includes(type)) {
      return {
        valid: false,
        error: `Unsupported channel type '${type}'. Allowed: ${allowedTypes.join(', ')}`
      };
    }

    // Target required for user, facility, referral
    if (['user', 'facility', 'referral'].includes(type) && !target) {
      return { valid: false, error: `Channel type '${type}' requires a resource identifier (e.g. ${type}:<id>)` };
    }

    return { valid: true, type, target, channel: cleanChannel };
  }

  /**
   * Authorizes a client's subscription request against their authenticated session
   * @param {object} user - Authenticated user context from meta.user
   * @param {string} channel - Channel identifier
   * @returns {Promise<{ authorized: boolean, reason?: string }>}
   */
  async authorizeChannel(user, channel) {
    if (!user) {
      return { authorized: false, reason: 'Authentication required to subscribe to channels' };
    }

    const parsed = this.parseChannel(channel);
    if (!parsed.valid) {
      return { authorized: false, reason: parsed.error };
    }

    const roleName = user.roleName;
    const isAdmin = roleName === 'SYSTEM_ADMINISTRATOR' || roleName === 'REGIONAL_OFFICER';

    switch (parsed.type) {
      case CHANNEL_TYPES.USER: {
        const targetUserId = Number(parsed.target);
        if (isAdmin || user.userId === targetUserId || user.id === targetUserId) {
          return { authorized: true };
        }
        return { authorized: false, reason: 'Access denied: Cannot subscribe to another user personal channel' };
      }

      case CHANNEL_TYPES.FACILITY: {
        if (isAdmin) return { authorized: true };
        const facilityId = parsed.target;
        const matchesPrimary = user.facilityId && String(user.facilityId) === String(facilityId);
        const matchesAssigned = Array.isArray(user.assignedFacilityIds) &&
          user.assignedFacilityIds.map(String).includes(String(facilityId));

        if (matchesPrimary || matchesAssigned) {
          return { authorized: true };
        }
        return { authorized: false, reason: `Access denied: You are not assigned to facility '${facilityId}'` };
      }

      case CHANNEL_TYPES.REFERRAL: {
        if (isAdmin) return { authorized: true };

        // Fetch referral to verify facility tenancy and clinician assignment
        try {
          const referral = await this.referralRepo.findById(parsed.target);
          if (!referral) {
            return { authorized: false, reason: `Referral '${parsed.target}' not found` };
          }

          const userFacility = user.facilityId ? String(user.facilityId) : null;
          const userAssigned = Array.isArray(user.assignedFacilityIds)
            ? user.assignedFacilityIds.map(String)
            : [];
          const userFacilities = userFacility ? [userFacility, ...userAssigned] : userAssigned;

          const origFacility = referral.originating_facility_id || referral.source_facility_id;
          const recvFacility = referral.receiving_facility_id || referral.target_facility_id;

          const isOrigin = origFacility && userFacilities.includes(String(origFacility));
          const isRecv = recvFacility && userFacilities.includes(String(recvFacility));
          const isClinician = referral.referring_clinician_id &&
            Number(referral.referring_clinician_id) === Number(user.userId);
          const isTransportCoordinator = roleName === 'TRANSPORT_COORDINATOR' || roleName === 'AMBULANCE_DRIVER';

          if (isOrigin || isRecv || isClinician || isTransportCoordinator) {
            return { authorized: true };
          }

          return { authorized: false, reason: 'Access denied: Referral does not belong to your authorized facility' };
        } catch (err) {
          return { authorized: false, reason: 'Failed to verify referral authorization' };
        }
      }

      case CHANNEL_TYPES.TRANSPORT: {
        if (isAdmin) return { authorized: true };
        const allowedRoles = ['TRANSPORT_COORDINATOR', 'AMBULANCE_DRIVER', 'HOSPITAL_TRIAGE', 'HOSPITAL_STAFF'];
        if (allowedRoles.includes(roleName)) {
          if (!parsed.target) return { authorized: true };
          // If facility targeted, check assignment
          const facilityId = parsed.target;
          const userFacility = user.facilityId ? String(user.facilityId) : null;
          if (userFacility === String(facilityId) || user.assignedFacilityIds?.map(String).includes(String(facilityId))) {
            return { authorized: true };
          }
        }
        return { authorized: false, reason: 'Access denied: Transport coordination role or facility assignment required' };
      }

      case CHANNEL_TYPES.ADMIN: {
        if (isAdmin) return { authorized: true };
        return { authorized: false, reason: 'Access denied: Administrator permissions required' };
      }

      default:
        return { authorized: false, reason: 'Unauthorized channel type' };
    }
  }

  /**
   * Subscribes a connection to an authorized channel
   * @param {object} meta - Connection metadata
   * @param {string} channel
   * @returns {Promise<{ success: boolean, channel: string, duplicate?: boolean, error?: string }>}
   */
  async subscribe(meta, channel) {
    if (!meta || !meta.authenticated || !meta.user) {
      return { success: false, channel, error: 'Authentication required before subscribing' };
    }

    const parsed = this.parseChannel(channel);
    if (!parsed.valid) {
      return { success: false, channel, error: parsed.error };
    }

    const channelName = parsed.channel;

    // Check duplicate
    if (meta.subscriptions.has(channelName)) {
      return { success: true, channel: channelName, duplicate: true };
    }

    // Check capacity limit per connection
    if (meta.subscriptions.size >= this.maxSubscriptionsPerClient) {
      return {
        success: false,
        channel: channelName,
        error: `Subscription limit reached (${this.maxSubscriptionsPerClient} channels maximum)`
      };
    }

    // Check server-side authorization
    const authCheck = await this.authorizeChannel(meta.user, channelName);
    if (!authCheck.authorized) {
      return { success: false, channel: channelName, error: authCheck.reason };
    }

    // Record subscription
    meta.subscriptions.add(channelName);
    if (!this.channelToConnections.has(channelName)) {
      this.channelToConnections.set(channelName, new Set());
    }
    this.channelToConnections.get(channelName).add(meta.connectionId);

    return { success: true, channel: channelName };
  }

  /**
   * Unsubscribes a connection from a channel
   * @param {object} meta
   * @param {string} channel
   */
  unsubscribe(meta, channel) {
    if (!meta) return { success: false, channel };
    const cleanChannel = String(channel).trim();

    meta.subscriptions.delete(cleanChannel);
    const conns = this.channelToConnections.get(cleanChannel);
    if (conns) {
      conns.delete(meta.connectionId);
      if (conns.size === 0) {
        this.channelToConnections.delete(cleanChannel);
      }
    }
    return { success: true, channel: cleanChannel };
  }

  /**
   * Automatically subscribes newly authenticated user to default channels
   * (e.g. user:{userId} and facility:{facilityId})
   * @param {object} meta
   */
  async autoSubscribe(meta) {
    if (!meta || !meta.authenticated || !meta.user) return [];
    const subscribed = [];

    // 1. User's personal channel
    const userChannel = `${CHANNEL_TYPES.USER}:${meta.user.userId || meta.user.id}`;
    const userSub = await this.subscribe(meta, userChannel);
    if (userSub.success) subscribed.push(userChannel);

    // 2. Primary facility channel
    if (meta.user.facilityId) {
      const facilityChannel = `${CHANNEL_TYPES.FACILITY}:${meta.user.facilityId}`;
      const facSub = await this.subscribe(meta, facilityChannel);
      if (facSub.success) subscribed.push(facilityChannel);
    }

    // 3. Transport channel for transport roles
    if (['TRANSPORT_COORDINATOR', 'AMBULANCE_DRIVER'].includes(meta.user.roleName)) {
      const transportSub = await this.subscribe(meta, CHANNEL_TYPES.TRANSPORT);
      if (transportSub.success) subscribed.push(CHANNEL_TYPES.TRANSPORT);
    }

    // 4. Admin channel for system administrators
    if (meta.user.roleName === 'SYSTEM_ADMINISTRATOR') {
      const adminSub = await this.subscribe(meta, CHANNEL_TYPES.ADMIN);
      if (adminSub.success) subscribed.push(CHANNEL_TYPES.ADMIN);
    }

    return subscribed;
  }

  /**
   * Cleans up all subscriptions associated with a disconnected connection
   * @param {string} connectionId
   */
  cleanupConnection(connectionId) {
    if (!connectionId) return;
    for (const [channel, conns] of this.channelToConnections.entries()) {
      conns.delete(connectionId);
      if (conns.size === 0) {
        this.channelToConnections.delete(channel);
      }
    }
  }

  /**
   * Retrieves all connection metadata objects subscribed to a given channel
   * @param {string} channel
   * @returns {Array<object>}
   */
  getSubscribers(channel) {
    const connIds = this.channelToConnections.get(channel);
    if (!connIds || connIds.size === 0 || !this.connectionRegistry) {
      return [];
    }

    const results = [];
    for (const connId of connIds) {
      const meta = this.connectionRegistry.get(connId);
      if (meta && meta.ws && meta.ws.readyState === 1 /* OPEN */) {
        results.push(meta);
      }
    }
    return results;
  }

  /**
   * Returns active subscription metrics
   */
  getMetrics() {
    let totalSubs = 0;
    const channels = {};
    for (const [channel, conns] of this.channelToConnections.entries()) {
      channels[channel] = conns.size;
      totalSubs += conns.size;
    }
    return {
      activeChannels: this.channelToConnections.size,
      totalSubscriptions: totalSubs,
      channels
    };
  }

  /**
   * Clears all subscriptions (for shutdown or tests)
   */
  clear() {
    this.channelToConnections.clear();
  }
}

export const subscriptionManager = new SubscriptionManager();
export default subscriptionManager;
