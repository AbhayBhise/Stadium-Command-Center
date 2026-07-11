# API Endpoints Specification

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines every REST endpoint exposed by Stadium Command Center (SCC).

These endpoints act as the contract between the frontend, backend, AI Orchestration Layer, and future third-party integrations.

All endpoints are versioned under:

```
/api/v1
```

---

# 2. Endpoint Naming Conventions

The API follows RESTful principles.

Examples

```
GET    /stadiums

GET    /stadiums/{id}

POST   /stadiums

PUT    /stadiums/{id}

PATCH  /stadiums/{id}

DELETE /stadiums/{id}
```

Rules

- Use plural resource names
- Use nouns instead of verbs
- Stateless requests
- JSON only
- HTTPS only

---

# 3. Authentication Endpoints

## Register

POST

```
/api/v1/auth/register
```

Description

Creates a new user account.

Authentication

Public

---

## Login

POST

```
/api/v1/auth/login
```

Authentication

Public

Returns

- JWT
- User Profile
- Role

---

## Current User

GET

```
/api/v1/auth/me
```

Authentication

Required

---

# 4. User Endpoints

## Get Profile

GET

```
/api/v1/users/profile
```

---

## Update Profile

PUT

```
/api/v1/users/profile
```

---

## Update Language

PATCH

```
/api/v1/users/language
```

---

## Update Accessibility

PATCH

```
/api/v1/users/accessibility
```

---

# 5. Stadium Endpoints

## List Stadiums

GET

```
/api/v1/stadiums
```

Public

---

## Get Stadium

GET

```
/api/v1/stadiums/{stadiumId}
```

---

## Upload Stadium Package

POST

```
/api/v1/stadiums/upload
```

Administrator only.

---

## Validate Stadium Package

POST

```
/api/v1/stadiums/validate
```

Administrator only.

---

# 6. Event Endpoints

## List Events

GET

```
/api/v1/events
```

---

## Event Details

GET

```
/api/v1/events/{eventId}
```

---

## Live Event

GET

```
/api/v1/events/live
```

---

# 7. AI Endpoint

## AI Chat

POST

```
/api/v1/ai/chat
```

Purpose

Single unified AI endpoint.

The backend automatically performs:

- Authentication
- Role validation
- Intent detection
- Context building
- Knowledge retrieval
- AI reasoning
- Explainability
- Confidence estimation

before returning a response.

Frontend never selects AI capabilities manually.

---

# 8. Conversation Endpoints

## Create Conversation

POST

```
/api/v1/conversations
```

---

## List Conversations

GET

```
/api/v1/conversations
```

---

## Conversation Details

GET

```
/api/v1/conversations/{conversationId}
```

---

## Send Message

POST

```
/api/v1/conversations/{conversationId}/messages
```

---

## Delete Conversation

DELETE

```
/api/v1/conversations/{conversationId}
```

---

# 9. Recommendation Endpoints

## Recommendation History

GET

```
/api/v1/recommendations
```

---

## Recommendation Details

GET

```
/api/v1/recommendations/{recommendationId}
```

---

## Recommendation Feedback

POST

```
/api/v1/recommendations/{recommendationId}/feedback
```

---

# 10. Knowledge Base Endpoints

## Upload Knowledge

POST

```
/api/v1/knowledge/upload
```

---

## Search Knowledge

POST

```
/api/v1/knowledge/search
```

---

## List Knowledge Documents

GET

```
/api/v1/knowledge
```

---

## Delete Knowledge Document

DELETE

```
/api/v1/knowledge/{documentId}
```

---

# 11. Dataset Endpoints

## Upload Dataset

POST

```
/api/v1/datasets/upload
```

---

## List Datasets

GET

```
/api/v1/datasets
```

---

## Dataset Details

GET

```
/api/v1/datasets/{datasetId}
```

---

## Delete Dataset

DELETE

```
/api/v1/datasets/{datasetId}
```

---

# 12. Incident Endpoints

## Report Incident

POST

```
/api/v1/incidents
```

Volunteer+

---

## Incident List

GET

```
/api/v1/incidents
```

Organizer+

---

## Incident Details

GET

```
/api/v1/incidents/{incidentId}
```

---

## Update Incident

PATCH

```
/api/v1/incidents/{incidentId}
```

---

# 13. Notification Endpoints

## My Notifications

GET

```
/api/v1/notifications
```

---

## Mark Read

PATCH

```
/api/v1/notifications/{notificationId}
```

---

# 14. Administration Endpoints

Administrator only.

## Users

GET

```
/api/v1/admin/users
```

---

## Analytics

GET

```
/api/v1/admin/analytics
```

---

## Audit Logs

GET

```
/api/v1/admin/logs
```

---

## Prompt Templates

GET

```
/api/v1/admin/prompts
```

---

## System Configuration

GET

```
/api/v1/admin/config
```

---

# 15. Health Endpoints

## API Health

GET

```
/api/v1/health
```

Returns

- API Status
- Database Status
- Cache Status
- AI Status

---

# 16. Endpoint Security

Every protected endpoint must implement

- JWT Authentication
- RBAC
- Request Validation
- Rate Limiting
- Structured Logging

AI endpoints additionally require

- Prompt Injection Protection
- Output Validation
- Conversation Tracking

---

# 17. API Versioning

Current Version

```
v1
```

Future versions

```
v2

v3
```

must remain backward compatible whenever practical.

---

# 18. Future Endpoints

The architecture supports future APIs including

- Voice Assistant
- Indoor Navigation
- WebSocket Live Events
- IoT Devices
- CCTV Integration
- Digital Twin
- Emergency Broadcast
- Crowd Prediction
- Push Notifications

---

# 19. Summary

The SCC API is organized around business domains rather than implementation details. Each endpoint is cohesive, secure, versioned, and designed to integrate cleanly with the AI Orchestration Layer while remaining scalable and maintainable for future expansion.