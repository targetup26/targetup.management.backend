# Targetup - Core Backend API

The central Node.js backend server for the Targetup Enterprise Attendance & CRM system. This module handles all core business logic, authentication, RBAC, employee attendance tracking, real-time Socket.io chat routing, and database interactions.

## 🚀 Technology Stack
* **Runtime**: Node.js
* **Framework**: Express 5.x
* **Database**: MySQL 8.0 (via Sequelize ORM)
* **Real-time**: Socket.IO
* **Caching/Queues**: Redis
* **Security**: JWT (JSON Web Tokens), Bcryptjs, Helmet, Cors
* **File Processing**: Multer, Archiver

---

## ⚙️ Environment Variables (`.env`)
Create a `.env` file in the root of the `backend` directory.

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

# Microservice URLs
STORAGE_AGENT_URL=http://localhost:3001
LEAD_ENGINE_URL=http://localhost:4001
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**: Ensure you have Node.js (v18+), MySQL 8.0, and Redis installed and running.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Database Initialization**:
   The Sequelize ORM is configured to automatically sync missing tables without destructive alterations (via `alter: false` in `server.js`). Note: ensure you've created the `team_attendance` database in MySQL first.
   *Optional:* If you have seed data: `npm run seed`

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The API will start on `http://localhost:5050`.

5. **Production Deployment**:
   ```bash
   npm start
   # Or using PM2 (recommended)
   pm2 start ecosystem.config.js --only attendance-backend
   ```

---

## 📁 Key Directories
* `/src/controllers`: 30+ controllers handling endpoints (Auth, Attendance, Chat, Storage, CRM).
* `/src/models`: 42+ Sequelize models defining the database schema.
* `/src/routes/api.js`: The central routing map.
* `/src/middleware`: Custom guards (`auth.js`, `requirePermission.js`, `onboardingGuard.js`).
* `/server.js`: Server entry point including Socket.io real-time connection logic.
