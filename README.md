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

**ConflictCore** brings together a web-based file management interface, a backend service layer, an operating system simulation module, and a relational database layer.

The system is designed to demonstrate:

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
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL, SQL |
| OS module | JavaScript-based process and scheduling simulations |
| API communication | HTTP / REST |
| Testing | Node.js test scripts and Python verification scripts |
| Development tools | Visual Studio Code, Git, GitHub |

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

```bash
npm run
```

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

```bash
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
| **Anshika Lakhera** | Team Lead | Project coordination, backend development, and overall system integration |
| **Shubham Kumar** | Full-Stack & DBMS Integration | Database design, SQL queries, repository integration, and connecting frontend, backend, OS module, and DBMS |
| **Jahnvi sharma** | Frontend Developer | User interface development and frontend integration |
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
