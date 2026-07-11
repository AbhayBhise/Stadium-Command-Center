# Seed Data Specification

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines the initial seed data required for Stadium Command Center.

The objective is to ensure that a fresh deployment immediately contains enough data for demonstration, AI reasoning, testing, and PromptWars evaluation without requiring manual configuration.

The seed data is intentionally realistic and based on a modern international football stadium.

---

# 2. Seeding Strategy

The application should automatically populate:

- Roles
- Demo Users
- Stadium
- Stadium Zones
- Gates
- Facilities
- Navigation Routes
- Event
- Knowledge Documents
- Prompt Templates
- Sample Conversations
- AI Recommendations

The seed script should be idempotent.

Running it multiple times must not create duplicate records.

---

# 3. Default Roles

| Role | Description |
|-------|-------------|
| Administrator | Full platform access |
| Organizer | Event management |
| Volunteer | Operational assistance |
| Spectator | Regular visitor |

---

# 4. Demo Users

## Administrator

Name

```
System Administrator
```

Email

```
admin@scc.local
```

Role

```
Administrator
```

---

## Organizer

Name

```
Tournament Organizer
```

Email

```
organizer@scc.local
```

Role

```
Organizer
```

---

## Volunteer

Name

```
Venue Volunteer
```

Email

```
volunteer@scc.local
```

Role

```
Volunteer
```

---

## Spectator

Name

```
Demo Spectator
```

Email

```
spectator@scc.local
```

Role

```
Spectator
```

---

# 5. Default Stadium

Name

```
Singapore National Stadium
```

Country

```
Singapore
```

City

```
Singapore
```

Capacity

```
55000
```

Timezone

```
Asia/Singapore
```

---

# 6. Stadium Zones

Create the following zones.

- North Stand
- South Stand
- East Stand
- West Stand
- VIP Lounge
- Main Entrance
- Parking A
- Parking B
- Food Court
- Merchandise Plaza
- Medical Center
- Control Room
- Media Zone

---

# 7. Gates

Create:

- Gate A
- Gate B
- Gate C
- Gate D
- Gate E
- Gate F

Each gate should include:

- GPS coordinates
- Accessibility flag
- Connected Zone

---

# 8. Facilities

Create at least one of each facility type.

- Washroom
- Accessible Washroom
- Elevator
- Escalator
- ATM
- Medical Center
- Lost & Found
- Help Desk
- Merchandise Store
- Food Court
- Prayer Room
- Water Station
- Charging Station

---

# 9. Navigation Routes

Generate routes between all important locations.

Examples

Main Entrance

↓

Gate A

↓

North Stand

↓

Food Court

↓

Medical Center

↓

Exit

Every route should include

- Estimated walking time
- Distance
- Wheelchair accessibility

---

# 10. Default Event

Title

```
FIFA World Cup Qualifier
```

Venue

```
Singapore National Stadium
```

Status

```
Live
```

Start Time

Current Date

End Time

Current Date + 3 Hours

---

# 11. Knowledge Documents

Seed the AI knowledge base with:

- Stadium Guide
- Emergency SOP
- Accessibility Guide
- Volunteer Handbook
- Stadium Rules
- Parking Guide
- Food Directory
- Emergency Contacts
- Match Day Instructions
- Ticket Policy

---

# 12. Prompt Templates

Create reusable prompt templates.

Templates

- Navigation Assistant
- Volunteer Assistant
- Accessibility Assistant
- Emergency Assistant
- Organizer Assistant
- Lost & Found Assistant
- Food Recommendation Assistant
- Parking Assistant

---

# 13. Example Conversations

Conversation 1

User

```
Where is Gate C?
```

AI

```
Gate C is located near the East Stand.
Walking time is approximately 4 minutes.
```

---

Conversation 2

User

```
Where is the nearest accessible washroom?
```

AI

```
The nearest accessible washroom is beside Elevator 2.
Estimated walking time is 2 minutes.
```

---

Conversation 3

User

```
Where can I buy official jerseys?
```

AI

```
Official merchandise is available at Merchandise Plaza near Gate D.
```

---

# 14. Sample AI Recommendations

Examples

Recommendation

```
Use Gate B instead of Gate A.
```

Confidence

```
96%
```

Reason

```
Lower pedestrian congestion.
```

---

Recommendation

```
Take Elevator 3 instead of Escalator 2.
```

Confidence

```
98%
```

Reason

```
Wheelchair accessibility.
```

---

Recommendation

```
Use Food Court South.
```

Confidence

```
91%
```

Reason

```
Current queue length is lower.
```

---

# 15. Sample Incidents

Create sample incidents.

Incident 1

Category

```
Medical
```

Severity

```
Medium
```

Status

```
Resolved
```

---

Incident 2

Category

```
Crowd Congestion
```

Severity

```
High
```

Status

```
Monitoring
```

---

Incident 3

Category

```
Lost Child
```

Severity

```
Critical
```

Status

```
Resolved
```

---

# 16. Notifications

Seed sample notifications.

Examples

```
Gate B temporarily closed.
```

```
Food Court South now open.
```

```
Match starts in 30 minutes.
```

```
Heavy crowd near Gate A.
```

---

# 17. Development Configuration

Default Language

```
English
```

Supported Languages

- English
- Spanish
- French
- Hindi
- Japanese
- Arabic
- Mandarin

Theme

```
Dark
```

AI Provider

```
Google Gemini
```

---

# 18. Seed Execution Order

1. Roles

2. Users

3. Stadium

4. Zones

5. Gates

6. Facilities

7. Routes

8. Event

9. Stadium Package

10. Knowledge Documents

11. Prompt Templates

12. Conversations

13. Recommendations

14. Incidents

15. Notifications

---

# 19. Validation Checklist

After seeding, verify:

- All roles exist
- Demo users can log in
- Stadium is created
- Event is active
- AI prompt templates are available
- Knowledge documents are indexed
- Navigation routes exist
- Facilities are searchable
- Conversations load correctly
- Recommendations display reasoning and confidence

---

# 20. Summary

The seed dataset transforms an empty deployment into a fully functional demonstration environment. It enables immediate testing of authentication, navigation, AI reasoning, explainability, Retrieval-Augmented Generation, recommendation generation, and operational workflows without additional manual setup.