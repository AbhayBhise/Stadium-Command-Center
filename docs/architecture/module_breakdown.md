# Module Breakdown

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines the functional decomposition of the Stadium Command Center (SCC) into independent software modules.

Each module encapsulates a specific business capability and follows a consistent internal architecture. This modular approach enables parallel development, improves maintainability, and allows Antigravity to generate and evolve features independently without affecting unrelated parts of the system.

---

# 2. Module Design Principles

Every module shall follow the same structure.

```
module/
│
├── controller/
├── service/
├── repository/
├── routes/
├── middleware/
├── validators/
├── dto/
├── types/
├── utils/
└── tests/
```

Responsibilities

Controller

- Accept HTTP requests
- Validate request
- Return response

Service

- Business logic
- Orchestration

Repository

- Database communication only

Routes

- API definitions

Middleware

- Authentication
- Authorization
- Validation

Validators

- Zod validation schemas

DTO

- Request/Response objects

Tests

- Unit tests
- Integration tests

---

# 3. Authentication Module

Purpose

Handles user authentication and authorization.

Responsibilities

- Register
- Login
- JWT validation
- RBAC
- Password hashing
- Session management

Endpoints

POST /auth/register

POST /auth/login

GET /auth/me

Folder

```
auth/

auth.controller.ts

auth.service.ts

auth.repository.ts

auth.routes.ts

auth.middleware.ts

auth.validators.ts

auth.types.ts

auth.test.ts
```

Dependencies

- User Module
- Database
- JWT

---

# 4. User Module

Purpose

Manages user profiles and preferences.

Responsibilities

- Profile
- Language
- Accessibility
- Preferences

Endpoints

GET /users/profile

PUT /users/profile

PATCH /users/language

PATCH /users/accessibility

Folder

```
user/

user.controller.ts

user.service.ts

user.repository.ts

user.routes.ts

user.validators.ts

user.test.ts
```

---

# 5. Stadium Module

Purpose

Manages stadium information.

Responsibilities

- Stadium details
- Zones
- Gates
- Facilities
- Routes
- Parking

Endpoints

GET /stadiums

GET /stadiums/:id

POST /stadiums/upload

Folder

```
stadium/

stadium.controller.ts

stadium.service.ts

stadium.repository.ts

stadium.routes.ts

stadium.test.ts
```

---

# 6. Event Module

Purpose

Handles sporting events.

Responsibilities

- Event information
- Match schedules
- Venue assignment

Endpoints

GET /events

GET /events/:id

GET /events/live

Folder

```
event/

event.controller.ts

event.service.ts

event.repository.ts

event.routes.ts
```

---

# 7. AI Module

Purpose

Acts as the central AI orchestration layer.

This is the core module of SCC.

Responsibilities

- Intent Detection
- Context Building
- Prompt Construction
- Knowledge Retrieval
- AI Invocation
- Validation
- Explainability
- Confidence Scoring

Public Endpoint

POST /ai/chat

Folder

```
ai/

ai.controller.ts

ai.service.ts

intent.service.ts

context.service.ts

reasoning.service.ts

retrieval.service.ts

prompt.service.ts

validator.service.ts

confidence.service.ts

explainability.service.ts

gemini.adapter.ts

ai.routes.ts

ai.validators.ts

ai.test.ts
```

Dependencies

- Knowledge Module
- Conversation Module
- Recommendation Module
- Stadium Module

---

# 8. Knowledge Module

Purpose

Provides Retrieval-Augmented Generation (RAG).

Responsibilities

- Document indexing
- Semantic search
- Knowledge retrieval
- Stadium package loading

Endpoints

POST /knowledge/upload

POST /knowledge/search

GET /knowledge

Folder

```
knowledge/

knowledge.controller.ts

knowledge.service.ts

parser.service.ts

retrieval.service.ts

embedding.service.ts

knowledge.routes.ts

knowledge.test.ts
```

---

# 9. Conversation Module

Purpose

Stores AI conversations.

Responsibilities

- Chat history
- Context persistence
- Session tracking

Endpoints

POST /conversations

GET /conversations

GET /conversations/:id

POST /conversations/:id/messages

Folder

```
conversation/

conversation.controller.ts

conversation.service.ts

conversation.repository.ts

conversation.routes.ts

conversation.test.ts
```

---

# 10. Recommendation Module

Purpose

Stores AI-generated recommendations.

Responsibilities

- Recommendation history
- Confidence scores
- Alternative suggestions
- Feedback

Endpoints

GET /recommendations

GET /recommendations/:id

POST /recommendations/:id/feedback

Folder

```
recommendation/

recommendation.controller.ts

recommendation.service.ts

recommendation.repository.ts

recommendation.routes.ts

recommendation.test.ts
```

---

# 11. Dataset Module

Purpose

Handles uploaded operational datasets.

Responsibilities

- CSV upload
- JSON upload
- Validation
- Parsing
- Storage

Endpoints

POST /datasets/upload

GET /datasets

DELETE /datasets/:id

Folder

```
dataset/

dataset.controller.ts

dataset.service.ts

dataset.repository.ts

dataset.routes.ts

dataset.parser.ts

dataset.test.ts
```

---

# 12. Incident Module

Purpose

Manages operational incidents.

Responsibilities

- Report incidents
- Update status
- Escalation
- Incident history

Endpoints

POST /incidents

GET /incidents

PATCH /incidents/:id

Folder

```
incident/

incident.controller.ts

incident.service.ts

incident.repository.ts

incident.routes.ts

incident.test.ts
```

---

# 13. Admin Module

Purpose

Administrative operations.

Responsibilities

- User management
- Analytics
- Prompt management
- Logs
- System settings

Endpoints

GET /admin/users

GET /admin/analytics

GET /admin/logs

Folder

```
admin/

admin.controller.ts

admin.service.ts

admin.repository.ts

admin.routes.ts

admin.test.ts
```

---

# 14. Notification Module

Purpose

Handles user notifications.

Responsibilities

- In-app notifications
- Broadcasts
- Event alerts

Folder

```
notification/

notification.controller.ts

notification.service.ts

notification.repository.ts

notification.routes.ts
```

---

# 15. Shared Modules

The following modules are shared across the application.

```
shared/

constants/

errors/

logger/

config/

middleware/

validators/

utils/

types/

interfaces/

database/

cache/
```

These modules must never contain business-specific logic.

---

# 16. Module Dependencies

```
Frontend

↓

API

↓

Authentication

↓

Application Services

↓

AI Module

↓

Knowledge Module

↓

Repositories

↓

Database
```

Business modules communicate only through services.

Repositories must never call other repositories.

Controllers must never contain business logic.

---

# 17. Coding Standards

Every module must:

- Follow SOLID principles.
- Use dependency injection where appropriate.
- Avoid duplicated logic.
- Use TypeScript strict mode.
- Implement structured logging.
- Return standardized API responses.
- Validate every request.
- Include unit tests.
- Include integration tests.
- Be independently maintainable.

---

# 18. Future Modules

The architecture supports future addition of:

- Computer Vision Module
- Digital Twin Module
- IoT Module
- Indoor Positioning Module
- Crowd Prediction Module
- Voice Assistant Module
- Emergency Response Module
- Analytics Engine
- Notification Engine

These modules can be added without modifying existing module boundaries.

---

# 19. Module Summary

The Stadium Command Center is composed of independent, cohesive, and loosely coupled modules. Each module owns a single business capability, follows a standardized internal structure, exposes well-defined APIs, and can be developed, tested, and deployed independently. This modular architecture minimizes coupling, simplifies maintenance, and enables efficient AI-assisted development.