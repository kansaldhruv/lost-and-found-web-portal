# Lost & Found Campus Portal

A full-stack college Lost & Found web portal for reporting found items, browsing available items, submitting claims, and managing returns.

## Features

- Browse and search reported lost and found items
- Post found items as a student or faculty custodian
- Submit and track item claims
- Faculty claim review and approval workflow
- Return and archive items
- Image uploads for found items
- Role-based authentication with student and faculty accounts
- Light and dark themes
- Responsive campus-focused interface

## Technology

- **Frontend:** HTML, CSS, and vanilla JavaScript
- **Backend:** Node.js and Express
- **Authentication:** JWT
- **Password security:** bcryptjs
- **Storage:** JSON files in `server/data/`
- **Uploads:** Multer

## Demo Login Accounts

These accounts are included for local demonstration and college project evaluation.

### Student login

| Field | Value |
|---|---|
| Email | `student@test.edu` |
| Password | `student123` |
| Role | Student Contributor |

Students can browse items, submit claims, and post found items. Faculty-only claim review, editing, deletion, and return/archive actions remain restricted.

### Faculty login

| Field | Value |
|---|---|
| Email | `admin@college.edu` |
| Password | `admin@123` |
| Role | Faculty Custodian |

Faculty users can review claims, manage found items, and record returned items.

> **Security note:** The credentials above are demo credentials committed for this educational project. Replace them and use environment-based secrets before deploying the application publicly.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/kansaldhruv/lost-and-found-web-portal.git
cd lost-and-found-web-portal
npm install
```

Create a local `.env` file from the example:

```bash
copy .env.example .env
```

On macOS or Linux, use:

```bash
cp .env.example .env
```

Set a long random value for `JWT_SECRET` in `.env` before using the portal outside local development.

### Run the application

Start the server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

For development with automatic server restarts:

```bash
npm run dev
```

## Project Structure

```text
.
├── index.html              # Frontend markup
├── styles.css              # Portal styling and themes
├── app.js                  # Frontend behavior and API calls
├── server/
│   ├── index.js            # Express server entry point
│   ├── data/               # JSON data and account records
│   ├── lib/                # Persistence helpers
│   ├── middleware/         # Authentication middleware
│   └── routes/             # Auth, items, claims, history, and stats APIs
├── abesit-logo.png         # Campus branding
└── college_bg.jpg         # Campus background image
```

## Main API Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate a student or faculty user |
| `GET` | `/api/items` | List public found items |
| `POST` | `/api/items` | Create a found-item post for authenticated users |
| `POST` | `/api/claims` | Submit a claim |
| `GET` | `/api/claims` | Track a claim |
| `GET` | `/api/history` | View returned-item history |
| `GET` | `/api/stats` | View portal statistics |
| `GET` | `/api/health` | Check server health |

## Repository

GitHub: [kansaldhruv/lost-and-found-web-portal](https://github.com/kansaldhruv/lost-and-found-web-portal)

