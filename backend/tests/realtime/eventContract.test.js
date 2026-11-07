/**
 * CareConnect Ethiopia - Standardized Real-Time Event Contract Test Suite
 * Verifies envelope validation, schema versioning, non-PII sanitization,
 * channel routing, connection deduplication, and outbox event integration.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  REALTIME_EVENT_TYPES,
  createRealtimeEvent,
  validateEventEnvelope,
  sanitizePayloadData
} from '../../src/realtime/eventContract.js';
import { EventBroadcaster } from '../../src/realtime/eventBroadcaster.js';
import { SubscriptionManager } from '../../src/realtime/subscriptionManager.js';
import { ConnectionRegistry } from '../../src/realtime/connectionRegistry.js';
import { createMockWebSocketPair } from './mockRealtimeClient.js';
import { SERVER_MESSAGE_TYPES } from '../../src/constants/realtime.js';
import { OUTBOX_EVENT_TYPES } from '../../src/constants/jobs.js';

describe('Standardized Real-Time Event Contracts Suite — Commit 108', () => {
  let registry;
  let subManager;
  let broadcaster;

  beforeEach(() => {
    registry = new ConnectionRegistry();
    subManager = new SubscriptionManager({ registry });
    broadcaster = new EventBroadcaster({ subscriptionManager: subManager });
  });

  afterEach(() => {
    broadcaster.clear();
    subManager.clear();
    registry.clear();
  });

  it('1. Creates well-formed standard event envelope with schema version 1', () => {
    const event = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED, {
      referralId: 'ref-uuid-1234',
      status: 'accepted'
    }, { requestId: 'req-xyz' });

    assert.ok(event.eventId, 'Should contain eventId UUID');
    assert.equal(event.type, 'referral.status_changed');
    assert.equal(event.version, 1);
    assert.ok(event.occurredAt);
    assert.equal(event.requestId, 'req-xyz');
    assert.equal(event.data.referralId, 'ref-uuid-1234');
    assert.equal(event.data.status, 'accepted');

    const validation = validateEventEnvelope(event);
    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);
  });

  it('2. Rejects invalid event envelopes failing schema rules', () => {
    // Missing eventId
    assert.equal(validateEventEnvelope({ type: 'referral.submitted', version: 1, occurredAt: new Date().toISOString(), data: {} }).valid, false);

    // Unregistered event type
    assert.equal(validateEventEnvelope({ eventId: 'uuid', type: 'hacked.event', version: 1, occurredAt: new Date().toISOString(), data: {} }).valid, false);

    // Invalid version
    assert.equal(validateEventEnvelope({ eventId: 'uuid', type: 'referral.submitted', version: 0, occurredAt: new Date().toISOString(), data: {} }).valid, false);

    // Non-object data
    assert.equal(validateEventEnvelope({ eventId: 'uuid', type: 'referral.submitted', version: 1, occurredAt: new Date().toISOString(), data: 'invalid' }).valid, false);
  });

  it('3. Sanitizes and removes sensitive clinical PII and secrets from data', () => {
    const rawData = {
      referralId: 'ref-123',
      referralCode: 'REF-2026-001',
      status: 'SUBMITTED',
      password: 'secret_password_123',
      token: 'jwt_token_abc',
      clinical_notes: 'Patient suffers from acute chest trauma',
      chief_complaint: 'Severe headache and pain',
      patient_national_id: 'ET-ID-99999'
    };

    const sanitized = sanitizePayloadData(rawData);
    assert.equal(sanitized.referralId, 'ref-123');
    assert.equal(sanitized.referralCode, 'REF-2026-001');
    assert.equal(sanitized.status, 'SUBMITTED');

    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.token, undefined);
    assert.equal(sanitized.clinical_notes, undefined);
    assert.equal(sanitized.chief_complaint, undefined);
    assert.equal(sanitized.patient_national_id, undefined);
  });

  it('4. Broadcasts standardized event to subscribers of matching channel', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    const meta = registry.register(serverWs, req);
    meta.authenticated = true;
    meta.user = { userId: 5, facilityId: 'facility-hc-001', roleName: 'HEALTH_CENTRE_STAFF' };

    await subManager.subscribe(meta, 'facility:facility-hc-001');

    const eventReceivedPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    const rtEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_SUBMITTED, {
      referralId: 'ref-123',
      referralCode: 'REF-2026-001',
      originatingFacilityId: 'facility-hc-001'
    });

    const delivered = broadcaster.broadcastToChannels('facility:facility-hc-001', rtEvent);
    assert.equal(delivered, 1);

    const received = await eventReceivedPromise;
    assert.equal(received.type, SERVER_MESSAGE_TYPES.EVENT);
    assert.equal(received.channel, 'facility:facility-hc-001');
    assert.equal(received.event.eventId, rtEvent.eventId);
    assert.equal(received.event.type, 'referral.submitted');

    clientWs.close();
  });

  it('5. Deduplicates delivery when client is subscribed to multiple matching channels', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    const meta = registry.register(serverWs, req);
    meta.authenticated = true;
    meta.user = { userId: 5, facilityId: 'facility-hc-001', roleName: 'SYSTEM_ADMINISTRATOR' };

    // Subscribed to both facility and referral
    await subManager.subscribe(meta, 'facility:facility-hc-001');
    await subManager.subscribe(meta, 'referral:ref-123');

    const messages = [];
    clientWs.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    const rtEvent = createRealtimeEvent(REALTIME_EVENT_TYPES.REFERRAL_STATUS_CHANGED, {
      referralId: 'ref-123',
      status: 'ACCEPTED'
    });

    // Broadcast targeting both channels
    const delivered = broadcaster.broadcastToChannels(['facility:facility-hc-001', 'referral:ref-123'], rtEvent);

    assert.equal(delivered, 1, 'Should deliver only 1 frame to client despite multiple channel matches');
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(messages.length, 1);

    clientWs.close();
  });

  it('6. Translates Transactional Outbox event into standardized real-time broadcast', async () => {
    const { clientWs, serverWs, req } = createMockWebSocketPair();
    const meta = registry.register(serverWs, req);
    meta.authenticated = true;
    meta.user = { userId: 10, facilityId: 'facility-hosp-002', roleName: 'HOSPITAL_STAFF' };

    await subManager.subscribe(meta, 'facility:facility-hosp-002');

    const receivedPromise = new Promise((resolve) => {
      clientWs.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    // Simulated outbox event
    const outboxEvent = {
      id: 'outbox-uuid-999',
      aggregateType: 'referral',
      aggregateId: 'ref-uuid-888',
      eventType: OUTBOX_EVENT_TYPES.REFERRAL_SUBMITTED,
      payload: {
        referralCode: 'REF-2026-OUTBOX',
        receivingFacilityId: 'facility-hosp-002',
        sourceFacilityId: 'facility-hc-001'
      },
      createdAt: new Date().toISOString()
    };

    await broadcaster.handleOutboxEvent(outboxEvent);

    const received = await receivedPromise;
    assert.equal(received.type, SERVER_MESSAGE_TYPES.EVENT);
    assert.equal(received.event.type, 'referral.submitted');
    assert.equal(received.event.data.referralCode, 'REF-2026-OUTBOX');

    clientWs.close();
  });
});
