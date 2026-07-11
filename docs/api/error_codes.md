# Error Codes Specification

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines the standardized error codes used throughout Stadium Command Center (SCC).

The objective is to provide consistent, machine-readable, and developer-friendly error responses across all modules.

Every API failure shall return:

- Appropriate HTTP Status Code
- Internal Error Code
- Human-readable Message
- Timestamp
- Request ID

---

# 2. Standard Error Response

```json
{
    "success": false,
    "error": {
        "code": "AUTH_001",
        "message": "Invalid credentials.",
        "details": []
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T15:20:00Z"
}
```

---

# 3. Error Categories

| Prefix | Module |
|----------|------------------|
| AUTH | Authentication |
| USER | User |
| AI | AI Engine |
| STADIUM | Stadium |
| EVENT | Event |
| KNOWLEDGE | Knowledge Base |
| DATASET | Dataset |
| INCIDENT | Incident |
| NOTIFICATION | Notification |
| VALIDATION | Validation |
| DATABASE | Database |
| SYSTEM | Internal System |

---

# 4. Authentication Errors

| Code | HTTP | Description |
|-------|------|-------------|
| AUTH_001 | 401 | Invalid credentials |
| AUTH_002 | 401 | Invalid JWT |
| AUTH_003 | 401 | Token expired |
| AUTH_004 | 403 | Permission denied |
| AUTH_005 | 403 | Role not authorized |
| AUTH_006 | 429 | Too many login attempts |

---

# 5. User Errors

| Code | HTTP | Description |
|-------|------|-------------|
| USER_001 | 404 | User not found |
| USER_002 | 409 | Email already exists |
| USER_003 | 400 | Invalid profile data |
| USER_004 | 400 | Unsupported language |
| USER_005 | 400 | Invalid accessibility preferences |

---

# 6. AI Errors

| Code | HTTP | Description |
|-------|------|-------------|
| AI_001 | 503 | Gemini unavailable |
| AI_002 | 500 | AI response generation failed |
| AI_003 | 500 | Prompt construction failed |
| AI_004 | 500 | Intent detection failed |
| AI_005 | 500 | Context builder failed |
| AI_006 | 500 | Knowledge retrieval failed |
| AI_007 | 500 | Response validation failed |
| AI_008 | 500 | Explainability generation failed |
| AI_009 | 500 | Confidence estimation failed |
| AI_010 | 422 | Unsafe prompt detected |

---

# 7. Stadium Errors

| Code | HTTP | Description |
|-------|------|-------------|
| STADIUM_001 | 404 | Stadium not found |
| STADIUM_002 | 400 | Invalid stadium package |
| STADIUM_003 | 409 | Package version already exists |
| STADIUM_004 | 422 | Stadium validation failed |

---

# 8. Event Errors

| Code | HTTP | Description |
|-------|------|-------------|
| EVENT_001 | 404 | Event not found |
| EVENT_002 | 409 | Event already exists |
| EVENT_003 | 400 | Invalid event status |

---

# 9. Knowledge Base Errors

| Code | HTTP | Description |
|-------|------|-------------|
| KNOWLEDGE_001 | 404 | Document not found |
| KNOWLEDGE_002 | 400 | Unsupported document format |
| KNOWLEDGE_003 | 500 | Embedding generation failed |
| KNOWLEDGE_004 | 500 | Knowledge indexing failed |

---

# 10. Dataset Errors

| Code | HTTP | Description |
|-------|------|-------------|
| DATASET_001 | 400 | Unsupported dataset type |
| DATASET_002 | 422 | Dataset validation failed |
| DATASET_003 | 404 | Dataset not found |
| DATASET_004 | 500 | Dataset parsing failed |

---

# 11. Incident Errors

| Code | HTTP | Description |
|-------|------|-------------|
| INCIDENT_001 | 404 | Incident not found |
| INCIDENT_002 | 400 | Invalid severity |
| INCIDENT_003 | 409 | Incident already resolved |

---

# 12. Validation Errors

| Code | HTTP | Description |
|-------|------|-------------|
| VALIDATION_001 | 400 | Required field missing |
| VALIDATION_002 | 400 | Invalid request body |
| VALIDATION_003 | 400 | Invalid UUID |
| VALIDATION_004 | 400 | Invalid query parameter |

---

# 13. Database Errors

| Code | HTTP | Description |
|-------|------|-------------|
| DATABASE_001 | 500 | Database unavailable |
| DATABASE_002 | 500 | Query execution failed |
| DATABASE_003 | 500 | Transaction failed |
| DATABASE_004 | 409 | Unique constraint violation |

---

# 14. System Errors

| Code | HTTP | Description |
|-------|------|-------------|
| SYSTEM_001 | 500 | Internal server error |
| SYSTEM_002 | 503 | Service unavailable |
| SYSTEM_003 | 504 | Request timeout |
| SYSTEM_004 | 429 | Rate limit exceeded |

---

# 15. Logging Requirements

Every error shall log:

- Request ID
- User ID (if authenticated)
- Endpoint
- HTTP Method
- Error Code
- Stack Trace (development only)
- Timestamp

Sensitive information such as passwords, JWTs, API keys, and prompt contents must never be logged.

---

# 16. Summary

All SCC services must use the standardized error catalog defined in this document. This ensures consistent frontend behavior, easier debugging, centralized monitoring, and improved maintainability across all modules.