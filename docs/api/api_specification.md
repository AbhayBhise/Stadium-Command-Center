# API Specification

Version: 1.0

Status: Approved

---

# 1. Purpose

This document defines the REST API specification for Stadium Command Center (SCC). The APIs are designed to support a modular, AI-first architecture and serve as the contract between the frontend, backend, and AI orchestration layer.

All APIs shall follow RESTful principles, return JSON responses, and use JWT-based authentication where applicable.

---

# 2. API Design Principles

The APIs must satisfy the following principles:

- RESTful resource naming
- Stateless communication
- JSON request/response
- Versioned endpoints
- Secure by default
- Consistent error responses
- Idempotent where applicable
- Input validation
- Rate limiting
- Structured logging

---

# 3. Base URL

Development

```
http://localhost:5000/api/v1
```

Production

```
https://your-domain.com/api/v1
```

---

# 4. Authentication

Authentication Method

- JWT Access Token
- Refresh Token (Future)

Authorization

Role Based Access Control (RBAC)

Supported Roles

- Visitor
- Volunteer
- Organizer
- Administrator

Authorization Header

```
Authorization: Bearer <JWT_TOKEN>
```

---

# 5. Standard Response Format

## Success

```json
{
    "success": true,
    "message": "Request completed successfully.",
    "data": {},
    "timestamp": "ISO8601"
}
```

---

## Error

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid request."
    },
    "timestamp": "ISO8601"
}
```

---

# 6. Authentication APIs

## Register

POST

```
/auth/register
```

Request

```json
{
    "name": "",
    "email": "",
    "password": ""
}
```

Response

```json
{
    "userId": "",
    "token": ""
}
```

---

## Login

POST

```
/auth/login
```

---

## Logout

POST

```
/auth/logout
```

---

## Get Current User

GET

```
/auth/me
```

---

# 7. User APIs

## Get Profile

GET

```
/users/profile
```

---

## Update Profile

PUT

```
/users/profile
```

---

## Update Language Preference

PATCH

```
/users/language
```

---

## Update Accessibility Preferences

PATCH

```
/users/accessibility
```

---

# 8. Stadium APIs

## Get All Stadiums

GET

```
/stadiums
```

---

## Get Stadium Details

GET

```
/stadiums/{id}
```

---

## Upload Stadium Package

POST

```
/stadiums/upload
```

Accepts

- ZIP
- JSON Package

---

## Get Stadium Knowledge

GET

```
/stadiums/{id}/knowledge
```

---

# 9. Event APIs

## Get Events

GET

```
/events
```

---

## Get Event

GET

```
/events/{id}
```

---

## Get Live Match Status

GET

```
/events/live
```

---

# 10. AI APIs

The Stadium Command Center exposes a **single AI interaction endpoint**. The frontend does not directly invoke specialized AI capabilities such as navigation, translation, or volunteer assistance. Instead, every request is processed through the AI Orchestration Layer, which automatically determines the user's intent, permissions, and required reasoning workflow.

---

## AI Chat

**POST**

```http
/ai/chat
```

### Purpose

Provides a unified entry point for all AI interactions.

The backend automatically performs:

1. User Authentication
2. User Profile Loading
3. Role & Permission Validation
4. Intent Detection
5. Context Building
6. Knowledge Retrieval
7. AI Reasoning
8. Response Validation
9. Explainability Generation
10. Confidence Estimation

before returning the final response.

---

### Internal Processing Pipeline

```
Authenticate User
        ↓
Load User Profile
        ↓
Role & Permission Engine
        ↓
Intent Detection
        ↓
Context Builder
        ↓
Knowledge Retrieval
        ↓
Reasoning Engine
        ↓
Prompt Builder
        ↓
Gemini
        ↓
Response Validator
        ↓
Explainability Engine
        ↓
Confidence Generator
        ↓
Final Response
```

---

### Request

```json
{
    "query": "I am with my grandfather. Which gate should I use?",
    "conversationId": "uuid",
    "venueId": "uuid",
    "eventId": "uuid"
}
```

---

### Response

```json
{
    "success": true,
    "data": {
        "intent": "navigation",
        "recommendation": "Use Gate E.",
        "reasoning": "Gate E has elevator access, lower congestion, and the shortest accessible walking route.",
        "confidence": 0.96,
        "alternatives": [
            {
                "option": "Gate D",
                "reason": "Slightly longer walk but moderate crowd levels."
            }
        ]
    }
}
```

---

### Supported AI Capabilities

The AI Orchestration Layer automatically invokes one or more internal capabilities depending on the user's query.

Supported capabilities include:

- Stadium Navigation
- Crowd-aware Route Recommendation
- Volunteer Operational Assistance
- Accessibility Assistance
- Multilingual Assistance
- Facility Search
- Stadium Knowledge Retrieval
- Event Information
- Emergency Guidance
- General Question Answering
- Recommendation Explanation

The frontend never explicitly selects these capabilities.

---

### Role-Based Access Control

The AI endpoint never trusts the frontend to provide the user's role.

The backend extracts the authenticated user's identity from the JWT token and loads the associated role from the database before any reasoning occurs.

Supported roles:

- Spectator
- Volunteer
- Organizer
- Administrator

Certain operational capabilities are available only to authorized roles.

Examples:

| User Role | Allowed |
|------------|----------|
| Spectator | Navigation, Facilities, Accessibility, Event Information |
| Volunteer | Spectator capabilities + Volunteer SOPs + Operational Guidance |
| Organizer | Volunteer capabilities + Incident Management + Operational Analytics |
| Administrator | Full system access |

---

### Security Requirements

Every AI request must implement:

- JWT Authentication
- Role-Based Access Control (RBAC)
- Input Validation
- Prompt Injection Detection
- Output Validation
- Rate Limiting
- Structured Logging
- Conversation Tracking

---

### AI Response Requirements

Every AI response must include:

- Recommendation
- Reasoning
- Confidence Score
- Alternative Recommendation (when available)

Responses should be contextual, explainable, and consistent with the authenticated user's permissions.

## AI Recommendation

POST

```
/ai/recommend
```

Request

```json
{
    "query": "",
    "context": {},
    "venueId": "",
    "eventId": ""
}
```

Response

```json
{
    "recommendation": "",
    "reasoning": "",
    "confidence": 0.93,
    "alternatives": []
}
```

---

## AI Navigation

POST

```
/ai/navigation
```

---

## Volunteer Copilot

POST

```
/ai/volunteer
```

---

## Accessibility Assistant

POST

```
/ai/accessibility
```

---

## Multilingual Assistant

POST

```
/ai/translate
```

---

## Explain Recommendation

POST

```
/ai/explain
```

Returns

- reasoning
- confidence
- supporting evidence

---

# 11. Conversation APIs

## Create Conversation

POST

```
/conversations
```

---

## Get Conversations

GET

```
/conversations
```

---

## Get Messages

GET

```
/conversations/{id}
```

---

## Send Message

POST

```
/conversations/{id}/messages
```

---

# 12. Dataset APIs

## Upload Dataset

POST

```
/datasets/upload
```

Supported

- CSV
- JSON

---

## List Uploaded Datasets

GET

```
/datasets
```

---

## Delete Dataset

DELETE

```
/datasets/{id}
```

---

# 13. Knowledge Base APIs

## Upload Knowledge

POST

```
/knowledge/upload
```

---

## Search Knowledge

POST

```
/knowledge/search
```

---

## List Documents

GET

```
/knowledge
```

---

# 14. Recommendation APIs

## Recommendation History

GET

```
/recommendations
```

---

## Recommendation Details

GET

```
/recommendations/{id}
```

---

## Submit Feedback

POST

```
/recommendations/{id}/feedback
```

---

# 15. Incident APIs

## Report Incident

POST

```
/incidents
```

---

## List Incidents

GET

```
/incidents
```

---

## Update Incident Status

PATCH

```
/incidents/{id}
```

---

# 16. Admin APIs

## Users

GET

```
/admin/users
```

---

## Analytics

GET

```
/admin/analytics
```

---

## System Logs

GET

```
/admin/logs
```

---

## Prompt Templates

GET

```
/admin/prompts
```

---

# 17. Health APIs

GET

```
/health
```

Returns

- API Status
- Database Status
- Gemini Status
- Cache Status

---

# 18. Error Codes

| Code | Meaning |
|------|---------|
| AUTH_001 | Invalid Credentials |
| AUTH_002 | Token Expired |
| USER_001 | User Not Found |
| AI_001 | AI Service Unavailable |
| AI_002 | Invalid Prompt |
| DATA_001 | Dataset Error |
| FILE_001 | Invalid Upload |
| SERVER_001 | Internal Server Error |

---

# 19. API Security

Every endpoint must implement

- JWT Authentication
- RBAC
- Input Validation
- Rate Limiting
- Prompt Injection Protection
- Output Validation
- HTTPS
- Structured Logging

---

# 20. API Versioning

Current Version

```
v1
```

Future versions

```
v2
v3
```

must remain backward compatible whenever possible.

---

# 21. Future APIs

Future releases may introduce

- Voice APIs
- WebSocket APIs
- IoT Device APIs
- CCTV Integration APIs
- Digital Twin APIs
- Emergency Broadcast APIs
- Notification APIs

---

# 22. API Summary

The API layer provides a clean separation between the frontend, backend, AI orchestration layer, and external integrations. All AI interactions occur through dedicated AI endpoints, ensuring modularity, maintainability, security, and future extensibility.