# Entity Relationship Diagram (ERD)

Version: 1.0

Status: Frozen

---

# Purpose

This document defines the logical Entity Relationship Diagram (ERD) for the Stadium Command Center platform.

The design follows a normalized relational model while supporting future AI capabilities, multi-stadium deployments, Retrieval-Augmented Generation (RAG), explainability, and operational analytics.

GitHub natively renders Mermaid diagrams, making this document useful for developers, reviewers, and evaluators.

---

# Mermaid ER Diagram

```mermaid
erDiagram

ROLE ||--o{ USER : assigns

USER ||--o{ CONVERSATION : owns

CONVERSATION ||--o{ MESSAGE : contains

CONVERSATION ||--o{ RECOMMENDATION : generates

RECOMMENDATION ||--|| REASONING_LOG : explains

RECOMMENDATION ||--o{ FEEDBACK : receives

USER ||--o{ FEEDBACK : submits

USER ||--o{ NOTIFICATION : receives

STADIUM ||--o{ EVENT : hosts

STADIUM ||--o{ ZONE : contains

ZONE ||--o{ GATE : contains

ZONE ||--o{ FACILITY : contains

STADIUM ||--o{ ROUTE : defines

STADIUM ||--o{ DATASET : stores

STADIUM ||--o{ KNOWLEDGE_DOCUMENT : indexes

STADIUM ||--o{ STADIUM_PACKAGE : owns

EVENT ||--o{ INCIDENT : contains

EVENT ||--o{ CONVERSATION : related_to

USER {
uuid id
string fullName
string email
string passwordHash
string preferredLanguage
string accessibilityProfile
datetime createdAt
}

ROLE {
uuid id
string name
string description
}

STADIUM {
uuid id
string name
string city
string country
int capacity
string timezone
string packageVersion
}

EVENT {
uuid id
uuid stadiumId
string title
datetime startTime
datetime endTime
string status
}

ZONE {
uuid id
uuid stadiumId
string name
string description
}

GATE {
uuid id
uuid zoneId
string gateNumber
boolean accessibilitySupported
}

FACILITY {
uuid id
uuid zoneId
string name
string type
}

ROUTE {
uuid id
uuid stadiumId
uuid sourceZoneId
uuid destinationZoneId
float distance
boolean wheelchairFriendly
}

CONVERSATION {
uuid id
uuid userId
uuid stadiumId
uuid eventId
string title
}

MESSAGE {
uuid id
uuid conversationId
string sender
text message
datetime timestamp
}

RECOMMENDATION {
uuid id
uuid conversationId
string intent
float confidence
text recommendation
text reasoning
}

REASONING_LOG {
uuid id
uuid recommendationId
string model
int tokenUsage
int latency
}

FEEDBACK {
uuid id
uuid recommendationId
uuid userId
int rating
string comment
}

NOTIFICATION {
uuid id
uuid userId
string title
boolean read
}

DATASET {
uuid id
uuid stadiumId
string filename
string datasetType
}

KNOWLEDGE_DOCUMENT {
uuid id
uuid stadiumId
string title
string documentType
}

STADIUM_PACKAGE {
uuid id
uuid stadiumId
string version
}

INCIDENT {
uuid id
uuid stadiumId
uuid eventId
string severity
string status
}
```

---

# Relationship Summary

## User Domain

A **Role** can be assigned to many **Users**.

A **User** can create multiple **Conversations**.

A **Conversation** contains multiple **Messages**.

Each **Conversation** may generate multiple AI **Recommendations**.

Every **Recommendation** is linked to exactly one **Reasoning Log**.

Users may submit feedback for AI recommendations.

Users receive platform notifications.

---

# Stadium Domain

A **Stadium** hosts multiple **Events**.

A **Stadium** contains multiple:

- Zones
- Routes
- Knowledge Documents
- Datasets
- Stadium Packages

Each **Zone** contains:

- Gates
- Facilities

---

# AI Domain

Each conversation can generate multiple recommendations.

Every recommendation stores:

- Generated response
- Confidence score
- Explainability
- Intent

Each recommendation is fully traceable through a dedicated Reasoning Log.

---

# Operational Domain

Each Event may contain multiple operational Incidents.

Incidents can later be connected with:

- AI Recommendations
- Volunteer actions
- Analytics
- Future Crowd Prediction modules

---

# Future Expansion

The current ERD intentionally leaves room for future entities without requiring structural redesign.

Planned entities include:

- CrowdSnapshot
- IndoorMap
- NavigationGraph
- IoTDevice
- Camera
- Sensor
- Weather
- DigitalTwin
- Prediction
- VoiceSession
- ARNavigation
- EmergencyWorkflow

---

# Design Principles

The ERD follows these principles:

- Third Normal Form (3NF)
- UUID primary keys
- Soft delete support
- Referential integrity
- Domain-driven grouping
- Explainable AI traceability
- Multi-stadium support
- Multi-event support
- AI-first architecture
- Future extensibility

---

# Summary

The Stadium Command Center database is organized into five major domains:

- Identity & Access
- Stadium Operations
- Artificial Intelligence
- Knowledge Management
- Operational Analytics

This separation minimizes coupling, improves maintainability, enables independent module development, and provides a strong foundation for scalable AI-powered stadium operations.