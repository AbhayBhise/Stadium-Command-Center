# UI Components

Version: 1.0

Status: Frozen

---

# 1. Purpose

This document defines every reusable UI component used throughout Stadium Command Center (SCC).

The objective is to maximize consistency, maintainability, accessibility, and development speed by ensuring that each UI element is implemented once and reused across the application.

All components should be independent, composable, fully typed, and responsive.

---

# 2. Design Principles

Every component should be:

- Reusable
- Accessible
- Responsive
- Stateless whenever possible
- Theme-aware
- Strongly typed
- Easy to test

---

# 3. Component Hierarchy

```
App

├── Layout
│   ├── Header
│   ├── Sidebar
│   ├── Mobile Navigation
│   └── Footer
│
├── Pages
│
├── Widgets
│
├── Cards
│
├── Forms
│
├── AI Components
│
├── Charts
│
└── Common Components
```

---

# 4. Layout Components

## AppLayout

Purpose

Provides the overall application layout.

Contains

- Header
- Sidebar
- Main Content
- Notification Area

---

## Header

Contains

- Logo
- Search
- Notifications
- Theme Toggle
- User Profile

---

## Sidebar

Contains navigation links.

Menu items are rendered based on user role.

---

## Mobile Navigation

Bottom navigation for mobile devices.

---

# 5. Common Components

## Button

Variants

- Primary
- Secondary
- Outline
- Ghost
- Danger
- Success

States

- Default
- Hover
- Active
- Disabled
- Loading

Props

```
variant

size

icon

loading

disabled

onClick
```

---

## Input

Features

- Label
- Helper Text
- Validation
- Prefix
- Suffix
- Error State

---

## TextArea

Supports

- Auto Resize
- Character Counter
- Validation

---

## Select

Supports

- Search
- Multi-select
- Keyboard Navigation

---

## Modal

Features

- Header
- Content
- Footer
- Close Action

---

## Drawer

Used on mobile.

Slides from screen edge.

---

## Tabs

Horizontal navigation between related sections.

---

## Badge

Variants

- Success
- Warning
- Error
- Info
- Neutral

---

## Tooltip

Appears on hover or keyboard focus.

---

## Avatar

Displays

- User Image
- Initials
- Role Badge

---

## Skeleton

Loading placeholder for asynchronous content.

---

# 6. Dashboard Widgets

## Quick Action Card

Displays

- Icon
- Title
- Description
- Action

---

## Statistic Card

Displays

- Metric
- Trend
- Icon

Examples

- Active Visitors
- Open Gates
- AI Requests

---

## Notification Card

Displays

- Title
- Timestamp
- Priority
- Status

---

## Event Summary Card

Displays

- Event Name
- Stadium
- Time
- Attendance

---

# 7. AI Components

These components are unique to SCC.

---

## AI Chat Window

Features

- Conversation
- Markdown Support
- Streaming Responses
- Suggested Questions

---

## Chat Bubble

Variants

- User
- AI
- System

---

## AI Recommendation Card

Displays

- Recommendation
- Priority
- Category

---

## Reasoning Card

Displays

- AI Reasoning
- Supporting Evidence

Collapsible by default.

---

## Confidence Badge

Displays confidence as

- High
- Medium
- Low

Also displays percentage.

---

## Source Card

Displays

- Retrieved Documents
- Knowledge Sources
- SOP References

---

## Alternative Recommendation Card

Displays backup recommendation when available.

---

## Suggested Action Card

Displays actionable buttons.

Examples

- Navigate
- Open Planner
- View Map
- Contact Volunteer

---

# 8. Navigation Components

## Facility Card

Displays

- Facility Name
- Distance
- Category
- Accessibility

---

## Route Card

Displays

- Start
- Destination
- Estimated Time
- Route Summary

---

## Gate Card

Displays

- Gate Name
- Crowd Status
- Walking Time

---

# 9. Planner Components

## Itinerary Card

Displays

- Arrival
- Parking
- Entry
- Activities
- Exit

---

## Timeline

Displays chronological visit plan.

---

## Activity Card

Displays

- Activity
- Time
- Duration
- Notes

---

# 10. Crowd Components

## Crowd Status Card

Displays

- Density
- Trend
- Recommendation

---

## Queue Card

Displays

- Facility
- Estimated Wait
- Status

---

## Heatmap Legend

Explains crowd density colors.

---

# 11. Volunteer Components

## SOP Card

Displays

- SOP Title
- Summary
- Quick Actions

---

## Incident Card

Displays

- Incident Type
- Severity
- Status
- Assigned Volunteer

---

## Escalation Banner

Displayed during high-priority events.

---

# 12. Accessibility Components

## Accessibility Badge

Examples

- Wheelchair Accessible
- Elevator Available
- Hearing Assistance

---

## Accessibility Notice

Highlights accessibility information before navigation begins.

---

# 13. Feedback Components

## Rating Component

Thumbs Up

Thumbs Down

---

## Feedback Dialog

Collects

- Rating
- Comments
- Issue Category

---

# 14. Error Components

## Error Banner

Displays recoverable errors.

---

## Empty State

Displays

- Illustration
- Message
- Primary Action

---

## Retry Card

Provides retry functionality after temporary failures.

---

# 15. Component Naming Convention

```
PascalCase

Example

Button.tsx

ChatBubble.tsx

ReasoningCard.tsx

PlannerTimeline.tsx
```

---

# 16. Folder Structure

```
components/

common/

layout/

ai/

navigation/

planner/

crowd/

volunteer/

dashboard/

feedback/
```

---

# 17. Development Rules

Every component must:

- Use TypeScript
- Accept typed props
- Be reusable
- Support dark mode
- Support accessibility
- Avoid duplicated logic
- Include loading state
- Include error state

---

# 18. Testing Requirements

Every component shall have:

- Unit Tests
- Accessibility Tests
- Snapshot Tests (where appropriate)

Critical components require interaction tests.

---

# 19. Future Components

Planned additions include:

- Indoor Map Viewer
- Digital Twin Viewer
- AI Timeline Explorer
- Crowd Heatmap
- Voice Assistant
- AR Navigation Overlay
- Incident Dashboard
- Sustainability Metrics

---

# 20. Summary

The SCC component library establishes a modular, reusable, and accessible UI foundation. By standardizing components across the application, development becomes faster, testing becomes simpler, and the overall user experience remains consistent while supporting future expansion.
