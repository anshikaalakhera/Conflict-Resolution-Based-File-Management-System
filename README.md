# ConflictCore — Conflict-Resolution-Based File Management System

A unified file management platform that combines **Operating Systems concepts, Database Management Systems, and a web-based interface** to manage files, coordinate operations, and demonstrate resource scheduling and conflict resolution.

## Overview

Traditional file management systems focus on storing and retrieving files, but concurrent operations can introduce conflicts, resource contention, and consistency challenges.

**ConflictCore** brings together a backend file-management service, an OS-inspired scheduling and resource-management module, a relational database layer, and a web interface. The project demonstrates how operating-system concepts and database principles can work together in a single application.

The system is designed as an academic project for exploring file operations, process scheduling, locking, deadlock handling, database transactions, and full-stack integration.

## Key Features

- **Authentication & User Management:** User registration and login powered by secure `bcryptjs` password hashing, token-based session management, and quick 1-click demo logins for Admin, Developer, and Collaborator roles.
- **Hierarchical Folder Explorer:** Visual folder cards grid, recursive breadcrumb navigation, cycle prevention on folder movements, and cascading child relocation upon deletion.
- **Full File Lifecycle:** Multipart file upload, staged disk storage, atomic metadata registration, file downloading, renaming, and moving to Root (`folder_id: null`).
- **File Versioning & Conflict Review:** Transactional revision history tracking every operation, real-time concurrent write contention detection, and interactive 3-way conflict resolution (`KEEP_CURRENT`, `ACCEPT_INCOMING`, `CREATE_BRANCH`).
- **CPU Process Scheduling:** Deterministic simulation and live kernel dispatching using First-Come-First-Served (FCFS), Shortest Job First (SJF), and Priority algorithms with live Gantt timeline and turnaround/waiting metrics.
- **Resource Locking & Concurrency Control:** Strict exclusive mutual exclusion locks, FIFO waiting queues, and atomic lock release hooks upon process completion or abortion.
- **Deadlock Cycle Detection & Recovery:** Live Wait-For graph analysis identifying directed cycles, deterministic victim selection (priority, arrival, PID), and automated clean rollback.
- **Transactional MySQL Persistence:** ACID-compliant MySQL 8.0 storage managing 7 relational tables (`USERS`, `FOLDERS`, `FILES`, `FILE_PERMISSIONS`, `OPERATIONS`, `PROCESSES`, `FILE_LOCKS`).
- **Unified Web Interface:** Responsive single-page application featuring a dedicated Project Landing Page, Overview Dashboard, File Explorer, Process Monitor, Scheduler, Lock Manager, Deadlock Centre, and Activity Log.

## System Architecture

```text
                 ┌──────────────────────────┐
                 │       Web Frontend       │
                 │       HTML / CSS / JS    │
                 └────────────┬─────────────┘
                              │ HTTP / API
                              ▼
                 ┌──────────────────────────┐
                 │      Backend Server      │
                 │       Node.js / Express  │
                 └────────────┬─────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
      ┌──────────────────┐       ┌──────────────────┐
      │ File & Operation │       │ OS Module        │
      │ Services / Routes│       │ Scheduling       │
      │                  │       │ Locks / Deadlocks│
      └────────┬─────────┘       └────────┬─────────┘
               │                          │
               └────────────┬─────────────┘
                            ▼
                 ┌──────────────────────────┐
                 │       MySQL Database     │
                 │ Schema / Queries /       │
                 │ Repositories / Transactions│
                 └──────────────────────────┘
```

The diagram illustrates the intended logical architecture. The precise runtime connections between components should be verified against the current implementation.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, ES6+ JavaScript, Responsive SPA |
| Backend API | Node.js (ESM), Hono web framework, `@hono/node-server` |
| Concurrency & Auth | `bcryptjs` password hashing, token-based sessions |
| Database | MySQL 8.0 with `mysql2/promise` connection pooling & transactions |
| OS Module | In-memory CPU scheduler, exclusive lock manager, wait-for cycle detector |
| Storage Layer | Multipart file streaming, staged disk persistence in `backend/storage/` |
| Automated Testing | Node.js native test runner (`node --test`), 34 OS tests + 11 integration tests |
| Development Tools | Git, PowerShell, Visual Studio Code |

## Project Structure

```text
ConflictCore/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── os/
│   │   ├── demo/
│   │   ├── src/
│   │   │   ├── deadlock/
│   │   │   ├── locks/
│   │   │   ├── process/
│   │   │   ├── scheduler/
│   │   │   └── util/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── package-lock.json
│   ├── routes/
│   ├── services/
│   ├── test/
│   ├── server.js
│   ├── package.json
│   └── .env.example
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
│       └── README.md
├── .env.example
├── .gitignore
├── README.md
├── package.json
└── package-lock.json
```

*The structure above reflects the integrated project layout; individual files may change as development continues.*

## Operating Systems Module

The OS module demonstrates operating-system concepts related to process execution, scheduling, synchronization, and resource conflicts.

Its code is organized into the following areas:

- **Process Management:** Process representations and process-state management.
- **CPU Scheduling:** Scheduling logic and algorithm implementations.
- **Resource Locks:** Lock management for coordinating access to shared resources.
- **Deadlock Handling:** Deadlock-related logic and wait-for graph utilities.
- **Simulation and Logging:** Utilities for simulating operations and recording events.
- **Automated Tests:** Tests for scheduling, locks, deadlocks, and process-state behavior.

Refer to [`docs/OS_MODULE.md`](docs/OS_MODULE.md) and the tests under `backend/os/tests/` for implementation details and supported scenarios.

## Database Management System

The database layer uses MySQL to store and manage relational data.

It includes:

- SQL schema definitions and database migrations.
- Seed data for development and testing.
- CRUD and relational query examples.
- Database repositories for application entities.
- Transaction utilities.
- A database-verification script.

Relevant resources:

- [`db/README.md`](db/README.md)
- [`db/INTEGRATION.md`](db/INTEGRATION.md), if present
- [`docs/DBMS_INTEGRATION.md`](docs/DBMS_INTEGRATION.md)
- [`docs/DBMS_WALKTHROUGH.md`](docs/DBMS_WALKTHROUGH.md)

**Database safety:** Review SQL scripts before running them. Do not execute schema resets or destructive scripts against a database containing important data.

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm.
- MySQL Server.
- Git.
- A terminal or Visual Studio Code.
- Python, if you plan to use the database-verification utility.

Check your installations:

```bash
node --version
npm --version
git --version
mysql --version
python --version
```

### 1. Clone the repository

```bash
git clone https://github.com/kumar-shubham1/Conflict-Resolution-Based-File-Management-System.git
cd Conflict-Resolution-Based-File-Management-System
```

### 2. Configure environment variables

Create your local environment file using the example:

**PowerShell**

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure the values required by your local setup.

Typical database configuration includes:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_username
DB_PASSWORD=your_secure_password
DB_NAME=conflictcore_db
```

Use the actual variable names expected by the backend's configuration files. The values above are illustrative; the database name and other settings must match your schema and application configuration.

**Security:** Never commit `.env`, real passwords, API keys, or other credentials. Keep `.env.example` limited to safe placeholders.

### 3. Install dependencies

Install the dependencies in each Node.js package that has its own `package.json`.

For the backend:

```bash
cd backend
npm install
```

For the OS module:

```bash
cd os
npm install
```

The second command assumes the OS module is located at `backend/os`. Run it from the `backend` directory, as shown above.

If the repository root also defines npm scripts or dependencies, inspect its `package.json` before installing or running them.

### 4. Configure the database

1. Start your local MySQL server.
2. Create the development database using a MySQL account with appropriate permissions.
3. Review the schema and migration scripts in `db/`.
4. Apply the required schema and migrations in the documented order.
5. Load seed data only when needed.
6. Verify the connection using the project's database-verification instructions.

Example database creation command:

```sql
CREATE DATABASE conflictcore_db;
```

Use the database name configured in `.env`. Do not assume that creating the database alone initializes the tables or migrations.

### 5. Start the unified application

Run the application entry point from the project root:

```bash
node server.js
```

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

```bash
git switch -c feature/your-feature
git add .
git diff --cached --check
git status
git commit -m "feat: describe your change"
git push -u origin feature/your-feature
```

Before using `git add .`, confirm that `.env`, dependency folders, uploaded files, database dumps, and generated artifacts are excluded.

## Security and Data Handling

- Keep credentials in local environment files, not source control.
- Use `.env.example` to document required configuration without exposing secrets.
- Do not commit uploaded user files or private datasets.
- Use a dedicated development database for tests.
- Review SQL migrations and scripts before execution.
- Validate file operations and user input on the backend.
- Apply appropriate permissions and access controls before using the application with real users or sensitive data.

## Current Scope and Limitations

ConflictCore is an academic and development project intended to demonstrate the integration of file management, operating-system concepts, and relational database design.

Before production use, the project would require a complete security review, stronger access controls where appropriate, robust error handling, input validation, database backup and recovery procedures, and comprehensive end-to-end testing.

The scheduling and deadlock modules should be understood according to their actual implementation: a simulation of an OS concept is not automatically equivalent to scheduling processes in the host operating system's kernel.

## Future Enhancements

Potential future improvements include:

- Authentication, user roles, and file permissions.
- More comprehensive conflict-resolution policies.
- Improved concurrent-operation handling.
- Expanded scheduling and deadlock visualizations.
- More detailed API documentation.
- Automated end-to-end testing in CI.
- Database performance monitoring and audit logs.
- Improved file-operation recovery and error reporting.

## Contributors

ConflictCore is a collaborative academic project involving frontend development, backend integration, operating-system concepts, and database design.

Add each contributor's name, GitHub profile, and contribution area here after confirming the final team list.

| Contributor | Contribution |
|---|---|
| Shubham Kumar | Integration and database/backend work |
| Other team members | Add verified names and responsibilities |

## License

Add the project's confirmed license here. If the repository already contains a `LICENSE` file, retain its terms and reference that license rather than declaring a different one.

---

**ConflictCore — Bringing file management, operating-system concepts, and database systems together.**
