# CA Office CRM

A complete web-based CRM and workflow management system for Chartered Accountant (CA) offices, built with **Next.js (App Router) + Tailwind CSS + MongoDB (Mongoose) + Firebase Authentication + Cloudinary**.

## Features

- **Authentication** — Firebase email/password (with Google option) or built-in **demo mode**
- **Dashboard** — summary cards, compliance/task overviews, revenue chart, upcoming deadlines, recent activity
- **Clients** — search, filter, add/edit/delete, full detail page (compliance, tasks, documents, invoices, activity)
- **Compliance Tracker** — status tabs (Pending / In Progress / Overdue / Completed), due-date logic
- **Tasks** — create/assign, priority filters, start/complete workflow, overdue detection
- **Documents** — secure upload to Cloudinary (or local storage in demo), search, download
- **Invoices & Payments** — GST calculations, server-side invoice numbering, partial payments, outstanding tracking
- **Notifications** — bell with unread count, mark-as-read
- **Activity / Audit log** — every important operation is recorded
- **Roles** — Admin (full access) and Staff (assigned records only)

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Frontend   | Next.js, React, Tailwind CSS, React Hook Form, Zod, Lucide, Recharts |
| Backend    | Next.js Route Handlers, Mongoose |
| Database   | MongoDB (local development) |
| Auth       | Firebase Authentication + Firebase Admin SDK (server-side token verification) |
| Storage    | Cloudinary (PDF, DOCX, XLSX, images) |
| Deployment | Vercel + MongoDB + Cloudinary + Firebase |

## Quick Start

The app uses a local MongoDB database (default `mongodb://127.0.0.1:27017/crm`) and seeds it with realistic CA-office data on first run.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with:

| Role  | Email                | Password |
|-------|----------------------|----------|
| Admin | admin@caoffice.com   | demo123  |
| Staff | priya@caoffice.com   | demo123  |

Or click **Demo Admin / Demo Staff** on the login screen.

## Production Setup

### 1. MongoDB

1. Install MongoDB locally (or use Atlas) and make sure it's running on `127.0.0.1:27017`.
2. Set the connection string into `MONGODB_URI` in `.env.local`. The database is seeded automatically when empty.

### 2. Firebase Authentication

1. Create a Firebase project and enable **Email/Password** (and optionally **Google**).
2. Create a **Web App** and copy the client config into the `NEXT_PUBLIC_FIREBASE_*` variables.
3. Generate a **service account** in Project Settings → Service accounts, and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
4. Create admin/staff users in the MongoDB `users` collection (the API creates users on first demo login) — or set up Firebase users and matching `firebaseUid` records.

### 3. Cloudinary

1. Create a Cloudinary account.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Documents are uploaded to `ca-office-crm/client-documents/{clientId}/`.

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local`.

### 5. Run

```bash
npm run dev      # development
npm run build    # production build
npm start        # production server
```

## Project Structure

```
app/
├── login/ forgot-password/       # public auth pages
├── (app)/                        # protected layout + pages
│   ├── dashboard/ clients/ compliance/ tasks/ documents/ invoices/ notifications/
├── api/                          # route handlers (clients, compliance, tasks, documents, invoices, payments, dashboard, notifications, activities, users, auth)
├── layout.js  page.js  globals.css
components/
├── layout/                       # Sidebar, AppShell, NotificationBell, UserMenu
├── common/                       # Button, Modal, Badge, Input/Select/Textarea, Loading, EmptyState, Pagination, ConfirmDialog
├── clients/ compliance/ tasks/ documents/ invoices/
lib/                              # mongodb, auth, firebase, firebaseAdmin, cloudinary, storage, seed, validation, utils, dashboard, invoice, counter, status, notifications, activity, client
models/                           # Mongoose models
context/ hooks/                   # AuthContext, useAuth, useDebounce
proxy.js                          # protected-route guard
```

## API Overview

All API routes are protected by Firebase token verification (Authorization: Bearer token) and role checks.

- `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/:id`
- `GET/POST /api/compliance`, `GET/PATCH/DELETE /api/compliance/:id`
- `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`
- `GET/POST /api/documents`, `GET/DELETE /api/documents/:id`, `GET /api/documents/:id/download`
- `GET/POST /api/invoices`, `GET/PATCH/DELETE /api/invoices/:id`, `GET/POST /api/invoices/:id/payments`
- `GET /api/dashboard/summary|revenue|activity|upcoming`
- `GET/PATCH /api/notifications`
- `GET /api/activities`

Standard response shape: `{ success, data, message, pagination? }`.

## Business Rules

- Compliance becomes **OVERDUE** automatically when `dueDate < now` and not completed.
- Task overdue status is derived at read time (Pending/In Progress past due = Overdue).
- Invoice numbers `INV-2026-001` are generated server-side with a counter collection.
- GST / subtotal / outstanding amounts are always calculated server-side.
- Payments are never overwritten — a payment history is kept and totals are recomputed from it.
- Clients, documents and invoices use **soft delete**.
- Staff can only see their assigned clients, compliance, tasks, documents and invoices.

## Security

- Firebase ID token verification on every API route (Firebase Admin SDK server-side).
- Role-based access control (admin vs staff) with per-record checks.
- Server-side validation with Zod.
- Cloudinary API secret never exposed to the browser.
- Demo-mode JWTs signed with a server-side secret.
- Audit logging for all important operations.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # start production server
npm run lint     # lint check
```
