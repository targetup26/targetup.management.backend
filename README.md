# <p align="center">⚙️ TargetUp Core - Deep Technical Specification</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white" />
</p>

---

## 🏗️ System Architecture & Logic
TargetUp Core is a robust Node.js API that acts as the central hub for workforce management and sales intelligence. It features a custom RBAC (Role-Based Access Control) system and manages complex relations between Employees, Users, Roles, and Leads.

### 🛠️ The Tech Hierarchy (A-Z)
- **Runtime**: `Node.js` (LTS)
- **API Framework**: `Express.js` (Modular Routing)
- **Security**: `Helmet` (Header hardening) + `CORS` (Cross-origin control)
- **Auth Strategy**: `JWT` + `Bcrypt.js` (Password hashing)
- **Database Layer**: `Sequelize ORM` + `MySQL 8.0`
- **Real-time Pipeline**: `Socket.io` (Presence & Live Notifications)
- **Middleware Infrastructure**: Custom Auth guards, Onboarding checks, and Permission validators.

---

## 📡 Full API Inventory (A to Z)

### 🔑 1. Identity & Access (Auth)
Endpoints for session management and profile control.
- `POST /api/auth/login`: Authenticates user and returns JWT.
- `POST /api/auth/register`: Onboards new administrative identities.
- `PUT /api/auth/profile`: Updates current session metadata.
- `GET /api/profile`: Retrieves deep profile data (JSON).

### 👥 2. Personnel Management
Internal HR and staff orchestration.
- `GET /api/employees`: List all employees with relational mapping.
- `POST /api/employees`: Onboard new staff members.
- `PUT /api/employees/:id`: Modify personnel records.
- `DELETE /api/employees/:id`: Offboard personnel.
- `GET /api/departments`: Manage organizational nodes.
- `GET /api/job-roles`: Precise role-to-staff assignment.

### ⏱️ 3. Attendance & Operations
Real-time tracking for office and remote staff.
- `POST /api/attendance/check-in`: Logs entry time with IP verification.
- `POST /api/attendance/check-out`: Finalizes daily session.
- `GET /api/attendance/stats/today`: Live dashboard metrics.
- `POST /api/breaks/start/end`: Tactical shift interruption tracking.

### � 4. Sales Intelligence (Lead Engine Proxy)
Interface to the Lead Generation microservice.
- `POST /api/leads/extract`: Triggers external scraping via Lead Engine.
- `GET /api/leads`: Accesses the enriched lead repository.
- `GET /api/leads/job/:id`: Real-time status monitor for extractions.
- `GET /api/leads/history`: Timeline of all previous extraction sessions.
- `POST /api/leads/export`: Generates high-utility CSV/Excel data dumps.

### � 5. Enterprise Assets & Storage
- `POST /storage/upload`: Secure file ingestion to the cloud vault.
- `GET /storage/files`: Directory listing of enterprise assets.
- `GET /storage/download/:id`: Authorized resource retrieval.

### 🛡️ 6. System Governance (Admin)
High-privilege endpoints for system modulation.
- `GET /api/admin/roles`: CRUD for deep permission mapping.
- `GET /api/admin/audit-logs`: The "Security Ledger" tracking all master actions.
- `GET /api/admin/dashboard-stats`: Executive level operational reporting.
- `GET /api/admin/submissions`: Centralized review for all employee form submissions.

---

## 📂 Core Folder Mapping
- `src/controllers`: The "Brains" - handling logic and response cycles.
- `src/models`: The "Structure" - Sequelize schemas for MySQL.
- `src/routes/api.js`: The "Gatekeeper" - defining all 60+ API entry points.
- `src/middleware`: The "Shields" - Auth, Permissions, and Validation.
- `src/services`: The "Connectors" - handling Storage nodes and External APIs.

---
<p align="center">*The Core Hub of the TargetUp Intelligent Ecosystem*</p>
