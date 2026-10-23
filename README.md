# ConflictCore — Conflict-Resolution-Based File Management System

A full-stack file management system that brings together file operations, operating system concepts, resource locking, CPU scheduling, deadlock handling, and relational database management.

ConflictCore demonstrates how operating system principles and database management techniques can be applied to practical file management and concurrent resource access.

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [Operating System Module](#️-operating-system-module)
- [Database Module](#️-database-module)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Development Workflow](#-development-workflow)
- [Future Enhancements](#-future-enhancements)
- [Team Members](#-team-members)
- [Additional Documentation](#-additional-documentation)
- [Security Notes](#-security-notes)
- [License](#-license)

## 🚀 Overview

Traditional file management systems focus primarily on storing, organizing, uploading, downloading, and modifying files. When multiple operations compete for shared resources, issues such as resource conflicts, synchronization problems, and deadlocks can arise.

**ConflictCore** brings together a web-based file management interface, a backend service layer, an operating system simulation module, and a relational database layer.

The system is designed to demonstrate:

- File and folder management through a web interface.
- Backend processing of file operations.
- CPU scheduling and process management.
- Resource locking and conflict handling.
- Deadlock detection and handling concepts.
- Persistent application data using a relational database.

> **Note:** Features exposed in the interface depend on the corresponding backend and OS integrations. Verify each feature against the current implementation before describing it as fully integrated or production-ready.

## ✨ Key Features

### 📁 File and Folder Management

- Upload and download files.
- Create and manage folders where supported.
- Rename and delete files or folders where supported.
- Organize file-related operations through a centralized interface.

### ⚙️ Operating System Concepts

- Process creation and process-state management.
- CPU scheduling algorithm simulations.
- Resource locking and synchronization.
- Deadlock detection and handling.
- Process and scheduling metrics.

### 🔐 Resource and Conflict Management

- Model access to shared resources.
- Use locking mechanisms to coordinate competing operations.
- Demonstrate resource contention and deadlock scenarios.
- Integrate OS-related functionality with backend operations.

### 🗄️ Database Management

- Store application data in a relational database.
- Organize database access through query and repository modules.
- Include SQL schema, migration, and seed scripts.
- Provide database verification and CRUD-related queries.

### 🖥️ Web Application

- Web-based frontend interface.
- Backend REST API.
- Modular separation of frontend, backend, OS, and database components.

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
                    │   Node.js / Hono     │
                    └────────┬──────┬──────┘
                             │      │
                  ┌──────────▼─┐  ┌─▼────────────┐
                  │ OS Module  │  │ Database     │
                  │ Scheduling │  │ MySQL / SQL  │
                  │ Locks      │  │ Repositories │
                  │ Deadlocks  │  │ Transactions │
                  └────────────┘  └──────────────┘
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
| Frontend | HTML5, CSS3, JavaScript |
| Backend API | Node.js (ES modules), Hono, `@hono/node-server` |
| Database | MySQL, `mysql2` |
| OS module | JavaScript-based process scheduling, locking, and deadlock detection |
| Storage layer | File storage and upload handling |
| Automated testing | Node.js native test runner and available integration tests |
| Development tools | Git, GitHub, Visual Studio Code |

Refer to the individual `package.json` files and project configuration for exact dependencies and versions.

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
│   └── README.md
├── tests/
│   └── integration/
├── .env.example
├── .gitignore
├── README.md
└── server.js
```

*The tree represents the integration workspace. Some files or directories may differ between branches.*

## 💻 Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) and npm.
- [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).
- [Git](https://git-scm.com/).
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor.

Verify the installations:

```bash
node --version
npm --version
git --version
```

Ensure the MySQL server is running before configuring the database.

### 1. Clone the Repository

```bash
git clone https://github.com/anshikaalakhera/Conflict-Resolution-Based-File-Management-System.git
cd Conflict-Resolution-Based-File-Management-System
```

To use a specific integration branch, first fetch the remote branches and then switch to the intended branch:

```bash
git fetch origin
git switch feature/conflictcore-pr
```

Only use the branch command if that branch exists in the repository.

### 2. Install Dependencies

Install the dependencies for the backend you intend to run. For the root-level Hono server:

```bash
npm install
```

If you are working with the separate backend implementation, install its dependencies from that directory:

```bash
cd backend
npm install
```

Install OS module dependencies separately if required by its `package.json`:

```bash
cd os
npm install
```

Return to the repository root when running root-level commands:

```bash
cd ..
cd ..
```

> **Important:** This repository contains root-level and nested backend files. Check the relevant `package.json` and server entry point before starting the application. Do not assume both backend implementations use the same routes, configuration, or port.

### 3. Configure Environment Variables

Create a local `.env` file using the provided example.

In PowerShell:

```powershell
Copy-Item .env.example .env
```

In Windows Command Prompt:

```cmd
copy .env.example .env
```

Open `.env` and replace the example values with your local configuration.

Use the variable names defined in `.env.example` and referenced by the backend. Do not commit `.env` or publish database credentials, tokens, or other secrets.

## 🗄️ Database Setup

ConflictCore includes a database directory for schema definitions, migrations, queries, seed data, and verification.

### Database Files

| File or directory | Purpose |
|---|---|
| `db/schema.sql` | Database schema definition |
| `db/migrations/` | Schema migration scripts |
| `db/queries/` | CRUD and relational query examples |
| `db/seeds/` | Sample data |
| `db/verify.py` | Database verification script |
| Backend database modules | Connection handling, queries, repositories, and transaction logic |

### Setup Steps

1. Start the local MySQL service.
2. Identify the database name expected by the backend configuration.
3. Configure the database credentials in `.env`.
4. Review the schema and migration scripts.
5. Apply the required schema scripts to the intended development database.
6. Run the verification script if its dependencies are installed.

Example MySQL commands for creating a separate development database:

```sql
CREATE DATABASE conflictcore_test_db;
SHOW DATABASES;
USE conflictcore_test_db;
```

**Important:** `conflictcore_test_db` is an example database name. Confirm that your backend configuration points to the intended database before applying any schema scripts. Do not drop, recreate, or reset a database containing data you need to preserve.

For additional details, see [`db/README.md`](db/README.md) and [`docs/DBMS_INTEGRATION.md`](docs/DBMS_INTEGRATION.md).

## ▶️ Running the Application

### Start the Root-Level Backend

From the repository root, where the root `server.js` and `package.json` are located:

```bash
node server.js
```

If a start script is defined in the root `package.json`, you can instead use the configured npm command.

The tested root-level Hono server listens on port **3000**.

- Backend health check: `http://localhost:3000/`
- Test endpoint: `http://localhost:3000/api/test`
- File API: `http://localhost:3000/api/files`
- OS endpoints: `http://localhost:3000/api/processes`, `/api/locks`, and `/api/deadlocks`

The root server initializes storage and attempts to restore queued processes at startup.

### Start the Frontend

Open `frontend/index.html` in a browser or use Visual Studio Code with the Live Server extension.

If using Live Server:

1. Open the `frontend` directory in VS Code.
2. Open `index.html`.
3. Right-click and select **Open with Live Server**.

Confirm that the frontend is configured to use the correct backend URL.

> **Integration note:** A frontend that runs successfully in the browser is not necessarily connected to the backend. Verify its network requests and API responses before claiming that its file operations are persisted in MySQL or executed by the OS module.

### Verify the Application

1. Confirm that the backend starts without configuration errors.
2. Open the frontend.
3. Test the file and folder operations implemented in the current version.
4. Inspect API responses in the browser's Network panel or with `curl`.
5. Confirm that database-backed changes persist.
6. Run the relevant OS and integration tests.

## ⚙️ Operating System Module

The OS module demonstrates operating system concepts used to reason about processes and shared resources.

Depending on the implementation and branch, its source and tests are located in the OS module directories, including `os/` or `backend/os/`.

### Main Concepts

- **Process management:** Representing processes and their state transitions.
- **CPU scheduling:** Simulating scheduling policies and analyzing execution order.
- **Resource locking:** Coordinating access to shared resources.
- **Deadlock handling:** Detecting deadlock-related conditions and demonstrating recovery logic.
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

Run tests that exist in the current branch and match the implementation you are using.

### OS Module Tests

From the repository root, if the root `os/` directory has a `test` script:

```bash
cd os
npm test
```

Alternatively, if the OS tests are located under `backend/os/tests/` and use Node's native test runner:

```bash
node --test backend/os/tests/*.test.js
```

Use the command corresponding to the actual directory structure in your checked-out branch.

### Inspect Available Backend Scripts

From the directory containing the relevant backend `package.json`:

```bash
npm run
```

This lists the available scripts. Use the test or development script defined by that package.

### Database Verification

From the repository root:

```bash
python db/verify.py
```

Run this only after checking the script's requirements and configuring the correct database connection.

### Integration Testing

Where integration tests are available, run them against a dedicated development or test database. Verify the complete workflow across the frontend, backend, OS module, and database.

A passing unit test does not necessarily prove that the entire application works end-to-end.

## 📡 API Documentation

The root-level Hono backend exposes the following routes that have been exercised during development.

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Backend health check |
| `/api/test` | GET | Test endpoint |
| `/api/files` | GET | List files |
| `/api/files/:id` | GET | Retrieve file metadata |
| `/api/files` | POST | Create a file record where supported |
| `/api/files/upload` | POST | Stage an uploaded file |
| `/api/files/:id/download` | GET | Download a file |
| `/api/files/:id` | PUT | Update file metadata where supported |
| `/api/files/:id` | DELETE | Delete a file where supported |
| `/api/operations` | GET | Retrieve operation history |
| `/api/operations` | POST | Create an operation |
| `/api/operations/:id/execute` | POST | Submit an operation for processing |
| `/api/processes` | GET | Inspect process state |
| `/api/processes/dispatch` | POST | Dispatch the next process |
| `/api/scheduler/algorithm` | PUT | Change the scheduling algorithm |
| `/api/locks` | GET | Inspect lock information |
| `/api/deadlocks` | GET | Inspect deadlock information |

The supported scheduling algorithms and request formats should be verified against the route handlers in the current branch. The tested scheduler accepts `FCFS` and `SJF`; invalid algorithm input returns a client error.

Additional routes may be available in the separate nested backend implementation. Consult its route files and documentation before using them.

## 🔄 Development Workflow

The project uses Git and GitHub for collaboration.

A typical feature workflow is:

1. Create a feature branch from the intended base branch.
2. Implement the change in the relevant module.
3. Run applicable tests.
4. Review the changes and ensure secrets and generated files are excluded.
5. Commit and push the branch.
6. Open a pull request describing the implementation, tests, and known limitations.

Example commands:

```bash
git status
git switch -c feature/your-feature
git diff
git add README.md
git commit -m "docs: resolve README merge conflicts"
```

Replace the example branch name with your intended branch name. Review `git status` and `git diff` before committing. Stage only the files you intend to include.

## 🔮 Future Enhancements

Potential improvements include:

- Stronger authentication and role-based access control.
- More comprehensive concurrent file-operation testing.
- Improved conflict reporting and recovery workflows.
- Additional scheduling algorithms and comparative metrics.
- Expanded automated integration and end-to-end testing.
- Better observability,