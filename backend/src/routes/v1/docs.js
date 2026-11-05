/**
 * CareConnect Ethiopia - Interactive API Documentation Specification
 */

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'CareConnect Ethiopia REST API',
      version: '1.0.0',
      description: 'National smart healthcare referral and patient coordination service connecting Health Centres, Hospitals, Transport Fleet, and Regional Health Authorities.'
    },
    servers: [
      { url: '/api/v1', description: 'Production / Local v1 API Gateway' }
    ],
    paths: {
      '/health': {
        get: { summary: 'System diagnostics and database health checks' }
      },
      '/auth/login': {
        post: { summary: 'Authenticate user credentials and receive JWT access & refresh tokens' }
      },
      '/facilities': {
        get: { summary: 'Query healthcare facility directory with geolocation and tier filtering' }
      },
      '/patients': {
        get: { summary: 'Search registered patients by Fayda ID or name' },
        post: { summary: 'Register new patient with Ethiopian three-name patronymic format' }
      },
      '/referrals': {
        post: { summary: 'Draft or submit electronic healthcare referral' }
      },
      '/transport/requests': {
        get: { summary: 'List pending ambulance transport dispatch requests' }
      },
      '/ai/recommend': {
        post: { summary: 'Compute multi-criteria hospital matching and ranking scores' }
      }
    }
  });
});

export default router;
