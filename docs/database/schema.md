# Database Schema

Version: 1.0

Status: Frozen

---

# Purpose

This document defines the logical database schema for Stadium Command Center.

The database is implemented using **PostgreSQL** with **Prisma ORM**.

The schema is normalized, scalable, AI-ready, and designed to support multiple stadiums, multiple sporting events, explainable AI, Retrieval-Augmented Generation (RAG), and future intelligent services.

---

# Database Technology

Database

- PostgreSQL 16+

ORM

- Prisma ORM

Primary Key

- UUID

Soft Delete

- Enabled

Migration Tool

- Prisma Migrate

---

# Core Entities

## User

Represents every authenticated user of the platform.

Attributes

- id
- fullName
- email
- passwordHash
- roleId
- preferredLanguage
- accessibilityProfile
- profileImage
- lastLogin
- createdAt
- updatedAt
- deletedAt

Relationships

- belongs to Role
- has many Conversations
- has many Notifications
- has many Feedback records

---

## Role

Defines Role-Based Access Control.

Default Roles

- Spectator
- Volunteer
- Organizer
- Administrator

Attributes

- id
- name
- description

---

## Stadium

Represents a stadium.

Attributes

- id
- name
- city
- country
- capacity
- timezone
- packageVersion
- description

Relationships

- has many Events
- has many Zones
- has many Gates
- has many Facilities
- has many Knowledge Documents

---

## Event

Represents an event hosted inside a stadium.

Attributes

- id
- stadiumId
- title
- description
- startTime
- endTime
- status

Relationships

- belongs to Stadium
- has many Conversations
- has many Incidents

---

## Zone

Logical stadium section.

Examples

- North Stand
- East Stand
- VIP
- Parking
- Food Court

Attributes

- id
- stadiumId
- name
- description

---

## Gate

Attributes

- id
- zoneId
- gateNumber
- accessibilitySupported
- latitude
- longitude

---

## Facility

Represents physical facilities.

Types

- Washroom
- Food Court
- Medical
- ATM
- Elevator
- Escalator
- Merchandise
- Help Desk

Attributes

- id
- stadiumId
- zoneId
- type
- name
- latitude
- longitude

---

## Route

Stores navigational routes.

Attributes

- id
- stadiumId
- sourceZoneId
- destinationZoneId
- distance
- wheelchairFriendly
- estimatedTime

---

## Stadium Package

Represents an uploaded stadium configuration.

Attributes

- id
- stadiumId
- version
- uploadedBy
- uploadDate

Files

- stadium.json
- zones.json
- facilities.json
- gates.json
- vendors.json
- parking.json
- emergency.json
- translations.json

---

## Dataset

Uploaded datasets used by AI.

Attributes

- id
- filename
- datasetType
- uploadedBy
- uploadDate
- status

Supported Formats

- CSV
- JSON

---

## Knowledge Document

Used by Retrieval-Augmented Generation.

Attributes

- id
- stadiumId
- title
- source
- documentType
- embeddingId

Examples

- Stadium Rules
- Emergency SOP
- Volunteer Guide
- Accessibility Guide
- Parking Instructions

---

## Conversation

Stores AI conversations.

Attributes

- id
- userId
- eventId
- stadiumId
- title
- createdAt

Relationships

- has many Messages
- has many Recommendations

---

## Message

Individual chat message.

Attributes

- id
- conversationId
- sender
- message
- timestamp

Sender Values

- USER
- AI

---

## Recommendation

Stores AI recommendations.

Attributes

- id
- conversationId
- intent
- recommendation
- confidence
- reasoning
- alternatives
- generatedAt

---

## Reasoning Log

Stores explainability metadata.

Attributes

- id
- recommendationId
- promptVersion
- retrievedDocuments
- model
- latency
- tokenUsage
- timestamp

Purpose

Provides AI transparency and debugging.

---

## Prompt Template

Stores reusable prompt templates.

Attributes

- id
- name
- version
- prompt
- active

Examples

- Navigation Assistant
- Volunteer Assistant
- Accessibility Assistant
- Emergency Assistant
- Organizer Assistant

---

## Incident

Operational incident.

Attributes

- id
- stadiumId
- eventId
- category
- severity
- location
- description
- status

Severity

- Low
- Medium
- High
- Critical

---

## Feedback

Stores user feedback.

Attributes

- id
- recommendationId
- userId
- rating
- comment

---

## Notification

Attributes

- id
- userId
- title
- message
- type
- read
- createdAt

---

## Audit Log

Stores critical system activity.

Attributes

- id
- actor
- action
- resource
- ipAddress
- timestamp

---

# Global Conventions

Every table includes

- id
- createdAt
- updatedAt
- deletedAt (soft delete where applicable)

---

# Indexing Strategy

Indexes

- email
- stadiumId
- eventId
- conversationId
- recommendationId
- createdAt

Unique Indexes

- email
- role name
- stadium package version

---

# Cascade Policy

Delete User

→ Preserve conversations

Delete Stadium

→ Restricted

Delete Event

→ Preserve logs

Delete Recommendation

→ Preserve reasoning logs

Soft delete is preferred whenever possible.

---

# Future Tables

The schema supports future additions without redesign.

Planned Models

- CrowdSnapshot
- Camera
- Sensor
- IoTDevice
- Prediction
- DigitalTwin
- IndoorMap
- LiveOccupancy
- Weather
- NavigationGraph
- VoiceSession

---

# Database Summary

The Stadium Command Center database is organized around business domains rather than isolated tables. It supports explainable AI, Retrieval-Augmented Generation, modular services, multi-stadium deployments, multi-event management, and future intelligent capabilities while maintaining scalability, consistency, and auditability.