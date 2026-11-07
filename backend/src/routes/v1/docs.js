/**
 * CareConnect Ethiopia - Interactive API Documentation Specification
 * OpenAPI 3.0.3 Specification for Core REST Endpoints.
 */

import { Router } from 'express';

const router = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CareConnect Ethiopia REST API',
    version: '1.0.0',
    description: 'National smart healthcare referral and patient coordination service connecting Health Centres, Hospitals, Transport Fleet, and Regional Health Authorities across Ethiopia.',
    contact: {
      name: 'CareConnect Ethiopia Technical Architecture Team',
      email: 'tech@careconnect.et',
      url: 'https://careconnect.et'
    },
    license: {
      name: 'Proprietary - Ministry of Health Ethiopia',
      url: 'https://moh.gov.et'
    }
  },
  servers: [
    { url: '/api/v1', description: 'Default API Gateway Root' },
    { url: 'http://localhost:5000/api/v1', description: 'Local Development Environment' }
  ],
  tags: [
    { name: 'Health & Diagnostics', description: 'Platform health probes and dependency diagnostic checks' },
    { name: 'Authentication', description: 'User authentication, token lifecycle and session management' },
    { name: 'Facilities', description: 'Healthcare facility directory, tier levels and bed capacity' },
    { name: 'Patients', description: 'National patient registry, Fayda ID and patronymic records' },
    { name: 'Referrals', description: 'End-to-end referral workflow, status transitions and attachments' },
    { name: 'Documents & Attachments', description: 'Secure medical referral attachments, private storage, versioning and verification' },
    { name: 'Transport', description: 'Emergency ambulance request and vehicle dispatch tracking' },
    { name: 'AI & Triage', description: 'Machine learning clinical matching and priority scoring' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JSON Web Token in the Authorization header: Bearer <token>'
      }
    },
    schemas: {
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          meta: { $ref: '#/components/schemas/PaginationMeta' }
        },
        required: ['success', 'message', 'data']
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid referral payload' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Field validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'priority' },
                    message: { type: 'string', example: 'Priority must be ROUTINE, URGENT, or EMERGENCY' }
                  }
                }
              },
              timestamp: { type: 'string', format: 'date-time' }
            },
            required: ['code', 'message', 'timestamp']
          },
          requestId: { type: 'string', example: 'req-9876543210abcdef' }
        },
        required: ['success', 'message', 'error']
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 142 },
          totalPages: { type: 'integer', example: 8 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false }
        }
      },
      HealthCheckResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['HEALTHY', 'DEGRADED'], example: 'HEALTHY' },
          service: { type: 'string', example: 'careconnect-backend-api' },
          version: { type: 'string', example: '1.0.0' },
          environment: { type: 'string', example: 'development' },
          uptimeSeconds: { type: 'integer', example: 3420 },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'UP' },
                  latencyMs: { type: 'number', example: 28.4 }
                }
              },
              memory: {
                type: 'object',
                properties: {
                  heapUsedMb: { type: 'integer', example: 64 },
                  heapTotalMb: { type: 'integer', example: 128 },
                  rssMb: { type: 'integer', example: 180 }
                }
              }
            }
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'doctor@tikuranbessa.gov.et' },
          password: { type: 'string', format: 'password', example: 'SecureP@ss2026' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'nurse.helen@bolehealth.gov.et' },
          password: { type: 'string', minLength: 8, example: 'CareSecure#2026' },
          firstName: { type: 'string', example: 'Helen' },
          lastName: { type: 'string', example: 'Tadesse' },
          roleId: { type: 'integer', example: 2 },
          facilityId: { type: 'string', format: 'uuid', example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' }
        }
      },
      AuthTokenResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'integer', example: 900 }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health & Diagnostics'],
        summary: 'System diagnostics and database health status',
        responses: {
          '200': {
            description: 'System operational and database healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthCheckResponse' } } }
          },
          '503': {
            description: 'Degraded health (e.g. database connection down)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthCheckResponse' } } }
          }
        }
      }
    },
    '/health/liveness': {
      get: {
        tags: ['Health & Diagnostics'],
        summary: 'Container orchestrator liveness probe',
        responses: {
          '200': {
            description: 'Process alive and responsive',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ALIVE' } } } } }
          }
        }
      }
    },
    '/health/readiness': {
      get: {
        tags: ['Health & Diagnostics'],
        summary: 'Container orchestrator readiness probe',
        responses: {
          '200': { description: 'Dependencies ready to serve traffic' },
          '503': { description: 'Dependencies not ready' }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new healthcare professional or coordinator account',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
        },
        responses: {
          '201': { description: 'User account created successfully' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email address already registered' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate credentials and obtain JWT session tokens',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          '200': { description: 'Authentication successful with tokens' },
          '401': { description: 'Invalid email or password' },
          '429': { description: 'Rate limit exceeded on authentication attempts' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Exchange valid refresh token for fresh access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } } }
        },
        responses: {
          '200': { description: 'New access token issued' },
          '401': { description: 'Invalid or revoked refresh token' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Terminate session and revoke refresh token',
        responses: {
          '200': { description: 'Session terminated' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Retrieve authenticated user identity and facility affiliation',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Current user profile payload' },
          '401': { description: 'Missing or invalid authorization token' }
        }
      }
    },
    '/facilities': {
      get: {
        tags: ['Facilities'],
        summary: 'Query healthcare facility directory with geolocation and tier filtering',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'tier', in: 'query', schema: { type: 'string' } },
          { name: 'region', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          '200': { description: 'Paginated list of healthcare facilities' }
        }
      }
    },
    '/patients': {
      get: {
        tags: ['Patients'],
        summary: 'Search registered patients by Fayda ID or name',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Matching patient records' } }
      },
      post: {
        tags: ['Patients'],
        summary: 'Register new patient with Ethiopian three-name patronymic format',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Patient registered successfully' } }
      }
    },
    '/referrals': {
      get: {
        tags: ['Referrals'],
        summary: 'List incoming or outgoing referrals filtered by facility and status',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Referral collection' } }
      },
      post: {
        tags: ['Referrals'],
        summary: 'Draft or submit electronic healthcare referral',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Referral submitted' } }
      }
    },
    '/documents': {
      post: {
        tags: ['Documents & Attachments'],
        summary: 'Upload and attach a validated medical document (PDF, JPEG, PNG)',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Document uploaded and persisted safely' } }
      }
    },
    '/documents/{documentId}': {
      get: {
        tags: ['Documents & Attachments'],
        summary: 'Retrieve sanitized document metadata',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Document metadata' } }
      },
      delete: {
        tags: ['Documents & Attachments'],
        summary: 'Soft-delete a document with mandatory justification',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Document soft-deleted' } }
      }
    },
    '/documents/{documentId}/download': {
      get: {
        tags: ['Documents & Attachments'],
        summary: 'Authorized binary download with secure disposition headers',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Binary stream attachment' } }
      }
    },
    '/documents/{documentId}/preview': {
      get: {
        tags: ['Documents & Attachments'],
        summary: 'Authorized inline preview with anti-sniffing headers',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Inline binary preview' } }
      }
    },
    '/documents/{documentId}/replace': {
      post: {
        tags: ['Documents & Attachments'],
        summary: 'Upload replacement version with optimistic concurrency check',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'New version created' } }
      }
    },
    '/documents/{documentId}/versions': {
      get: {
        tags: ['Documents & Attachments'],
        summary: 'Query complete version history lineage for a document group',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'List of historical versions' } }
      }
    },
    '/documents/{documentId}/verify': {
      post: {
        tags: ['Documents & Attachments'],
        summary: 'Record human procedural review outcome (VERIFIED, REJECTED, REQUIRES_CORRECTION)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Verification status updated' } }
      }
    },
    '/documents/{documentId}/archive': {
      post: {
        tags: ['Documents & Attachments'],
        summary: 'Transition document to ARCHIVED lifecycle state',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Document archived' } }
      }
    },
    '/documents/{documentId}/processing': {
      get: {
        tags: ['Documents & Attachments'],
        summary: 'Inspect asynchronous AI/OCR processing preparation status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Processing pipeline status' } }
      }
    },
    '/transport/requests': {
      get: {
        tags: ['Transport'],
        summary: 'List pending ambulance transport dispatch requests',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Transport requests' } }
      }
    },
    '/ai/recommend': {
      post: {
        tags: ['AI & Triage'],
        summary: 'Compute multi-criteria hospital matching and ranking scores',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Ranked hospital recommendations' } }
      }
    }
  }
};

router.get('/', (req, res) => {
  res.json(openApiSpec);
});

export default router;
