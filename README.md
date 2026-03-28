<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/3b82f6?text=TARGETUP" alt="Targetup Logo" />
  <h1>Targetup - Enterprise API & Backend</h1>
  <p>The core Node.js backend server orchestrating the Targetup ecosystem (Attendance, HR, Forms, Real-Time Chat, and CRM/Lead Management).</p>
</div>

<hr />

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Environment Configuration (ENV)](#environment-configuration-env)
4. [Installation & Setup](#installation--setup)
5. [Database Architecture (42 Models)](#database-architecture-42-models)
6. [API Controllers (30 Modules)](#api-controllers-30-modules)
7. [Middleware Pipeline](#middleware-pipeline)
8. [Socket.IO Events](#socketio-events)
9. [Full API Endpoint Reference](#full-api-endpoint-reference)
10. [DevOps & Ecosystem](#devops--ecosystem)

---

## 🏗️ System Overview
This backend acts as the central brain of the Targetup platform, serving data to the **React Web Frontend**, **Electron Desktop App**, and interacting asynchronously with two background microservices: **Lead Engine** (BullMQ/Redis for scraping) & **Storage Agent** (File streaming & space limits).

---

## 🚀 Technology Stack
* **Runtime**: Node.js (v18+)
* **Framework**: Express 5.x
* **Database**: MySQL 8.0
* **ORM**: Sequelize (with implicit migrations `alter: false`)
* **Real-time Engine**: Socket.IO
* **Caching & Queue**: Redis (via ioRedis)
* **Authentication**: JSON Web Tokens (JWT), BcryptJS
* **File Uploads**: Multer (Memory Buffer to Storage Microservice)
* **Security & Formatting**: Helmet, CORS, Morgan

---

## ⚙️ Environment Configuration (`.env`)
Create a `.env` file in the root directory.

```ini
# Application Setup
PORT=5050
NODE_ENV=production
SERVER_IP=127.0.0.1
FRONTEND_URL=http://localhost:5173

# Database (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASS=your_db_password
DB_NAME=team_attendance

# Redis Connection (Session & Cache)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Security Tokens
JWT_SECRET=super_secret_jwt_key_here

# Microservice Endpoints
STORAGE_AGENT_URL=http://localhost:3001
LEAD_ENGINE_URL=http://localhost:4001
```

---

## 🛠️ Installation & Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/targetup26/targetup.management.backend.git
   cd targetup.management.backend
   npm install
   ```
2. **Database Initialization**:
   Sequelize will automatically synchronize the schema mappings to the database defined in your `.env`.
   Note: Make sure `team_attendance` exists in MySQL before running.

3. **Start the Express Server**:
   ```bash
   npm run dev      # Hot reload via Nodemon
   # OR
   npm start        # Standard Node execution
   ```

---

## 🗄️ Database Architecture (42 Models)
The system uses massive relational mapping. Core models include:

### HR & Identity Layer
* `User`: Application identities containing Passwords, Presence States, and Role mappings.
* `Employee`: Master database for staff. Auto-generating unique Employee Codes (e.g., TUP-2026-104), tied sequentially. Relates to Departments and Job Roles.
* `Role` & `Permission`: Dynamic RBAC system linking array of privileges to Users.
* `AttendanceEntry`: Immutable time logs with `LateMins` and `ViolationPoints` calculation logic.

### Communication
* `ChatRoom`: Three distinct typologies: `dm` (Direct Messages), `group`, and `department`.
* `ChatMessage`: Handles texts, dynamic storage file attachment UUIDs, and system event markers.
* `MessageStatus`: Real-time tracking of message reads across multiple participants.

### CRM & Data Collection
* `Lead` & `LeadActivity`: Deep tracking for sales pipelines. Features status mapping (`NEW`, `CONTACTED`, `CONVERTED`), and extraction payload metadata (Lat/Lng, Reviews).
* `Category` & `Subcategory`: The Taxonomy system driving the Lead Engine's classification heuristics.
* `FormTemplate` & `FormSubmission`: Dynamic JSON schemas powering interactive, multi-stage approval forms directly from the Frontend and Desktop modules.
* `FileMetadata`: Multi-version file tracking handling folder hierarchies and virtual paths bridging physical files in the Storage Agent.

---

## 🕹️ API Controllers (30 Modules)
Controllers are cleanly separated into domains in `/src/controllers/*`:

1. **Identity**: `authController` (Login, Registration, Token Refresh), `userController`, `userProfileController`.
2. **Organization**: `employeeController`, `departmentController`, `jobRoleController`.
3. **Attendance**: `attendanceController` (Check In/Out), `breakController`, `shiftController`, `deviceController`.
4. **Access Control**: `roleController`, `permissionController`, `onboardingController`, `auditController`.
5. **Comms**: `chatController` (Groups, DM resolving, Read Receipts), `personalNoteController`.
6. **Data Engines**: `leadController`, `leadActivityController`, `categoryController`, `taxonomyController`, `exportController`.
7. **Infrastructure**: `storageController`, `shareController`, `adminController`, `configController`, `printSettingsController`.

---

## 🛡️ Middleware Pipeline
Requests are intercepted and validated before reaching controllers:

1. **`auth.js`**:
   * Decodes JWT headers or query parameters (for raw downloads).
   * Populates `req.user` with flattened Roles and Permissions arrays for rapid evaluating.
2. **`requirePermission.js`**:
   * Granular RBAC checker (e.g., `requirePermission('attendance.view')`).
   * Evaluates user flattened arrays and bypasses automatically for `ADMIN` or `SUPER_ADMIN`.
3. **`onboardingGuard.js`**:
   * Prevents standard users from bypassing the mandatory first-time password/profile setup screen.
4. **`rateLimiter.js`**:
   * Anti-spam token-bucket mechanisms applied mainly to Chat modules.
5. **`upload.js`**:
   * Configured via `multer` to pipe memory streams directly to the isolated Storage Agent without bogging down the main backend's I/O.

---

## ⚡ Socket.IO Events
The system maintains a lightweight WebSocket connection with Electron Desktop and Web Clients:

* **Emits Received**:
  * `presence:update`: Triggers status changes (Online, Busy, Out of Office).
  * `typing:start` / `typing:stop`: Broadcasts user typing feedback per Chatroom ID.
  * `chat:read_receipt`: Updates unread counters universally.
* **Emits Dispatched**:
  * `chat:message`: Broadcasts instantaneous text/attachments.
  * `user:presence`: Pushes live status updates of employees to dashboards.

---

## 📡 Full API Endpoint Reference

### Authentication & Config
* `POST /api/auth/login` - Generates JWT.
* `POST /api/auth/register` - Optional signup logic.
* `GET /api/auth/me` - Validates token and returns current user snapshot.
* `GET /api/admin/config/presence` - Fetches global status identifiers.

### Organization & Attendance
* `POST /api/attendance/check-in` - Initiates shift timer.
* `POST /api/attendance/check-out` - Computes total times and late penalties.
* `GET /api/employees` - Paginated grid of all staff metrics.
* `GET /api/departments` - Hierarchy tree.

### CRM & Categorization
* `GET /api/categories/:id/subcategories` - Taxonomy mapping.
* `POST /api/leads/extract` - Proxies extraction instructions to the BullMQ Lead Engine background worker.
* `GET /api/leads` - Filterable CRM grid (Status, Assignee).

### Storage & Shareables
* `POST /api/storage/upload` - Receives FormData, streams memory buffer to Windows Service agent.
* `GET /api/storage/files` - Retreives structured Meta paths.
* `GET /api/storage/download/:id` - Proxies raw bytes from the agent to the client.
* `POST /api/storage/share` - Generates short-lived public JWT links for external file distribution.

---

## 🚢 DevOps & Ecosystem
The backend natively integrates with PM2 and Docker.

* **PM2 Integration** (`ecosystem.config.js`):
  ```bash
  pm2 start ecosystem.config.js --env production
  pm2 logs attendance-backend
  ```
* **Daily Automation**:
  The backend contains an integrated network crawler that executes routine background scripts automatically (using `node-cron` or interval loops within `server.js`).
