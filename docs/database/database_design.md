# Database Design

Version: 1.0

## Purpose
Defines the logical and physical data model for Stadium Command Center.

## Database Philosophy
- PostgreSQL as primary relational database
- UUID primary keys
- Soft deletes (`deleted_at`)
- Audit logging
- Normalized schema
- Index frequently queried fields

## Core Entities
- User
- Role
- Venue
- Event
- Zone
- Gate
- Facility
- Route
- StadiumPackage
- Dataset
- KnowledgeDocument
- Conversation
- Message
- Recommendation
- ReasoningLog
- PromptTemplate
- Feedback
- Incident
- Notification
- AuditLog

## Relationship Overview

Venue
└── Event
    ├── Zone
    │   ├── Gate
    │   └── Facility
    └── Route

User
└── Conversation
    └── Message
        └── Recommendation
            └── ReasoningLog

Dataset
└── KnowledgeDocument

## Common Fields
Every table should contain:
- id (UUID)
- created_at
- updated_at
- deleted_at (nullable)

## User
Fields:
- id
- name
- email (unique)
- password_hash
- role_id
- preferred_language
- accessibility_preferences
- last_login

## Venue
Fields:
- id
- name
- city
- country
- capacity
- stadium_package_id

## Event
Fields:
- id
- venue_id
- title
- start_time
- end_time
- status

## Stadium Package
A stadium is loaded through configuration, not code.

Package Structure:
- stadium.json
- zones.json
- gates.json
- routes.json
- facilities.json
- parking.json
- emergency.json
- translations.json
- vendors.json

## AI Tables
Recommendation:
- recommendation
- reasoning
- confidence_score
- alternatives

ReasoningLog:
- prompt
- retrieved_context
- model
- latency
- token_usage

PromptTemplate:
- name
- version
- template

## Index Strategy
- email UNIQUE
- venue_id INDEX
- event_id INDEX
- created_at INDEX

## Future Expansion
- CrowdSnapshot
- Sensor
- Camera
- Prediction
- DigitalTwin

## Design Principles
- Stadium independent
- AI explainability
- Minimal redundancy
- Extensible schema
