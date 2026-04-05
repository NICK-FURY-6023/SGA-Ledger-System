<div align="center">

<img src="SGA.png" alt="SGALA Logo" width="180" />

# SGALA — Shree Ganpati Agency Ledger Audit System

**A secure, cloud-based digital bahi-khata (ledger) system for hardware & bath fittings shops**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/atlas)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red?logo=redis)](https://upstash.com/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

[Live Demo](https://sga-ledger-system.vercel.app) · [Status Page](https://sga-ledger-system.vercel.app/status) · [Health API](https://sga-ledger-system.vercel.app/api/health)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Data Flow](#data-flow)
- [API Reference](#api-reference)
- [Authentication & Roles](#authentication--roles)
- [Caching Strategy](#caching-strategy)
- [Ledger System Logic](#ledger-system-logic)
- [Pages & Features](#pages--features)
- [Environment Variables](#environment-variables)
- [Where to Get Secret Keys](#where-to-get-secret-keys)
- [Quick Start (Local)](#quick-start-local)
- [Deployment (Vercel)](#deployment-vercel)
- [CI/CD Pipeline](#cicd-pipeline)
- [Security](#security)
- [Monitoring & Health](#monitoring--health)
- [Stats](#stats)

---

## Overview

SGALA is a full-stack digital ledger system that replaces the traditional handwritten bahi-khata register used in Indian retail shops. It combines:

- A **cinematic 3D landing page** with Three.js particle effects and GSAP animations
- A **physical register-replica ledger** UI with cream paper, blue ruled lines, bilingual Hindi/English headers, and Indian number formatting (1,17,522=00)
- A **3-tier cloud database** architecture (Firestore + MongoDB Atlas + Upstash Redis)
- **Role-based access control** (Admin vs Developer/Super Admin)
- **Full audit trail** for every action
- **PDF, Excel, CSV export** and print support

The system is built as a single **Next.js 14** deployment — no separate backend server needed.

---

## Screenshots

| Landing Page | Ledger Register | Dashboard |
|:---:|:---:|:---:|
| 3D cinematic experience | Physical bahi-khata replica | Stats & overview |

<details>
<summary>Ledger Reference Image (Physical Register)</summary>

<img src="ledger.png" alt="Physical Bahi-Khata Register" width="700" />

The digital ledger replicates this exact layout — cream paper, blue ruled lines, red binding edge, bilingual headers, and `=` separator for paise.

</details>

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        VERCEL (Single Deploy)                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                     NEXT.JS 14 APP                           │    │
│  │                                                              │    │
│  │  ┌─────────────┐   ┌───────────────┐   ┌────────────────┐   │    │
│  │  │  FRONTEND   │   │   API ROUTES  │   │   MIDDLEWARE    │   │    │
│  │  │             │   │               │   │                │   │    │
│  │  │ React 18    │   │ /api/auth/*   │   │ JWT Verify     │   │    │
│  │  │ Three.js    │──▶│ /api/parties/*│──▶│ Role Guard     │   │    │
│  │  │ GSAP        │   │ /api/txns/*   │   │ Audit Logger   │   │    │
│  │  │ CSS Modules │   │ /api/health   │   │ CORS Headers   │   │    │
│  │  └─────────────┘   └───────┬───────┘   └────────────────┘   │    │
│  │                            │                                 │    │
│  └────────────────────────────┼─────────────────────────────────┘    │
│                               │                                      │
│  ┌────────────────────────────┼─────────────────────────────────┐    │
│  │                    CACHE LAYER (Read-Through)                │    │
│  │                            │                                 │    │
│  │              ┌─────────────▼──────────────┐                  │    │
│  │              │     UPSTASH REDIS          │                  │    │
│  │              │     (Serverless Cache)      │                  │    │
│  │              │                            │                  │    │
│  │              │  TTL: 30s - 10min          │                  │    │
│  │              │  Pattern: withCache()      │                  │    │
│  │              └─────────────┬──────────────┘                  │    │
│  │                            │ cache miss                      │    │
│  └────────────────────────────┼─────────────────────────────────┘    │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
          ▼                     ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ FIREBASE         │ │ MONGODB ATLAS    │ │ UPSTASH REDIS        │
│ FIRESTORE        │ │ (Free M0)       │ │ (Serverless)         │
│                  │ │                  │ │                      │
│ Business Data:   │ │ Monitoring:      │ │ Cache Keys:          │
│ - admins         │ │ - uptime_history │ │ - admin:{id}         │
│ - sessions       │ │ - service_status │ │ - parties:list       │
│ - parties        │ │ - server_info    │ │ - party:{id}         │
│ - ledger_pages   │ │                  │ │ - page:{id}:txns     │
│ - transactions   │ │ 90-day TTL       │ │ - stats              │
│ - audit_logs     │ │ auto-cleanup     │ │ - settings           │
│ - settings       │ │                  │ │                      │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
```

### Why 3 Databases?

| Database | Purpose | Why Separate |
|----------|---------|-------------|
| **Firestore** | Ledger data, parties, transactions, admins, audit logs | Realtime sync, document model fits ledger structure |
| **MongoDB Atlas** | Uptime monitoring, service status, deployment metadata | Time-series data with TTL indexes, aggregation pipelines |
| **Upstash Redis** | Read-through cache for hot data | Sub-millisecond reads, serverless (no connection pooling needed) |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | SSR, API Routes, single deployment |
| **UI** | React 18 | Component architecture |
| **3D Graphics** | Three.js + React Three Fiber + Drei | Cinematic landing page |
| **Animations** | GSAP | Smooth transitions, scroll effects |
| **Styling** | Plain CSS (6 files, 2255 lines) | Full control over register look |
| **Auth** | JWT + bcrypt | Stateless token auth, password hashing |
| **Database** | Firebase Firestore | Realtime document storage |
| **Monitoring DB** | MongoDB Atlas (Free M0) | Uptime/status time-series |
| **Cache** | Upstash Redis (Serverless) | Read-through caching layer |
| **Export** | jsPDF + jspdf-autotable + xlsx | PDF, Excel, CSV generation |
| **Icons** | 54 custom SVG components | No icon library bloat |
| **Notifications** | react-hot-toast | User feedback |
| **HTTP** | Axios | API client |
| **Deployment** | Vercel (Free) | Auto-deploy on push |

---

## Project Structure

```
SGA-Ledger-System/
│
├── public/                          # Static assets
│   ├── SGA.png                      # Main logo (1.08 MB)
│   ├── SGA-180.webp                 # Optimized logo 180px (6.7 KB)
│   ├── SGA-40.webp                  # Optimized logo 40px (700 B)
│   ├── favicon.png                  # Browser tab icon
│   └── og-image.png                 # Social media preview (181 KB)
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── page.tsx                 # 3D Cinematic Landing Page
│   │   ├── layout.tsx               # Root layout (fonts, meta, toaster)
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx             # Admin login form
│   │   │
│   │   ├── status/
│   │   │   └── page.tsx             # Public status/uptime page
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Sidebar, nav, role guard
│   │   │   ├── page.tsx             # Main dashboard (stats)
│   │   │   ├── parties/
│   │   │   │   ├── page.tsx         # Party list (CRUD)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Party detail + pages
│   │   │   │       └── pages/
│   │   │   │           └── [pageId]/
│   │   │   │               └── page.tsx  # LEDGER REGISTER VIEW
│   │   │   ├── ledger/
│   │   │   │   └── page.tsx         # Global transactions view
│   │   │   ├── export/
│   │   │   │   └── page.tsx         # PDF/Excel/CSV export
│   │   │   ├── profile/
│   │   │   │   └── page.tsx         # Change password
│   │   │   ├── audit/
│   │   │   │   └── page.tsx         # Audit logs (superadmin)
│   │   │   ├── monitor/
│   │   │   │   └── page.tsx         # Health monitor (superadmin)
│   │   │   └── settings/
│   │   │       └── page.tsx         # Shop settings (superadmin)
│   │   │
│   │   └── api/                     # Backend API Routes (17 files)
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── me/route.ts
│   │       │   └── change-password/route.ts
│   │       ├── parties/
│   │       │   ├── route.ts                          # GET/POST
│   │       │   └── [id]/
│   │       │       ├── route.ts                      # GET/PUT/DELETE
│   │       │       └── pages/
│   │       │           ├── route.ts                   # GET/POST
│   │       │           └── [pageId]/
│   │       │               ├── route.ts               # GET/PUT/DELETE
│   │       │               └── transactions/
│   │       │                   ├── route.ts           # GET/POST
│   │       │                   └── [txId]/route.ts    # PUT/DELETE
│   │       ├── transactions/
│   │       │   ├── route.ts                          # GET/POST
│   │       │   └── [id]/route.ts                     # GET/PUT/DELETE
│   │       ├── audit-logs/route.ts
│   │       ├── health/route.ts
│   │       ├── settings/route.ts
│   │       └── backup/
│   │           ├── route.ts                          # Full backup
│   │           └── party/[id]/route.ts               # Party backup
│   │
│   ├── components/
│   │   ├── icons/Icons.tsx          # 54 custom SVG icon components
│   │   ├── landing/ThreeScene.tsx   # 3D particle scene
│   │   ├── auth/                    # Auth-related components
│   │   ├── dashboard/               # Dashboard widgets
│   │   ├── ledger/                  # Ledger UI components
│   │   ├── export/                  # Export components
│   │   ├── audit/                   # Audit log components
│   │   └── ui/                      # Shared UI components
│   │
│   ├── lib/
│   │   ├── api.ts                   # Client-side API wrapper (Axios)
│   │   ├── auth.tsx                 # AuthProvider context + useAuth hook
│   │   ├── utils.ts                 # formatCurrency, formatRegisterAmount, dates
│   │   └── server/
│   │       ├── store.ts             # Data model interfaces + in-memory store
│   │       ├── db.ts                # ALL database operations (35KB)
│   │       ├── firebase.ts          # Firebase Admin SDK init
│   │       ├── mongodb.ts           # MongoDB Atlas connection + uptime ops
│   │       ├── upstash.ts           # Upstash Redis client
│   │       ├── cache.ts             # Cache-through layer (withCache, TTLs)
│   │       ├── auth.ts              # JWT generate/verify, request auth
│   │       └── audit.ts             # Audit log create/query
│   │
│   ├── hooks/                       # Custom React hooks
│   │
│   └── styles/
│       ├── globals.css              # CSS variables, typography (102 lines)
│       ├── landing.css              # 3D landing page styles (531 lines)
│       ├── login.css                # Login page styles (370 lines)
│       ├── dashboard.css            # Sidebar, grid layouts (244 lines)
│       ├── ledger.css               # Register-replica styles (808 lines)
│       └── pages.css                # Party/page styles (200 lines)
│
├── package.json                     # Dependencies & scripts
├── next.config.js                   # Security headers, CSP, image config
├── tsconfig.json                    # TypeScript config
└── LICENSE                          # ISC License
```

---

## Data Models

```mermaid
erDiagram
    ADMIN ||--o{ SESSION : "has"
    ADMIN ||--o{ AUDIT_LOG : "creates"
    ADMIN ||--o{ PARTY : "manages"
    PARTY ||--o{ LEDGER_PAGE : "has"
    LEDGER_PAGE ||--o{ TRANSACTION : "contains"

    ADMIN {
        string id PK
        string email UK
        string username
        string passwordHash
        string role "admin | superadmin"
        boolean isActive
        string lastLoginAt
    }

    SESSION {
        string id PK
        string adminId FK
        string loginTime
        string logoutTime
        string duration
        string ipAddress
        string deviceInfo
    }

    PARTY {
        string id PK
        string name
        string phone
        string address
        string gst "GSTIN number"
        string notes
        boolean isActive
        string createdBy FK
    }

    LEDGER_PAGE {
        string id PK
        string partyId FK
        number pageNumber
        string title
        string status "open | closed"
        number openingBalance
        number maxLines "default 25"
        string createdBy FK
    }

    TRANSACTION {
        string id PK
        string partyId FK
        string pageId FK
        string date
        string billNo "Bill/Challan No"
        string folio "Page reference"
        number debit
        number credit
        number sr "Sales Return"
        string type "CIR | DIR | SR"
        number balance "Running balance"
        number lineNumber "1-25 per page"
        string createdBy FK
        string updatedBy FK
    }

    AUDIT_LOG {
        string id PK
        string adminId FK
        string actionType
        string actionDetails
        string targetId
        string ipAddress
        string deviceInfo
        string sessionId
        string timestamp
    }

    SETTINGS {
        string shopName
        string currency
        string dateFormat
        string sortOrder
    }
```

### Transaction Types

| Type | Full Name | Effect on Balance | Example |
|------|-----------|-------------------|---------|
| **CIR** | Credit In Receipt | `balance += credit` | Customer pays Rs. 50,000 |
| **DIR** | Debit In Record | `balance -= debit` | Goods sold worth Rs. 25,000 |
| **SR** | Sales Return | `balance += sr` | Returned goods worth Rs. 5,000 |

**Balance Formula:** `New Balance = Previous Balance + Credit + SR - Debit`

---

## Data Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant N as Next.js API
    participant R as Upstash Redis
    participant F as Firestore
    participant M as MongoDB Atlas

    Note over U,M: READ FLOW (Cache-Through Pattern)
    U->>N: GET /api/parties
    N->>N: Verify JWT Token
    N->>R: cacheGet("parties:list")
    alt Cache HIT
        R-->>N: Return cached data
    else Cache MISS
        R-->>N: null
        N->>F: Firestore query
        F-->>N: Party documents
        N->>R: cacheSet("parties:list", data, 60s)
    end
    N-->>U: JSON Response

    Note over U,M: WRITE FLOW (Cache Invalidation)
    U->>N: POST /api/parties (new party)
    N->>N: Verify JWT + Validate
    N->>F: Create document
    F-->>N: Success
    N->>R: cacheDel("parties:list")
    N->>F: Create audit log
    N-->>U: 201 Created

    Note over U,M: HEALTH CHECK FLOW
    U->>N: GET /api/health
    N->>F: Ping Firestore
    N->>M: Ping MongoDB
    N->>R: Ping Redis
    N->>M: Save uptime record
    N-->>U: Health status + metrics
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | No | Login with email & password, returns JWT |
| `POST` | `/api/auth/logout` | Yes | Invalidate session |
| `GET` | `/api/auth/me` | Yes | Get current admin info |
| `PUT` | `/api/auth/change-password` | Yes | Change password |

### Parties (Customers / Khata)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/parties` | Yes | List all parties |
| `POST` | `/api/parties` | Yes | Create new party (khata) |
| `GET` | `/api/parties/:id` | Yes | Get party with pages |
| `PUT` | `/api/parties/:id` | Yes | Update party details |
| `DELETE` | `/api/parties/:id` | Yes | Delete party |

### Ledger Pages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/parties/:id/pages` | Yes | List pages for party |
| `POST` | `/api/parties/:id/pages` | Yes | Create new page |
| `GET` | `/api/parties/:id/pages/:pageId` | Yes | Get page details |
| `PUT` | `/api/parties/:id/pages/:pageId` | Yes | Update page (close/reopen) |
| `DELETE` | `/api/parties/:id/pages/:pageId` | Yes | Delete page |

### Transactions (Ledger Entries)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/parties/:id/pages/:pageId/transactions` | Yes | Get page transactions |
| `POST` | `/api/parties/:id/pages/:pageId/transactions` | Yes | Add new entry |
| `PUT` | `/api/parties/:id/pages/:pageId/transactions/:txId` | Yes | Edit entry + recalculate |
| `DELETE` | `/api/parties/:id/pages/:pageId/transactions/:txId` | Yes | Delete entry + recalculate |
| `GET` | `/api/transactions` | Yes | Global transaction list |
| `POST` | `/api/transactions` | Yes | Create global transaction |
| `PUT` | `/api/transactions/:id` | Yes | Update transaction |
| `DELETE` | `/api/transactions/:id` | Yes | Delete transaction |

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | No | System health check |
| `GET` | `/api/health?detailed=true` | No | Detailed health + memory stats |
| `GET` | `/api/audit-logs` | Yes (superadmin) | Query audit trail |
| `GET/PUT` | `/api/settings` | Yes (superadmin) | Shop configuration |
| `GET` | `/api/backup` | Yes | Full system backup (CSV) |
| `GET` | `/api/backup/party/:id` | Yes | Single party backup |

---

## Authentication & Roles

```mermaid
flowchart TD
    A[User visits site] --> B{Has JWT Token?}
    B -->|No| C[Redirect to /login]
    B -->|Yes| D[Verify JWT via /api/auth/me]
    D -->|Invalid| C
    D -->|Valid| E{Check Role}

    E -->|admin| F[Admin Dashboard]
    F --> F1[Dashboard - Basic stats]
    F --> F2[Parties - Full CRUD]
    F --> F3[Ledger - Add/Edit/Delete entries]
    F --> F4[Export - PDF/Excel/CSV]
    F --> F5[Profile - Change password]

    E -->|superadmin| G[Developer Dashboard]
    G --> F1
    G --> F2
    G --> F3
    G --> F4
    G --> F5
    G --> G1[Audit Logs - Activity monitoring]
    G --> G2[Health Monitor - DB/cache status]
    G --> G3[Settings - Shop configuration]

    style F fill:#1a5276,color:#fff
    style G fill:#7d3c98,color:#fff
    style G1 fill:#7d3c98,color:#fff
    style G2 fill:#7d3c98,color:#fff
    style G3 fill:#7d3c98,color:#fff
```

### Default Accounts

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| **Admin** | `sgalas@admin.com` | `SGALAS.@ADMIN123` | Parties, Ledger, Export, Profile |
| **Super Admin** | `sgalas@devloper.com` | `SGALA@DEVLOPER_Xd` | Everything + Audit, Monitor, Settings |

### How Auth Works

1. User submits email + password to `POST /api/auth/login`
2. Server verifies password with **bcrypt** compare
3. Server generates **JWT** token (configurable expiry, default 24h)
4. Token stored in browser `localStorage` (`sga_token`)
5. Every API request sends `Authorization: Bearer <token>` header
6. Server-side middleware verifies JWT on each request
7. Role checked for restricted routes (audit, settings, monitor)
8. All actions logged to **audit trail** with IP, device info, timestamp

---

## Caching Strategy

```mermaid
flowchart LR
    subgraph "Cache-Through Pattern"
        A[API Request] --> B{Redis Cache?}
        B -->|HIT| C[Return Cached]
        B -->|MISS| D[Query Firestore]
        D --> E[Store in Redis + TTL]
        E --> C
    end

    subgraph "Cache Invalidation"
        F[Write Operation] --> G[Update Firestore]
        G --> H[Delete Cache Keys]
        H --> I[Next read fetches fresh]
    end
```

### Cache TTLs

| Cache Key Pattern | TTL | Use Case |
|------------------|-----|----------|
| `admin:{id}` | 5 min | Admin profile lookups |
| `admin:email:{email}` | 5 min | Login email verification |
| `settings` | 10 min | Shop settings (rarely changes) |
| `stats` | 2 min | Dashboard statistics |
| `party:{id}` | 2 min | Individual party details |
| `parties:list` | 1 min | Party list page |
| `party:{id}:pages` | 1 min | Party's ledger pages |
| `page:{id}` | 2 min | Single page details |
| `page:{id}:txns` | 30 sec | Page transactions (frequent updates) |
| `txns:list` | 30 sec | Global transaction list |

---

## Ledger System Logic

### How the Bahi-Khata (Register) Works

```mermaid
flowchart TD
    A[Create Customer / Party] --> B[Khata Opens Automatically]
    B --> C[Page 1 Created - 25 lines]
    C --> D[Add Entry Line-by-Line]
    D --> E{Page Full? - 25 lines}
    E -->|No| D
    E -->|Yes| F[Create New Page]
    F --> G[Page 2 Created - 25 lines]
    G --> D

    D --> H[Balance Auto-Calculated]
    H --> I{Edit Entry?}
    I -->|Yes| J[Recalculate ALL subsequent balances]
    I -->|No| K[Done]
    J --> K
```

### Balance Calculation Engine

```
balance = 0

for each entry in chronological order:
    if type == CIR  →  balance += credit
    if type == DIR  →  balance -= debit
    if type == SR   →  balance += sr

    entry.balance = balance
```

### Key Rules

- Only **one** amount field per entry (debit OR credit OR sr)
- Bill/Challan number is **mandatory**
- **No opening balance** — first entry defines starting point
- **No B/F or C/F rows** — continuous running balance only
- Fixed **25 lines per page** (matches physical register)
- Editing any entry **recalculates all subsequent balances** across pages
- Deleting an entry **re-numbers** remaining lines and recalculates

### Register UI Matching Physical Image

The digital register exactly replicates a physical Indian bahi-khata:

- **Cream paper** background (#F8F4E8) with subtle texture
- **Red/pink left binding** edge (like register spine)
- **Blue ruled lines** (#A8B8D0) for column borders
- **Bilingual headers** — English + Hindi (Date/तिथि, Particulars/विवरण)
- **Indian number format** with `=` separator (1,17,522=00)
- **Date format** DD.MM.YY (25.03.26)
- **25 fixed rows** with empty ruled lines for unfilled slots
- **Page number** in bordered box (e.g., 001, 002)

---

## Pages & Features

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| **Landing** | `/` | Public | Cinematic 3D scene with Three.js particles, GSAP animations |
| **Login** | `/login` | Public | Email + password authentication |
| **Status** | `/status` | Public | Live uptime dashboard, service health |
| **Dashboard** | `/dashboard` | Admin+ | Today's entries, total balance, quick stats |
| **Parties** | `/dashboard/parties` | Admin+ | Customer/khata list with search, CRUD, GST |
| **Party Detail** | `/dashboard/parties/:id` | Admin+ | Customer info, ledger pages, create new page |
| **Ledger View** | `/dashboard/parties/:id/pages/:pageId` | Admin+ | Physical register-replica with entries |
| **Global Ledger** | `/dashboard/ledger` | Admin+ | All transactions across parties |
| **Export** | `/dashboard/export` | Admin+ | Generate PDF, Excel, CSV files |
| **Profile** | `/dashboard/profile` | Admin+ | Change password |
| **Audit Logs** | `/dashboard/audit` | Superadmin | Full activity log with filters |
| **Health Monitor** | `/dashboard/monitor` | Superadmin | DB status, latency, uptime charts |
| **Settings** | `/dashboard/settings` | Superadmin | Shop name, currency, display config |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes (production) | `sga-ledger-dev-secret-key-2024` | Secret key for signing JWT tokens |
| `JWT_EXPIRY` | No | `24h` | Token expiration time |
| `FIREBASE_PROJECT_ID` | For Firestore | — | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | For Firestore | — | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | For Firestore | — | Firebase service account private key |
| `MONGODB_URI` | For Monitoring | — | MongoDB Atlas connection string |
| `MONGODB_DB` | No | `sgala_status` | MongoDB database name |
| `UPSTASH_REDIS_REST_URL` | For Caching | — | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | For Caching | — | Upstash Redis auth token |
| `NEXT_PUBLIC_URL` | No | `https://sga-ledger-system.vercel.app` | Public site URL |

> **Note:** Without Firebase credentials, the system runs with an **in-memory store** (data resets on restart). Without MongoDB/Redis, monitoring and caching are disabled but the app still works.

---

## Where to Get Secret Keys

### 1. JWT_SECRET
Generate any random secure string:
```bash
openssl rand -base64 32
# Example output: K7x2mN9pQr4sT1vW3yB6cD8fH0jL5nP
```

### 2. Firebase (Firestore)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract from the JSON:
   - `FIREBASE_PROJECT_ID` → `"project_id"` field
   - `FIREBASE_CLIENT_EMAIL` → `"client_email"` field
   - `FIREBASE_PRIVATE_KEY` → `"private_key"` field (include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### 3. MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster
3. Go to **Database Access** > Add a database user
4. Go to **Network Access** > Allow `0.0.0.0/0` (for Vercel)
5. Go to **Database** > **Connect** > **Drivers**
6. Copy the connection string:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=MyApp
   ```

### 4. Upstash Redis
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Go to **REST API** section
4. Copy:
   - `UPSTASH_REDIS_REST_URL` → REST URL
   - `UPSTASH_REDIS_REST_TOKEN` → REST Token

---

## Quick Start (Local)

```bash
# 1. Clone the repository
git clone https://github.com/NICK-FURY-6023/SGA-Ledger-System.git
cd SGA-Ledger-System

# 2. Install dependencies
npm install

# 3. (Optional) Create .env.local for cloud services
cat > .env.local << EOF
JWT_SECRET=your-secret-key-here
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
EOF

# 4. Start development server
npm run dev
# App runs on http://localhost:3000

# 5. Login with default credentials
# Admin: sgalas@admin.com / SGALAS.@ADMIN123
# Developer: sgalas@devloper.com / SGALA@DEVLOPER_Xd
```

> Without `.env.local`, the app runs with in-memory storage — perfect for testing!

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (TypeScript check + Next.js build) |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint checks |

---

## Deployment (Vercel)

```mermaid
flowchart LR
    A[Push to main] --> B[Vercel Detects]
    B --> C[Install Dependencies]
    C --> D[npm run build]
    D --> E{Build OK?}
    E -->|Yes| F[Deploy to Production]
    E -->|No| G[Build Failed - Check Logs]
    F --> H[Live at sga-ledger-system.vercel.app]

    style F fill:#00C853,color:#fff
    style G fill:#FF3D00,color:#fff
```

### Step-by-Step

1. **Fork or push** this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** > Import your repo
4. **Add Environment Variables** (Settings > Environment Variables):

   | Key | Value |
   |-----|-------|
   | `JWT_SECRET` | Your generated secret |
   | `FIREBASE_PROJECT_ID` | From Firebase Console |
   | `FIREBASE_CLIENT_EMAIL` | From Firebase Console |
   | `FIREBASE_PRIVATE_KEY` | From Firebase Console (with newlines) |
   | `MONGODB_URI` | From MongoDB Atlas |
   | `UPSTASH_REDIS_REST_URL` | From Upstash Console |
   | `UPSTASH_REDIS_REST_TOKEN` | From Upstash Console |

5. Click **Deploy**
6. Vercel auto-deploys on every push to `main` branch

> **Important:** For `FIREBASE_PRIVATE_KEY` on Vercel, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel handles the newline characters automatically.

---

## CI/CD Pipeline

The project uses **Vercel's built-in CI/CD** — no separate GitHub Actions needed.

```mermaid
flowchart TD
    A[Developer pushes code] --> B[GitHub receives push]
    B --> C[Vercel webhook triggered]
    C --> D[Vercel pulls latest code]
    D --> E[npm install]
    E --> F[npm run build]
    F --> G{TypeScript Check}
    G -->|Pass| H{Next.js Build}
    G -->|Fail| I[Build Error - No Deploy]
    H -->|Pass| J[Generate Static Pages]
    H -->|Fail| I
    J --> K[Optimize Assets]
    K --> L[Deploy to Edge Network]
    L --> M[Live in seconds]

    subgraph "Build Steps"
        F
        G
        H
        J
        K
    end

    subgraph "Quality Gates"
        G
        H
    end

    style M fill:#00C853,color:#fff
    style I fill:#FF3D00,color:#fff
```

### What Happens on Every Push

1. **TypeScript compilation** — catches type errors before deploy
2. **Next.js build** — validates all pages, API routes, and imports
3. **Static generation** — pre-renders static pages (landing, login, dashboard shells)
4. **Dynamic routes** — marked for server-side rendering (API routes, party pages)
5. **Asset optimization** — CSS minification, JS chunking, image optimization
6. **Edge deployment** — distributed globally on Vercel's CDN

### Build Output

```
Route (app)                                          Size     First Load JS
┌ ○ /                                                5.04 kB     95.7 kB
├ ○ /login                                           31.1 kB     125 kB
├ ○ /status                                          13 kB       104 kB
├ ○ /dashboard                                       4.14 kB     104 kB
├ ○ /dashboard/parties                               5.62 kB     102 kB
├ ƒ /dashboard/parties/[id]/pages/[pageId]           6.43 kB     112 kB
├ ƒ /api/parties/[id]/pages/[pageId]/transactions    0 B         0 B
└ ... (24 total routes)

○ Static    ƒ Dynamic
Shared JS: 87.9 kB
```

---

## Security

### Headers (next.config.js)

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer info |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetch |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com
            wss://*.firebaseio.com https://*.upstash.io https://ipapi.co;
frame-ancestors 'none';
```

### Authentication Security

- Passwords hashed with **bcrypt** (cost factor 10)
- JWT tokens with configurable expiry
- Token verified on every API request
- Session tracking with IP + device info
- Role-based route protection (middleware level)
- All actions logged to immutable audit trail

---

## Monitoring & Health

### Health Endpoint

`GET /api/health` returns comprehensive system status:

```json
{
  "status": "ok",
  "timestamp": "2026-04-05T06:00:00.000Z",
  "uptime": 86400,
  "services": {
    "api": { "status": "operational" },
    "database": { "status": "connected", "latency": 45, "type": "firestore" },
    "mongodb": { "status": "connected", "latency": 120, "type": "mongodb-atlas" },
    "cache": { "status": "connected", "latency": 8, "type": "upstash-redis" },
    "auth": { "status": "operational" },
    "audit": { "status": "operational" }
  },
  "uptimePercent": 99.95,
  "monitoring": {
    "totalChecks": 4320,
    "upChecks": 4318,
    "downChecks": 2,
    "avgLatency": 58
  }
}
```

### Public Status Page

Available at `/status` — shows real-time service health, uptime history (90 days), and latency metrics. No authentication required.

### Monitoring Architecture

```mermaid
flowchart LR
    A[/api/health called] --> B[Ping Firestore]
    A --> C[Ping MongoDB]
    A --> D[Ping Redis]
    B --> E[Collect Results]
    C --> E
    D --> E
    E --> F[Save to MongoDB uptime_history]
    F --> G[Return JSON Response]
    G --> H[Status Page Renders]

    subgraph "MongoDB Uptime Storage"
        F --> I[90-day TTL auto-cleanup]
        F --> J[Aggregated stats]
        F --> K[Per-service timelines]
    end
```

---

## Stats

| Metric | Value |
|--------|-------|
| Source Files | 51 TypeScript/CSS files |
| API Routes | 17 route files (~25+ endpoints) |
| Icon Components | 54 custom SVGs |
| CSS Lines | 2,255 total across 6 files |
| Data Models | 7 (Admin, Session, Party, LedgerPage, Transaction, AuditLog, Settings) |
| Database Tiers | 3 (Firestore + MongoDB + Redis) |
| Auth Roles | 2 (admin, superadmin) |
| Environment Variables | 10 |
| Dashboard Pages | 10 |
| Shared JS Bundle | 87.9 KB |

---

<div align="center">

**Built for Shree Ganpati Agency**

Developed with Next.js 14, Firebase, MongoDB Atlas, and Upstash Redis

[Live Demo](https://sga-ledger-system.vercel.app) · [Report Bug](https://github.com/NICK-FURY-6023/SGA-Ledger-System/issues) · [Request Feature](https://github.com/NICK-FURY-6023/SGA-Ledger-System/issues)

</div>