# SGA Ledger System

A secure, realtime, admin-only digital bahi-khata system with a cinematic 3D landing page and a traditional ledger dashboard.

![SGA Ledger System](SGA.png)

## Tech Stack

- **Frontend**: Next.js 14, React 18, React Three Fiber, GSAP, Plain CSS
- **Backend**: Express.js, JWT, bcrypt
- **Database**: Firebase Firestore (with in-memory dev store)
- **Export**: PDF (jsPDF), Excel (xlsx), CSV, Print

## Project Structure

```
src/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages (landing, login, dashboard, ledger, audit, export, settings)
│       ├── components/# React components (3D scene, forms, tables)
│       ├── lib/       # API client, auth context, utilities
│       └── styles/    # CSS modules (landing, login, dashboard, ledger, pages)
└── backend/           # Express.js API
    ├── routes/        # Auth, transactions, audit, settings
    ├── middleware/     # JWT auth middleware
    └── services/      # Firebase, memory store, audit service
```

## Quick Start

### 1. Start Backend
```bash
cd src/backend
cp .env.example .env    # Configure your settings
npm install
npm run dev             # Runs on port 5000
```

### 2. Start Frontend
```bash
cd src/frontend
npm install
npm run dev             # Runs on port 3000
```

### 3. Login
- **Username**: `admin`
- **Password**: `admin123`

## Features

- 🎬 Cinematic 3D landing page with particle effects
- 🔐 Admin-only JWT authentication
- 📒 Traditional register-style ledger (bahi-khata)
- ☁️ Cloud-synced with auto-save
- 📊 Dashboard with real-time stats
- 🔍 Full audit trail for all actions
- 📤 Export to PDF, Excel, CSV + Print
- ⚙️ Configurable settings
- 📱 Responsive design

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Admin login |
| POST | /api/auth/logout | Admin logout |
| GET | /api/auth/me | Get current admin |
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| GET | /api/audit-logs | List audit logs |
| GET | /api/settings | Get settings |
| PUT | /api/settings | Update settings |
| GET | /api/health | Health check |

## Ledger Entry Types

- **CIR** (Credit): Amount received → increases balance
- **DIR** (Debit): Amount paid out → decreases balance
- **SR** (Sales Return): Returned goods → increases balance

**Balance Formula**: `New Balance = Previous Balance + Credit + SR - Debit`