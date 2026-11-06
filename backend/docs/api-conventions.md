# CareConnect Ethiopia — API Conventions & Response Contracts

## 1. URI Namespace & Versioning
All REST endpoints are versioned under the canonical prefix:
`/api/v1`

| HTTP Verb | Operation Semantics |
|---|---|
| `GET` | Retrieve a resource or list of resources. Idempotent and safe. |
| `POST` | Create a new entity or trigger an operational workflow. |
| `PUT` | Full replacement of an existing resource. |
| `PATCH` | Partial update of designated resource fields. |
| `DELETE` | Soft-delete or archive an entity. |

---

## 2. Standard Response Contracts

### 2.1 Success Response (`successResponse`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "id": "REF-20261105-00042",
    "status": "ACCEPTED"
  },
  "meta": {
    "timestamp": "2026-11-06T18:40:00.000Z"
  }
}
```

### 2.2 Paginated Success Response (`paginatedResponse`)
```json
{
  "success": true,
  "message": "Referrals retrieved successfully",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "timestamp": "2026-11-06T18:40:00.000Z"
  }
}
```

### 2.3 Standard Error Response (`errorResponse`)
```json
{
  "success": false,
  "message": "A validation error occurred",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Valid email address required" }
    ]
  },
  "requestId": "req-98f24bc109a1"
}
```

---

## 3. Query Parameter Conventions
- **Pagination:** `?page=1&limit=20` (defaults: `page=1`, `limit=20`, `max=100`).
- **Sorting:** `?sortBy=created_at&sortOrder=asc|desc` (default: `desc`).
- **Filtering:** Case-insensitive exact matches: `?status=SUBMITTED&priority=EMERGENCY`.
- **Search:** Generic substring match: `?search=Tikur`.
