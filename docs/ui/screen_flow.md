# Screen Flow

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines the navigation flow, page hierarchy, routing, and interaction flow of Stadium Command Center (SCC).

The objective is to ensure a consistent user experience across all supported user roles while minimizing navigation complexity.

---

# 2. Design Goals

The UI should enable users to:

- Reach any primary feature within three interactions.
- Access the AI Assistant from every screen.
- Receive contextual recommendations without navigating away.
- Complete common tasks with minimal cognitive load.
- Recover gracefully from errors.

---

# 3. User Roles

The interface adapts based on role.

- Spectator
- Volunteer
- Organizer
- Administrator

Each role shares the same design language but receives different navigation options and permissions.

---

# 4. Global Navigation

```
Landing Page
        │
        ▼
Authentication
        │
        ▼
Dashboard
        │
 ┌──────┼────────────┬────────────┐
 ▼      ▼            ▼            ▼
AI     Planner    Navigation   Profile
 │
 ▼
Recommendation
 │
 ▼
Explainability
```

---

# 5. Public Pages

## Landing

Route

```
/
```

Purpose

- Product overview
- Features
- Sign In
- Get Started

Actions

- Login
- Learn More

---

## Login

Route

```
/login
```

Actions

- Email Login
- Google Login

Redirect

```
/dashboard
```

---

# 6. Dashboard

Route

```
/dashboard
```

This is the primary application screen.

Widgets

- AI Assistant
- Quick Actions
- Event Summary
- Notifications
- Recent Conversations
- Current Stadium
- Planner Shortcut

---

# 7. AI Assistant

Route

```
/assistant
```

Features

- Chat
- Suggested Questions
- Voice Input (Future)
- Conversation History
- AI Recommendations

Every response includes

- Recommendation
- Reasoning
- Confidence
- Sources
- Alternatives

---

# 8. Navigation Module

Route

```
/navigation
```

Capabilities

- Find Gate
- Find Seat
- Find Parking
- Find Food Court
- Find Washroom
- Find Merchandise
- Emergency Exit

Output

- Route
- Walking Time
- Accessibility
- Explanation

---

# 9. Planner

Route

```
/planner
```

Capabilities

- Plan Visit
- Arrival Time
- Parking
- Food Break
- Navigation
- Exit Strategy

Output

Complete personalized itinerary.

---

# 10. Crowd Intelligence

Route

```
/crowd
```

Displays

- Estimated Crowd Level
- Suggested Gates
- Suggested Facilities
- Queue Estimates
- AI Recommendations

---

# 11. Volunteer Dashboard

Route

```
/volunteer
```

Available only for volunteer roles.

Modules

- Operational Assistant
- Incident Reporting
- SOP Search
- Visitor Assistance
- Accessibility Support

---

# 12. Organizer Dashboard

Route

```
/organizer
```

Modules

- Analytics
- Crowd Overview
- Incident Management
- Volunteer Status
- Event Operations

---

# 13. Administrator

Route

```
/admin
```

Modules

- User Management
- Stadium Packages
- Knowledge Base
- Prompt Management
- Dataset Upload
- Audit Logs

---

# 14. Profile

Route

```
/profile
```

Settings

- Personal Information
- Language
- Accessibility
- Theme
- Notification Preferences

---

# 15. Error Pages

404

```
/404
```

Displays

- Page Not Found
- Return Home

---

500

Displays

- Unexpected Error
- Retry
- Contact Support

---

Unauthorized

Displays

- Permission Required
- Return Dashboard

---

# 16. Loading States

Every page shall support

- Skeleton Loading
- Button Loading
- Card Loading
- AI Thinking Indicator

The AI Assistant should display incremental progress:

```
Understanding Request

↓

Retrieving Stadium Knowledge

↓

Reasoning

↓

Generating Recommendation

↓

Validating Response

↓

Done
```

---

# 17. Empty States

Examples

No Conversations

Show

"Start a conversation with the AI Assistant."

No Notifications

Show

"You're all caught up."

No Planner

Show

"Generate your personalized stadium plan."

---

# 18. Mobile Navigation

Bottom Navigation

- Home
- AI
- Planner
- Navigation
- Profile

Additional features are available through a slide-out drawer.

---

# 19. Desktop Layout

```
+--------------------------------------------------------+
| Header                                                 |
+---------+----------------------------------------------+
| Sidebar | Main Content                                 |
|         |                                              |
|         | Dashboard / Chat / Planner / Navigation      |
|         |                                              |
+---------+----------------------------------------------+
```

---

# 20. Screen Transition Rules

Navigation should:

- Preserve conversation state.
- Preserve planner state.
- Preserve authentication.
- Avoid unnecessary page reloads.
- Support browser back navigation.

---

# 21. AI Interaction Flow

```
User Query

↓

AI Processing Indicator

↓

Recommendation Card

↓

Reasoning Card

↓

Confidence Badge

↓

Alternative Recommendation

↓

Feedback Buttons
```

---

# 22. Future Screens

Future versions may include

- Indoor Live Map
- Voice Assistant
- Digital Twin Viewer
- Computer Vision Dashboard
- Security Operations Center
- Sustainability Dashboard

---

# 23. Summary

The SCC screen flow is designed around task completion rather than feature discovery. Users can quickly access AI-powered assistance, personalized planning, navigation, and operational tools while maintaining a consistent experience across all supported roles and devices.