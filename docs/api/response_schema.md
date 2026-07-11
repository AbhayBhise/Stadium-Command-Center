# Response Schema Specification

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines the standard API response format for every endpoint exposed by Stadium Command Center (SCC).

A consistent response structure ensures predictable frontend behavior, easier debugging, standardized logging, and simplified API integration.

Every endpoint MUST return one of the response formats defined in this document.

---

# 2. Response Principles

Every response shall be:

- JSON
- Version independent
- Consistent
- Machine readable
- Human readable
- Timestamped
- Traceable

---

# 3. Standard Success Response

```json
{
    "success": true,
    "message": "Operation completed successfully.",
    "data": {},
    "meta": {},
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 4. Standard Error Response

```json
{
    "success": false,
    "error": {
        "code": "AUTH_001",
        "message": "Invalid credentials.",
        "details": []
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 5. Metadata Object

The optional `meta` object contains additional information.

Example

```json
{
    "meta": {
        "page": 1,
        "pageSize": 20,
        "total": 135,
        "hasNext": true
    }
}
```

---

# 6. Pagination Response

```json
{
    "success": true,
    "message": "Events retrieved successfully.",
    "data": [],
    "meta": {
        "page": 1,
        "pageSize": 20,
        "total": 250,
        "totalPages": 13,
        "hasNext": true,
        "hasPrevious": false
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 7. Authentication Response

Login Response

```json
{
    "success": true,
    "message": "Login successful.",
    "data": {
        "accessToken": "jwt_token",
        "expiresIn": 3600,
        "user": {
            "id": "uuid",
            "name": "John Doe",
            "email": "john@example.com",
            "role": "Volunteer"
        }
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 8. AI Chat Response

Every AI response must follow the same schema.

```json
{
    "success": true,
    "message": "AI response generated successfully.",
    "data": {
        "intent": "Navigation",
        "recommendation": "Use Gate E.",
        "reasoning": "Gate E currently has the lowest congestion and provides wheelchair access.",
        "confidence": 0.96,
        "alternatives": [
            {
                "title": "Gate D",
                "reason": "Slightly longer walking distance."
            }
        ],
        "sources": [
            "routes.json",
            "accessibility.json",
            "stadium_guide.md"
        ]
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 9. Conversation Response

```json
{
    "success": true,
    "message": "Conversation created successfully.",
    "data": {
        "conversationId": "uuid",
        "title": "Navigation Assistance",
        "createdAt": "2026-07-12T18:30:00Z"
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 10. Recommendation Response

```json
{
    "success": true,
    "data": {
        "recommendationId": "uuid",
        "intent": "Accessibility",
        "confidence": 0.94,
        "reasoning": "Elevator 2 provides the shortest accessible route.",
        "recommendation": "Use Elevator 2.",
        "alternatives": [
            {
                "title": "Elevator 1",
                "reason": "Longer walking distance."
            }
        ]
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 11. File Upload Response

```json
{
    "success": true,
    "message": "Dataset uploaded successfully.",
    "data": {
        "datasetId": "uuid",
        "filename": "stadium.csv",
        "status": "Processing"
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 12. Validation Error Response

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_001",
        "message": "Request validation failed.",
        "details": [
            {
                "field": "email",
                "issue": "Invalid email format."
            }
        ]
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 13. Permission Error Response

```json
{
    "success": false,
    "error": {
        "code": "AUTH_004",
        "message": "Access denied."
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 14. Health Response

```json
{
    "success": true,
    "data": {
        "api": "Healthy",
        "database": "Healthy",
        "redis": "Healthy",
        "gemini": "Healthy",
        "uptime": "72h",
        "version": "1.0.0"
    },
    "requestId": "uuid",
    "timestamp": "2026-07-12T18:30:00Z"
}
```

---

# 15. AI Response Requirements

Every AI response MUST contain:

- Recommendation
- Reasoning
- Confidence Score
- Alternative Recommendation (if available)
- Supporting Knowledge Sources
- Detected Intent

This requirement enforces explainability and aligns with the project's AI-first design.

---

# 16. HTTP Status Codes

| Status | Meaning |
|---------|----------|
| 200 | Success |
| 201 | Resource Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Failed |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

# 17. Design Rules

All APIs must:

- Return JSON only.
- Never expose stack traces.
- Never expose secrets.
- Include requestId.
- Include ISO-8601 timestamps.
- Return consistent field names.
- Use camelCase for JSON properties.
- Keep response schemas backward compatible.

---

# 18. Summary

This standardized response schema provides a predictable contract between the frontend, backend, AI Orchestration Layer, and external consumers. It improves maintainability, simplifies integration, and ensures that every AI interaction is transparent, explainable, and traceable.