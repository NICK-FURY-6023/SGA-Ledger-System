# SGA Ledger System

A secure, realtime, admin-only digital bahi-khata system with a cinematic 3D landing page and a traditional ledger dashboard.

![SGA Ledger System](SGA.png)

## Tech Stack

- **Framework**: Next.js 14 (App Router + API Routes) — single deployment
- **UI**: React 18, React Three Fiber, Plain CSS
- **Auth**: JWT + bcrypt (server-side API routes)
- **Database**: Firebase Firestore (with in-memory dev store)
- **Export**: PDF (jsPDF), Excel (xlsx), CSV, Print

## Project Structure

```
src/
└── frontend/              # Single Next.js app (deploys on Vercel free tier)
    └── src/
        ├── app/           # Pages + API Routes
        │   ├── api/       # Backend API (auth, transactions, audit, settings)
        │   ├── dashboard/ # Dashboard, ledger, audit, export, settings pages
        │   ├── login/     # Login page
        │   └── page.tsx   # 3D Landing page
        ├── components/    # React components (3D scene, etc.)
        ├── lib/           # Client: API client, auth context, utilities
        │   └── server/    # Server: store, JWT auth, audit service
        └── styles/        # CSS (landing, login, dashboard, ledger, pages)
```

## Quick Start

```bash
cd src/frontend
npm install
npm run dev       # Runs on http://localhost:3000
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

## Deploy on Vercel (Free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Set **Root Directory** to `src/frontend`
4. Add Environment Variable: `JWT_SECRET` = (any secret string)
5. Click Deploy ✅

That's it — single deploy, no separate backend needed!