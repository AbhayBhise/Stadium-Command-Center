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