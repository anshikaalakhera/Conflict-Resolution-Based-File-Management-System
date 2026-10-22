# ConflictCore — Conflict-Resolution-Based File Management System

A full-stack file management system that integrates **file and folder operations, operating system concepts, resource locking, CPU scheduling, deadlock handling, and relational database management** into one unified application.

ConflictCore aims to demonstrate how operating system principles and database management techniques can be applied to practical file management and concurrent resource access.

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [Operating System Module](#-operating-system-module)
- [Database Module](#-database-module)
- [Testing](#-testing)
- [Future Enhancements](#-future-enhancements)
- [Team Members](#-team-members)

## 🚀 Overview

Traditional file management systems focus primarily on storing, organizing, uploading, downloading, and modifying files. However, when multiple operations compete for shared resources, issues such as resource conflicts, synchronization problems, and deadlocks can arise.


- **Authentication & User Management:** User registration and login powered by secure `bcryptjs` password hashing, token-based session management, and quick 1-click demo logins for Admin, Developer, and Collaborator roles.
- **Hierarchical Folder Explorer:** Visual folder cards grid, recursive breadcrumb navigation, cycle prevention on folder movements, and cascading child relocation upon deletion.
- **Full File Lifecycle:** Multipart file upload, staged disk storage, atomic metadata registration, file downloading, renaming, and moving to Root (`folder_id: null`).
- **File Versioning & Conflict Review:** Transactional revision history tracking every operation, real-time concurrent write contention detection, and interactive 3-way conflict resolution (`KEEP_CURRENT`, `ACCEPT_INCOMING`, `CREATE_BRANCH`).
- **CPU Process Scheduling:** Deterministic simulation and live kernel dispatching using First-Come-First-Served (FCFS), Shortest Job First (SJF), and Priority algorithms with live Gantt timeline and turnaround/waiting metrics.
- **Resource Locking & Concurrency Control:** Strict exclusive mutual exclusion locks, FIFO waiting queues, and atomic lock release hooks upon process completion or abortion.
- **Deadlock Cycle Detection & Recovery:** Live Wait-For graph analysis identifying directed cycles, deterministic victim selection (priority, arrival, PID), and automated clean rollback.
- **Transactional MySQL Persistence:** ACID-compliant MySQL 8.0 storage managing 7 relational tables (`USERS`, `FOLDERS`, `FILES`, `FILE_PERMISSIONS`, `OPERATIONS`, `PROCESSES`, `FILE_LOCKS`).
- **Unified Web Interface:** Responsive single-page application featuring a dedicated Project Landing Page, Overview Dashboard, File Explorer, Process Monitor, Scheduler, Lock Manager, Deadlock Centre, and Activity Log.
=======
**ConflictCore** brings together a web-based file management interface, a backend service layer, an operating system simulation module, and a relational database layer.

The system is designed to demonstrate:
2ab5b8536caf98b0b6596c3475560387a630a286

- File and folder management through a web interface.
- Backend processing of file operations.
- CPU scheduling and process management concepts.
- Resource locking and conflict handling.
- Deadlock detection and handling concepts.
- Persistent storage of application data using a relational database.

## ✨ Key Features

### 📁 File and Folder Management

- Upload and download files.
- Create and manage folders.
- Rename and delete files or folders.
- Organize file-related operations through a centralized interface.

### ⚙️ Operating System Concepts

- Process creation and process-state management.
- CPU scheduling algorithm simulations.
- Resource locking and synchronization.
- Deadlock-related handling and analysis.
- Process and scheduling metrics.

### 🔐 Resource and Conflict Management

- Model access to shared resources.
- Use locking mechanisms to coordinate competing operations.
- Demonstrate resource contention and deadlock scenarios.
- Integrate OS-related functionality with backend operations.

### 🗄️ Database Management

- Store application data in a relational database.
- Organize database access through query and repository modules.
- Use structured SQL scripts for schema setup and sample data.
- Include database verification and CRUD-related queries.

### 🖥️ Web Application

- Frontend interface for interacting with the system.
- Backend API integration.
- Modular separation of frontend, backend, OS, and database components.

> **Note:** Features exposed in the interface depend on the corresponding backend and OS integrations. Verify each feature against the current implementation before describing it as production-ready.

## 🏗️ System Architecture

ConflictCore follows a modular architecture:

```text
                   ┌──────────────────────┐
                   │      Frontend        │
                   │    HTML / CSS / JS   │
                   └──────────┬───────────┘
                              │ HTTP / REST API
                              ▼
                   ┌──────────────────────┐
                   │     Backend API      │
                   │    Node.js / Express │
                   └───────┬───────┬──────┘
                           │       │
                ┌──────────▼─┐  ┌──▼────────────┐
                │ OS Module  │  │ Database Layer│
                │ Scheduling │  │ SQL / MySQL   │
                │ Locks      │  │ Repositories  │
                │ Deadlocks  │  │ Transactions  │
                └────────────┘  └───────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| Frontend | User interface and interaction with backend endpoints |
| Backend | API routing, request processing, file operations, and module integration |
| OS module | Process management, scheduling, locking, and deadlock-related logic |
| Database module | Schema, queries, repositories, transactions, and persistent data |
| Tests and documentation | Verification, integration guidance, and project documentation |

## 🛠️ Technology Stack

| Area | Technologies |
|---|---|
<<<<<<< HEAD
| Frontend | HTML5, CSS3, ES6+ JavaScript, Responsive SPA |
| Backend API | Node.js (ESM), Hono web framework, `@hono/node-server` |
| Concurrency & Auth | `bcryptjs` password hashing, token-based sessions |
| Database | MySQL 8.0 with `mysql2/promise` connection pooling & transactions |
| OS Module | In-memory CPU scheduler, exclusive lock manager, wait-for cycle detector |
| Storage Layer | Multipart file streaming, staged disk persistence in `backend/storage/` |
| Automated Testing | Node.js native test runner (`node --test`), 34 OS tests + 11 integration tests |
| Development Tools | Git, PowerShell, Visual Studio Code |
=======
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL, SQL |
| OS module | JavaScript-based process and scheduling simulations |
| API communication | HTTP / REST |
| Testing | Node.js test scripts and Python verification scripts |
| Development tools | Visual Studio Code, Git, GitHub |
>>>>>>> 2ab5b8536caf98b0b6596c3475560387a630a286

Refer to the individual `package.json` files and project configuration for the exact dependency versions.

## 📂 Project Structure

```text
ConflictCore/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── os/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── routes/
│   ├── services/
│   ├── test/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── db/
│   ├── migrations/
│   ├── queries/
│   ├── seeds/
│   ├── schema.sql
│   ├── verify.py
│   └── README.md
├── docs/
│   ├── DBMS_INTEGRATION.md
│   ├── DBMS_WALKTHROUGH.md
│   ├── FRONTEND.md
│   └── OS_MODULE.md
├── frontend/
│   ├── index.html
│   ├── README.md
│   └── .gitignore
├── tests/
│   └── integration/
├── .env.example
├── .gitignore
├── README.md
└── server.js
```

*The tree represents the integration workspace. Some files or directories may change as the project evolves.*

## 💻 Getting Started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) and npm.
- [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).
- [Git](https://git-scm.com/).
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor.

Check your installations:

```bash
node --version
npm --version
git --version
```

Check that your MySQL server is running before configuring the database.

### 1. Clone the Repository

```bash
git clone https://github.com/kumar-shubham1/Conflict-Resolution-Based-File-Management-System.git
cd Conflict-Resolution-Based-File-Management-System
```

To use a particular integration branch, switch to that branch after cloning:

```bash
git fetch origin
git switch feature/conflictcore-pr
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

Install the OS module dependencies separately if required:

```bash
cd os
npm install
cd ..
```

Return to the repository root when you need to run root-level commands:

```bash
cd ..
```

### 3. Configure Environment Variables

Create a local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace the example values with your local configuration.

Use the variable names already defined in `.env.example` and referenced by the backend. Do not commit `.env` or publish real passwords, database credentials, tokens, or other secrets.

### 4. Configure the Database

Follow the [Database Setup](#-database-setup) section below before starting the application.

## 🗄️ Database Setup

ConflictCore includes a dedicated database directory for schema definitions, migrations, queries, seed data, and verification.

### Database Files

| File or directory | Purpose |
|---|---|
| `db/schema.sql` | Database schema definition |
| `db/migrations/` | Schema migration scripts |
| `db/queries/` | CRUD and relational query examples |
| `db/seeds/` | Sample data |
| `db/verify.py` | Database verification script |
| `backend/src/db/` | Backend database connection, queries, repositories, and transaction logic |

### Setup Steps

1. Start your local MySQL service.
2. Create the database specified by your project's configuration.
3. Configure the database credentials in `.env`.
4. Review the schema and migration scripts.
5. Apply the required schema scripts to your intended development database.
6. Run the project's verification script if its dependencies are installed.

Example MySQL commands:

```sql
CREATE DATABASE conflictcore_test_db;
SHOW DATABASES;
```

Select the database before running schema statements:

<<<<<<< HEAD
### 5. Start the unified application

Run the application entry point from the project root:
=======
```sql
USE conflictcore_test_db;
```

**Important:** The database name above is an example used in the development workspace. Check your `.env` and database connection configuration before running these commands. Do not recreate, drop, or reset a database containing data you need to preserve.

For more details, see [`db/README.md`](db/README.md) and [`docs/DBMS_INTEGRATION.md`](docs/DBMS_INTEGRATION.md).

## ▶️ Running the Application

The exact startup command depends on the scripts defined in your `package.json` files.

### Start the Backend

From the repository root:

```bash
cd backend
npm start
```

If `npm start` is not defined, inspect the available scripts:
>>>>>>> 2ab5b8536caf98b0b6596c3475560387a630a286

```bash
node server.js
```

<<<<<<< HEAD
The unified Hono server starts immediately on port **3000**:
- **REST APIs:** `http://localhost:3000/api/...`
- **Interactive Web App:** `http://localhost:3000/`
- Automatic storage directory initialization (`backend/storage/`)
- Persistent queued process restoration from MySQL

### 6. Access the application

Open your browser to:
```text
http://localhost:3000
```
- The interface opens to the **ConflictCore Project Landing Page**.
- Click **"Sign In"** or use the **1-Click Quick Demo Login** buttons:
  - 👑 **Admin**: `admin_super` / `admin123`
  - 💻 **Developer**: `shubham_k` / `password123`
  - 🤝 **Collaborator**: `jahnvi_s` / `password123`
- Or click **"Create New Account"** to register a new user with bcrypt-hashed credentials.

## Testing and Verification

ConflictCore includes a comprehensive test suite covering both OS scheduling/deadlock algorithms and live full-stack API flows.
=======
Use the development script configured by the project, if available.

### Start the Frontend

Open `frontend/index.html` in a browser or use a local development server appropriate for the frontend configuration.

The frontend must be configured to call the correct backend API URL. If the backend uses a different port or base URL, update the frontend configuration accordingly.

### Verify the Application

Once the backend is running:

1. Confirm that the server starts without configuration errors.
2. Open the frontend.
3. Test the file and folder operations supported by the current implementation.
4. Verify the relevant API responses.
5. Confirm that database operations persist as expected.
6. Test OS-module functionality using the supplied test scripts.

## ⚙️ Operating System Module

The OS module demonstrates operating system concepts used to reason about processes and shared resources.

Its source code and tests are located in `backend/os/`.

### Main Concepts

- **Process management:** Representing processes and their state transitions.
- **CPU scheduling:** Simulating scheduling policies and analyzing execution order.
- **Resource locking:** Coordinating access to shared resources.
- **Deadlock handling:** Demonstrating deadlock-related scenarios and handling logic.
- **Metrics:** Collecting scheduling or process-related measurements.

For implementation details, see [`docs/OS_MODULE.md`](docs/OS_MODULE.md).

## 🗃️ Database Module

The DBMS module connects the application to relational database concepts.

### Main Concepts

- Relational schema design.
- CRUD operations.
- SQL queries and relational operations.
- Repository-based data access.
- Transaction handling.
- Database verification and sample data.

For the implementation walkthrough, see [`docs/DBMS_WALKTHROUGH.md`](docs/DBMS_WALKTHROUGH.md).

## 🧪 Testing

ConflictCore contains tests for OS functionality, backend behavior, and integration workflows.

### Run the OS Module Tests
>>>>>>> 2ab5b8536caf98b0b6596c3475560387a630a286

### 1. OS Kernel Unit Tests (34 tests)
Validates CPU scheduling (FCFS, SJF, Priority), tie-breaking, lock acquisition/waiting queues, and Wait-For graph cycle detection with automated victim abortion:
```bash

node --test backend/os/tests/*.test.js
```

### 2. Full-Stack Integration Tests (11 tests)
Validates health check, static frontend serving, bcrypt registration/login, folder CRUD with cycle prevention, file root move, algorithm switching, lock/deadlock states, version history, conflict detection, and `CREATE_BRANCH` conflict resolution:
```bash
node --test backend/tests/integration.test.js
```

Before considering a feature complete, verify the frontend, API, database, and relevant OS behavior together. A passing unit test does not necessarily prove that the entire application works end-to-end.

## API Documentation

The backend API is organized into modular Hono route files mounted under `/api`:

| Route module | Base Path | Key Endpoints & Capabilities |
|---|---|---|
| `routes/auth.routes.js` | `/api/auth` | `POST /register`, `POST /login` (bcrypt hashing, session tokens), `POST /logout` |
| `routes/file.routes.js` | `/api/files` | `GET /` (list), `POST /upload` (multipart stage), `GET /:id/download`, `PUT /:id` (rename/move to root), `DELETE /:id`, `GET /:id/versions` (revision history), `GET /:id/conflicts` (active lock contention), `POST /:id/resolve-conflict` (`KEEP_CURRENT`, `ACCEPT_INCOMING`, `CREATE_BRANCH`) |
| `routes/folder.routes.js` | `/api/folders` | `GET /` (hierarchy), `POST /`, `PUT /:id` (rename/move with cycle prevention), `DELETE /:id` (safe child relocation) |
| `routes/operation.routes.js` | `/api/operations` | `GET /` (audit log), `POST /` (queue operation), `POST /:id/execute` (submit to OS kernel) |
| `routes/os.routes.js` | `/api` | `GET /processes` (states & metrics), `POST /processes/dispatch` (CPU tick), `PUT /scheduler/algorithm` (FCFS, SJF, PRIORITY), `GET /locks` (holders & FIFO queues), `GET /deadlocks` (Wait-For cycle detection & recovery victim) |
| `routes/test.routes.js` | `/api/test` | Subsystem integration diagnostics |

## Development Workflow

The project uses Git for version control and GitHub for collaboration.

A typical feature workflow is:

1. Create a feature branch from the intended base branch.
2. Implement the change in the relevant module.
3. Run the applicable tests.
4. Review the changes and check that no secrets or generated files are included.
5. Commit and push the branch.
6. Open a pull request and describe the implementation, testing, and known limitations.

Example:
=======
cd backend/os
npm test
```

Run this command only if the `test` script is defined in `backend/os/package.json`.

### Inspect Available Backend Tests

```bash
cd backend
npm run
```

Use the test script configured in `backend/package.json`.

### Database Verification

Review the database verification instructions in `db/README.md` before running:
 2ab5b8536caf98b0b6596c3475560387a630a286

```bash
python db/verify.py
```

Run this from the repository root only if the script and its dependencies are configured for your environment.

### Integration Testing

The `tests/integration/` directory contains integration-related documentation and test resources.

Test the complete flow across the frontend, backend, OS module, and database. Use a dedicated test database and avoid destructive test scripts against databases containing important data.

## 🔮 Future Enhancements

Potential improvements include:

- Stronger authentication and role-based access control.
- More comprehensive concurrent file-operation testing.
- Improved conflict reporting and recovery workflows.
- Additional scheduling algorithms and comparative metrics.
- Expanded automated integration and end-to-end testing.
- Better observability, logging, and error reporting.
- Deployment configuration and production hardening.

These are proposed enhancements, not a claim that all are currently implemented.

## 👥 Team Members

This project was developed collaboratively as part of our **Project-Based Learning (PBL)** initiative, combining frontend development, backend engineering, operating system concepts, and database management.

| Team Member | Role | Contribution |
|---|---|---|
| **Anshika lakhera** | Team Lead | Project coordination, backend development, and overall system integration |
| **Shubham Kumar** | Full-Stack & DBMS Integration | Database design, SQL queries, repository integration, and connecting frontend, backend, OS module, and DBMS |
| **Jahnvi** | Frontend Developer | User interface development and frontend integration |
| **Avni Negi** | Operating Systems Developer | OS module, CPU scheduling, process management, locking, and deadlock handling |

### Collaboration

Our team worked together to build ConflictCore, bringing together file operations, process scheduling, resource locking, deadlock handling, and database-backed file management into a unified application.

## 📚 Additional Documentation

- [DBMS Integration](docs/DBMS_INTEGRATION.md)
- [DBMS Walkthrough](docs/DBMS_WALKTHROUGH.md)
- [Frontend Documentation](docs/FRONTEND.md)
- [OS Module Documentation](docs/OS_MODULE.md)
- [Database README](db/README.md)

## 🔒 Security Notes

- Never commit real `.env` files or credentials.
- Use `.env.example` for placeholder configuration.
- Keep database credentials out of source code.
- Do not commit generated uploads, local logs, or unnecessary dependency folders.
- Use a dedicated test database for testing and verification.

## 📄 License

Check the repository's `LICENSE` file for the applicable license and usage terms.

---

**ConflictCore — Bringing File Management, Operating Systems, and DBMS Together.**
