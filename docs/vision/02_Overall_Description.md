# 2. Overall Description

## Product Perspective
SCC augments existing stadium systems with an AI reasoning layer. It is designed as a cloud-native platform that can support multiple venues through configurable Stadium Packages.

## Product Philosophy
Reasoning > Retrieval
Decision Support > Chat
Explainability > Black-box AI

## User Personas
Primary: Volunteer

Secondary:
- Organizer
- Spectator
- Administrator

## Product Functions
- Volunteer Copilot
- AI Navigation
- Crowd-aware Recommendations
- Accessibility Guidance
- Multilingual Assistance
- Dataset Upload
- Stadium Package Loader
- Explainable AI

## Operating Environment
React, Next.js, Express, TypeScript, PostgreSQL, Redis, Docker, Gemini.

## High-Level Workflow
User → Authentication → Intent Detection → Context Builder → Knowledge Retrieval → Reasoning Engine → Prompt Builder → Gemini → Validator → Explainability → UI
