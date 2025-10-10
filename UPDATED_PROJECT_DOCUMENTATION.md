# Master Data Management System - Complete Updated Documentation
## Last Updated: October 2025

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Complete Project Structure](#complete-project-structure)
4. [Database Schema](#database-schema)
5. [Complete API Reference](#complete-api-reference)
6. [Frontend Modules & Components](#frontend-modules--components)
7. [Backend Services](#backend-services)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Data Flow & Workflows](#data-flow--workflows)
10. [Notification System](#notification-system)
11. [Data Entry AI Agent](#data-entry-ai-agent)
12. [PDF Bulk Generator](#pdf-bulk-generator)
13. [Setup & Configuration](#setup--configuration)
14. [Dependencies](#dependencies)
15. [Security & Performance](#security--performance)

---

## 🎯 Project Overview

**Master Data Management (MDM) System** is a comprehensive enterprise-grade solution for managing customer master data with AI-powered data entry, workflow automation, duplicate detection, and golden record management.

### Key Features

#### Core Features
- ✅ **AI-Powered Data Entry Agent** - OCR-based document processing with GPT-4o Vision
- ✅ **Intelligent Duplicate Detection** - Real-time duplicate checking with confidence scoring
- ✅ **Golden Record Management** - Master data consolidation and synchronization
- ✅ **Multi-Stage Approval Workflow** - Data Entry → Review → Compliance
- ✅ **Real-time Notifications** - Task-based notification system
- ✅ **Document Management** - Upload, preview, and manage business documents
- ✅ **PDF Bulk Generator** - Generate realistic business documents with images
- ✅ **Data Lineage Tracking** - Complete audit trail and data history
- ✅ **Multi-Language Support** - Arabic and English with auto-translation

#### Advanced Features
- ✅ **Smart Dropdown Matcher** - Intelligent field matching and suggestions
- ✅ **Quarantine Management** - Handle data quality issues
- ✅ **Compliance Checks** - Regulatory compliance validation
- ✅ **External System Sync** - Synchronize golden records with SAP/other systems
- ✅ **Executive Dashboards** - Business intelligence and analytics
- ✅ **User Management** - Role-based access control with profile pictures

### Technology Stack

**Frontend**
- Angular 17 with TypeScript
- Ng-Zorro-antd (Ant Design Components)
- Chart.js & ApexCharts for analytics
- RxJS for reactive programming
- HTML2Canvas & jsPDF for document generation

**Backend**
- Node.js with Express.js
- SQLite with better-sqlite3
- Multer for file uploads
- Nanoid for unique ID generation

**AI/ML Integration**
- OpenAI GPT-4o (Vision) for OCR and data extraction
- Custom smart matching algorithms
- Auto-translation service

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│                      (Angular 17 + TypeScript)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Dashboard   │  │  Data Entry  │  │  AI Agent Widget     │   │
│  │  Modules     │  │  Forms       │  │  (Floating Chat)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Duplicate   │  │  Compliance  │  │  User Management     │   │
│  │  Management  │  │  Workflow    │  │  & Notifications     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Services: API, Auth, Notifications, Data Entry    │   │
│  │  AI Services: OpenAI Integration, Auto-translate         │   │
│  │  Utility Services: Demo Data, Document Generation        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                            │
│                   (Node.js + Express + SQLite)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  REST APIs   │  │  File Upload │  │  Business Logic      │   │
│  │  (80+)       │  │  Handler     │  │  Validation          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Database Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SQLite Database (WAL Mode)                              │   │
│  │  Tables: users, requests, contacts, documents,           │   │
│  │          notifications, sync_operations, workflow_history │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  OpenAI API  │  │  SAP/ERP     │  │  External Systems    │   │
│  │  (GPT-4o)    │  │  Integration │  │  Sync                │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Complete Project Structure

```
master-data-mangment-local/
├── api/                                    # Backend API Server
│   ├── better-sqlite-server.js             # Main server file (6500+ lines)
│   ├── mdm_database.db                     # SQLite database file
│   ├── mdm_database.db-shm                 # Shared memory file
│   ├── mdm_database.db-wal                 # Write-ahead log
│   └── uploads/                            # Uploaded files directory
│       └── profile-*.png                   # User profile pictures
│
├── src/                                    # Frontend Source Code
│   ├── app/                                # Angular Application
│   │   ├── Core/                           # Core Services
│   │   │   ├── api.repo.ts                 # API Repository
│   │   │   ├── data-repo.ts                # Data Repository
│   │   │   ├── models.ts                   # TypeScript Models
│   │   │   └── role.service.ts             # Role Management Service
│   │   │
│   │   ├── admin-data-management/          # Admin Data Management Module
│   │   │   ├── admin-data-management.component.ts
│   │   │   ├── admin-data-management.component.html
│   │   │   ├── admin-data-management.component.scss
│   │   │   └── admin-data-management.module.ts
│   │   │
│   │   ├── admin-task-list/                # Admin Task List Module
│   │   │   ├── admin-task-list.component.ts
│   │   │   ├── admin-task-list.component.html
│   │   │   ├── admin-task-list.component.scss
│   │   │   ├── admin-task-list-routing.module.ts
│   │   │   └── admin-task-list.module.ts
│   │   │
│   │   ├── ai-assistant/                   # AI Assistant Module (Legacy)
│   │   │   ├── ai-assistant.component.ts
│   │   │   ├── ai-assistant.component.html
│   │   │   ├── ai-assistant.component.scss
│   │   │   ├── ai-assistant-routing.module.ts
│   │   │   └── ai-assistant.module.ts
│   │   │
│   │   ├── business-dashboard/             # Business Dashboard Module
│   │   │   ├── business-dashboard.component.ts
│   │   │   ├── business-dashboard.component.html
│   │   │   ├── business-dashboard.component.scss
│   │   │   └── business-dashboard.module.ts
│   │   │
│   │   ├── compliance/                     # Compliance Module
│   │   │   ├── compliance-task-list/       # Compliance Task List Component
│   │   │   │   ├── compliance-task-list.component.ts
│   │   │   │   ├── compliance-task-list.component.html
│   │   │   │   └── compliance-task-list.component.scss
│   │   │   ├── compliance-routing.module.ts
│   │   │   └── compliance.module.ts
│   │   │
│   │   ├── dashboard/                      # Main Dashboard Module
│   │   │   ├── golden-summary/             # Golden Record Summary Component
│   │   │   │   ├── golden-summary.component.ts
│   │   │   │   ├── golden-summary.component.html
│   │   │   │   └── golden-summary.component.scss
│   │   │   ├── dashboard.component.ts
│   │   │   ├── dashboard.component.html
│   │   │   ├── dashboard.component.scss
│   │   │   ├── dashboard-routing.module.ts
│   │   │   └── dashboard.module.ts
│   │   │
│   │   ├── data-entry-agent/               # ⭐ Data Entry AI Agent (NEW)
│   │   │   ├── data-entry-review-message/  # Review Message Component
│   │   │   │   └── data-entry-review-message.component.ts (Standalone)
│   │   │   ├── data-entry-agent.component.ts
│   │   │   ├── data-entry-agent.component.html
│   │   │   ├── data-entry-agent.component.scss
│   │   │   ├── data-entry-chat-widget.component.ts  # ⭐ Floating Chat Widget
│   │   │   ├── data-entry-chat-widget.component.html
│   │   │   ├── data-entry-chat-widget.component.scss
│   │   │   ├── data-entry-agent-routing.module.ts
│   │   │   └── data-entry-agent.module.ts
│   │   │
│   │   ├── data-lineage/                   # Data Lineage Module
│   │   │   ├── data-lineage.component.ts
│   │   │   ├── data-lineage.component.html
│   │   │   ├── data-lineage.component.scss
│   │   │   ├── data-lineage-routing.module.ts
│   │   │   └── data-lineage.module.ts
│   │   │
│   │   ├── duplicate-customer/             # Duplicate Customer Management
│   │   │   ├── duplicate-customer.component.ts
│   │   │   ├── duplicate-customer.component.html
│   │   │   ├── duplicate-customer.component.scss
│   │   │   ├── duplicate-customer-routing.module.ts
│   │   │   └── duplicate-customer.module.ts
│   │   │
│   │   ├── duplicate-records/              # Duplicate Records Module
│   │   │   ├── duplicate-records.component.ts
│   │   │   ├── duplicate-records.component.html
│   │   │   ├── duplicate-records.component.scss
│   │   │   ├── duplicate-records-routing.module.ts
│   │   │   └── duplicate-records.module.ts
│   │   │
│   │   ├── executive-dashboard/            # Executive Dashboard Module
│   │   │   ├── executive-dashboard.component.ts
│   │   │   ├── executive-dashboard.component.html
│   │   │   ├── executive-dashboard.component.scss
│   │   │   └── executive-dashboard.module.ts
│   │   │
│   │   ├── golden-requests/                # Golden Records Module
│   │   │   ├── golden-requests.component.ts
│   │   │   ├── golden-requests.component.html
│   │   │   ├── golden-requests.component.scss
│   │   │   ├── golden-requests-routing.module.ts
│   │   │   └── golden-requests.module.ts
│   │   │
│   │   ├── header/                         # Header Component Module
│   │   │   ├── header.component.ts
│   │   │   ├── header.component.html
│   │   │   ├── header.component.scss
│   │   │   ├── header-routing.module.ts
│   │   │   └── header.module.ts
│   │   │
│   │   ├── home/                           # Home Module
│   │   │   ├── home.component.ts
│   │   │   ├── home.component.html
│   │   │   ├── home.component.scss
│   │   │   ├── home-routing.module.ts
│   │   │   └── home.module.ts
│   │   │
│   │   ├── login/                          # Login Module
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   ├── login.component.scss
│   │   │   ├── login-routing.module.ts
│   │   │   └── login.module.ts
│   │   │
│   │   ├── my-task-list/                   # My Task List Module
│   │   │   ├── my-task-list.component.ts
│   │   │   ├── my-task-list.component.html
│   │   │   ├── my-task-list.component.scss
│   │   │   ├── my-task-list-routing.module.ts
│   │   │   └── my-task-list.module.ts
│   │   │
│   │   ├── new-request/                    # New Request Module
│   │   │   ├── new-request.component.ts
│   │   │   ├── new-request.component.html
│   │   │   ├── new-request.component.scss
│   │   │   ├── new-request-routing.module.ts
│   │   │   └── new-request.module.ts
│   │   │
│   │   ├── pdf-bulk-generator/             # ⭐ PDF Bulk Generator (NEW)
│   │   │   ├── pdf-bulk-generator.component.ts
│   │   │   ├── pdf-bulk-generator.component.html
│   │   │   ├── pdf-bulk-generator.component.scss
│   │   │   ├── pdf-bulk-generator-routing.module.ts
│   │   │   └── pdf-bulk-generator.module.ts
│   │   │
│   │   ├── quarantine/                     # Quarantine Module
│   │   │   ├── quarantine.component.ts
│   │   │   ├── quarantine.component.html
│   │   │   ├── quarantine.component.scss
│   │   │   └── quarantine.module.ts
│   │   │
│   │   ├── rejected/                       # Rejected Records Module
│   │   │   ├── rejected.component.ts
│   │   │   ├── rejected.component.html
│   │   │   ├── rejected.component.scss
│   │   │   ├── rejected-routing.module.ts
│   │   │   └── rejected.module.ts
│   │   │
│   │   ├── services/                       # ⭐ Application Services
│   │   │   ├── ai.service.ts               # AI Service (Claude/OpenAI)
│   │   │   ├── analytical-bot.service.ts   # Analytical Bot Service
│   │   │   ├── auto-translate.service.ts   # Auto-translation Service
│   │   │   ├── data-entry-agent.service.ts # ⭐ Data Entry Agent Service
│   │   │   ├── demo-data-generator.service.ts # Demo Data Generator
│   │   │   ├── document-image-generator.service.ts # ⭐ Document Image Generator
│   │   │   ├── mock-data.service.ts        # Mock Data Service
│   │   │   ├── notification.service.ts     # ⭐ Notification Service
│   │   │   ├── realistic-document-generator.service.ts # Document Generator
│   │   │   ├── simple-ai.service.ts        # Simple AI Service
│   │   │   └── smart-dropdown-matcher.service.ts # Smart Dropdown Matcher
│   │   │
│   │   ├── shared/                         # Shared Components & Services
│   │   │   ├── notification-dropdown/      # ⭐ Notification Dropdown Component
│   │   │   │   ├── notification-dropdown.component.ts
│   │   │   │   ├── notification-dropdown.component.html
│   │   │   │   └── notification-dropdown.component.scss
│   │   │   ├── lookup-data.ts              # ⭐ Lookup Data (Countries, Cities, etc.)
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── sync-golden-records/            # Golden Records Sync Module
│   │   │   ├── sync-golden-records.component.ts
│   │   │   ├── sync-golden-records.component.html
│   │   │   ├── sync-golden-records.component.scss
│   │   │   ├── sync-golden-records-routing.module.ts
│   │   │   └── sync-golden-records.module.ts
│   │   │
│   │   ├── technical-dashboard/            # Technical Dashboard Module
│   │   │   ├── technical-dashboard.component.ts
│   │   │   ├── technical-dashboard.component.html
│   │   │   ├── technical-dashboard.component.scss
│   │   │   └── technical-dashboard.module.ts
│   │   │
│   │   ├── user-management/                # User Management Module
│   │   │   ├── user-management.component.ts
│   │   │   ├── user-management.component.html
│   │   │   ├── user-management.component.scss
│   │   │   ├── user-management-routing.module.ts
│   │   │   └── user-management.module.ts
│   │   │
│   │   ├── user-profile/                   # User Profile Module
│   │   │   ├── user-profile.component.ts
│   │   │   ├── user-profile.component.html
│   │   │   ├── user-profile.component.scss
│   │   │   └── user-profile.module.ts
│   │   │
│   │   ├── app-routing.module.ts           # Main Routing Module
│   │   ├── app.component.ts                # Root Component
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.module.ts                   # Root Module
│   │
│   ├── assets/                             # Static Assets
│   │   ├── css/                            # Global Styles
│   │   ├── fonts/                          # Custom Fonts (Cairo, etc.)
│   │   ├── i18n/                           # Internationalization
│   │   │   ├── ar.json                     # Arabic Translations
│   │   │   └── en.json                     # English Translations
│   │   └── img/                            # Images & Icons
│   │       └── agent-icon.png              # ⭐ AI Agent Icon
│   │
│   ├── environments/                       # Environment Configuration
│   │   └── environment.ts                  # Development Environment
│   │
│   ├── index.html                          # Main HTML File
│   ├── main.ts                             # Main Entry Point
│   └── styles.scss                         # Global Styles
│
├── tools/                                  # Build & Migration Tools
│   ├── codemod-fix.mjs                     # Code Modernization
│   ├── fix-patches.mjs                     # Patch Fixes
│   ├── list-pages.mjs                      # Page Listing
│   ├── patch-all-pages.mjs                 # Bulk Page Patching
│   ├── patch-page.mjs                      # Single Page Patching
│   └── verify-and-loop.mjs                 # Verification Loop
│
├── Configuration Files
├── angular.json                            # Angular Configuration
├── package.json                            # NPM Dependencies
├── package-lock.json                       # NPM Lock File
├── pnpm-lock.yaml                          # PNPM Lock File
├── tsconfig.json                           # TypeScript Configuration
├── tsconfig.app.json                       # App TypeScript Config
├── tsconfig.spec.json                      # Test TypeScript Config
└── vite.config.ts                          # Vite Configuration

└── Documentation Files
    ├── PROJECT_DOCUMENTATION.md            # Original Documentation
    ├── DATA_ENTRY_AI_AGENT_DOCUMENTATION.md # AI Agent Documentation
    ├── COMPLETE_DOCUMENTATION.md           # Complete System Documentation
    ├── COMPLETE_TECHNICAL_DOCUMENTATION.md # Technical Documentation
    ├── COMPONENTS_DOCUMENTATION.md         # Components Documentation
    ├── CHATBOT_FEATURES.md                 # Chatbot Features
    ├── CLAUDE_AI_DIALECT_SUPPORT.md        # AI Dialect Support
    ├── CLAUDE_INTELLIGENCE_GUIDE.md        # AI Intelligence Guide
    ├── CLAUDE_LLM_ONLY_GUIDE.md            # LLM Only Guide
    ├── CLAUDE_SETUP.md                     # Claude Setup
    ├── EGYPTIAN_DIALECT_GUIDE.md           # Egyptian Dialect Guide
    ├── ENHANCED_CHATBOT_GUIDE.md           # Enhanced Chatbot Guide
    ├── ENHANCED_INTERACTION_GUIDE.md       # Enhanced Interaction Guide
    ├── FILE_UPLOAD_FEATURES.md             # File Upload Features
    └── MIXED_LANGUAGE_FIX_GUIDE.md         # Mixed Language Fix Guide
```

### Key Highlights:
- ⭐ **31 Feature Modules** with lazy loading
- ⭐ **11 Core Services** for business logic
- ⭐ **Data Entry AI Agent** with floating chat widget
- ⭐ **PDF Bulk Generator** for document creation
- ⭐ **Notification System** with dropdown component
- ⭐ **Comprehensive Documentation** (15+ guides)









