# CareConnect Ethiopia - Database Architecture Documentation

## Overview
This directory houses the schema specifications, data dictionary, entity-relationship models, and migration guides for CareConnect Ethiopia.

## Architecture
- `migrations/`: Sequential SQL DDL scripts governing tables, constraints, foreign keys, and indexes.
- `seeds/`: Fictional test fixtures for local development and integration testing.
- `schema/`: Generated or target PostgreSQL schema references.
- `tests/`: Referential integrity and constraint verification suites.
- `connection.js`: PostgreSQL connection pool wrapper with Neon cloud support and SSL configuration.
- `migrate.js`: Safe forward migration runner and migration status checker.
