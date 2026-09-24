# CA Office CRM — Complete Feature Documentation

> Every feature, function, endpoint, model field and UI interaction present in this codebase. Nothing omitted.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.0 (App Router, Route Handlers) |
| UI | React 19.2.8, Tailwind CSS v4 |
| Database | MongoDB via Mongoose 9.9.2 |
| Authentication | Firebase Auth (client SDK v12 + Identity Toolkit REST) + demo-mode JWT fallback (`jose`) |
| Forms/Validation | `react-hook-form` + `zod` v4 + `@hookform/resolvers` |
| Charts | `recharts` v3 (AreaChart) |
| File Storage | Cloudinary v2 (primary) + local `public/uploads` fallback |
| Excel/CSV | SheetJS (`xlsx`) |
| Email | `nodemailer` (SMTP) |
| Icons | `lucide-react`, inline WhatsApp SVG |
| Dates | `date-fns` |
| Analytics | Firebase Analytics (client-only) |
| Scripts | `dev`, `build`, `start`, `lint`, `create-admin` (`scripts/create-admin.mjs`) |

**Firm identity:** `FIRM_NAME = "ABC & Associates"` (`lib/config.js`) — used in WhatsApp messages and password-reset emails.

**Response convention:** `{ success: true, data, message, ...meta }` / `{ success: false, message }` via `lib/api.js` (`ok()`, `fail()`, `handleError()`, `withHandler()`). Error mapping: `AuthError` → status, Mongo dup-key `11000` → 409, Mongoose `ValidationError` → 422, `ZodError` → 422, else 500.

---

## 2. Authentication & Session

### 2.1 Login
- Email/password login via Firebase `signInWithEmailAndPassword` (`app/login/page.js`, `context/AuthContext.js`).
- On success, ID token → `POST /api/auth/sync` → user persisted in `localStorage` (`crm_user`) + cookie `crm_token` (max-age 7 days, `samesite=lax`).
- Show/hide password toggle; "Remember me" style role state; `?redirect=` deep-link support; demo-mode banner when `NEXT_PUBLIC_DEMO_MODE === "true"`.
- Post-login redirect resolved by `resolvePostLoginRedirect(user, requestedPath)` → falls back to role default route.
- Login feature grid rendered on the login page.

### 2.2 Logout
- `logout()` clears `localStorage`, deletes `crm_token` cookie, calls `POST /api/auth/logout`, resets auth state.

### 2.3 Server token verification (`lib/auth.js`)
- Reads `Authorization: Bearer` header first, falls back to `crm_token` cookie.
- `demo-` prefixed tokens → HS256 JWT verification (`DEMO_JWT_SECRET`, 7-day expiry) via `createDemoToken` / `verifyDemoToken`.
- Other tokens → Firebase ID-token verification against Google JWKS (project `crm-ca-db172`, issuer + audience validated) via `verifyFirebaseIdToken`.
- `getCurrentUser(request)` — loads Mongo user by `firebaseUid`, falls back to email lookup and **auto-links** the Firebase UID; inactive users → `null`/401.

### 2.4 Guards (`lib/auth.js`)
| Guard | Behavior |
|---|---|
| `requireAuth` | 401 if not logged in |
| `requireAdmin` | 401 if anonymous, 403 if role ≠ `admin` |
| `requireSuperAdmin` | 401/403 unless role = `superAdmin` |
| `requirePermission(request, moduleKey)` | auth + `hasPermission`; 403 if staff lacks module |
| `companyScope(user)` | `{ companyId }` for admin/staff; `null` for superAdmin (superAdmin can never touch tenant data) |

### 2.5 Auth endpoints
| Endpoint | Methods | Features |
|---|---|---|
| `/api/auth/sync` | POST | Links Firebase ID token to Mongo user (by `firebaseUid`, then email auto-link); auto-creates/upgrades admin when email = `ADMIN_EMAIL`; 403 if inactive; updates `lastLoginAt`; writes **LoginHistory**; if staff, sends once-per-day "Staff Login" notification to all active admins; 404 if account not in CRM |
| `/api/auth/demo` | POST | Gated by `NEXT_PUBLIC_DEMO_MODE === "true"`; creates/reuses local user, optional `passwordHash` check, records LoginHistory, returns `demo-` JWT |
| `/api/auth/admin` | POST | Bootstrap login against `ADMIN_EMAIL`/`ADMIN_PASSWORD`; creates/upgrades `superAdmin`; returns `demo-` token |
| `/api/auth/me` | GET | Current profile, or `ok(null, "Not authenticated.")` |
| `/api/auth/forgot-password` | POST | Always returns generic anti-enumeration message; Firebase accounts → Firebase `sendOobCode` (continueUrl `/login`); otherwise local token (32 random bytes, SHA-256 hashed, TTL `RESET_TOKEN_TTL_MINUTES` default 60 min) emailed via SMTP HTML or logged |
| `/api/auth/reset-password` | POST | Accepts Firebase OOB `code` (Identity Toolkit `resetPassword`) or local `token`; new password ≥ 6 chars, scrypt-hashed, clears token fields |

### 2.6 Forgot / Reset password pages
- `app/forgot-password/page.js` — submits email; on failure falls back to Firebase `sendPasswordResetEmail`; always shows generic success.
- `app/reset-password/page.js` — accepts `token` or `code` URL param; password ≥ 6 + confirm-match validation; posts to `/api/auth/reset-password`.

### 2.7 Password crypto (`lib/password.js`)
- `hashPassword(password)` — random 16-byte hex salt + scrypt (64-byte key) → `salt:hash`.
- `verifyPassword(password, stored)` — scrypt recompute + constant-time `timingSafeEqual`.
- `hashToken(token)` — SHA-256 hex (reset-token storage).
- `generateResetToken()` — 32 random bytes hex (64-char).

### 2.8 Email (`lib/mail.js`)
- `isMailConfigured()` — true when `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` set.
- `getMailConfig()` — host, port (default 587), secure (`SMTP_SECURE`), user, pass, from (`MAIL_FROM`).
- `sendMail({ to, subject, html, text })` — cached nodemailer transport; sender `"CA Office CRM" <user>`.
- `getResetEmailHtml({ resetUrl, expiresAt, appName })` — branded HTML reset email: header, reset button, `en-IN` localized expiry, fallback text link, "ignore this email" note.

### 2.9 Firebase
- `lib/firebase.js` — `isFirebaseConfigured()`, `getFirebaseApp()`, `getFirebaseAnalytics()` (browser-only, memoized, `isSupported()` guard).
- `lib/firebaseAdmin.js` — `isFirebaseAdminConfigured()`, `getFirebaseAdminApp()`, `getFirebaseAdminAuth()` (stubs returning `null`).
- `lib/firebaseAuthRest.js` — `firebaseAuthRequest(path, body)` (Identity Toolkit REST), `createOrGetFirebaseUser(email, password)` (signUp → signIn fallback on `EMAIL_EXISTS`), `friendlyFirebaseAuthError()` mapping Firebase codes to human messages.
- `lib/ensureAdmin.js` — `ensureAdminUser()`: single-flight per process; creates/upgrades `superAdmin` from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`; non-blocking call from `dbConnect()`.

### 2.10 Analytics
- `components/common/FirebaseAnalytics.jsx` — loads Firebase Analytics client-side only.

---

## 3. Roles, Permissions & Multi-Tenancy

### 3.1 Roles
| Role | Scope |
|---|---|
| `superAdmin` | Platform level — manages companies; **no** `companyId`, cannot reach tenant data; default route `/super-admin` |
| `admin` | Full access to all modules of their company; default route = first permitted nav href |
| `staff` | Only modules granted via `permissions[]`; default route `/tasks` |

### 3.2 Permission model (`lib/permissions.js`)
- `NAV_PERMISSIONS` (6 toggleable modules): `dashboard`, `clients`, `compliance`, `tasks`, `documents`, `invoices` — each `{ key, label, href, description }`.
- `DEFAULT_STAFF_PERMISSIONS = ["clients", "compliance", "tasks"]`.
- `SUPER_ADMIN_ROUTE = "/super-admin"`.
- `isValidPermissionKey(key)`, `sanitizePermissions(input)` — unique valid keys or `null`.
- `effectivePermissions(user)` — superAdmin → `[]`; admin → all keys; staff → saved valid list, else defaults.
- `hasPermission(user, key)` — no key = allowed; otherwise checks effective list.
- `getDefaultRoute(user)` — superAdmin → `/super-admin`; staff → `/tasks`; admin → first allowed href else `/login`.
- `canAccessPath(user, pathname)` — route guard: `/super-admin` needs superAdmin; `/staff` needs admin; other first-segments checked against nav permission; unknown segments allowed.
- `resolvePostLoginRedirect(user, requestedPath)` — allowed path or default route.
- `canViewFinancials(user)` — admin always `true`; staff only when `dashboardFinancials === true`.

### 3.3 Multi-tenancy
- Every tenant resource carries `companyId` (Company `_id`); names are **not** unique — two admins can register same-name companies fully isolated.
- `companyScope(user)` returns `null` for superAdmin so super admin queries are structurally blocked from tenant collections.
- Staff data access additionally scoped to clients where `assignedStaff = user._id` (clients, invoices, dashboard aggregations).

### 3.4 App shell guards
- `app/(app)/layout.js` — auth guard + "Loading CA Office CRM..." spinner.
- `components/layout/AppShell.jsx` — calls `refreshUser()` on mount; maps current pathname segment → permission key (`PATH_TO_PERMISSION`); denied → `router.replace(getDefaultRoute(user))`; renders TopNav + main + footer (firm name + year).
- `app/page.js` — root redirect via `getDefaultRoute(user)` or `/login`.

---

## 4. App Shell & Navigation

### 4.1 Top navigation (`components/layout/TopNav.jsx`)
- Sticky bar: brand/firm name, desktop links — Dashboard, Clients, Compliance, Tasks, Documents, Invoices, **Staff** (admin only, `__admin_only`), **Companies** (super admin only, `__super_admin_only`).
- Links filtered through `hasPermission`/role; active route highlight.
- Mobile: hamburger toggles slide-down drawer with same links.
- Right side: `NotificationBell`, `UserMenu`; avatar = `initials(name)`.

### 4.2 Notification bell (`components/layout/NotificationBell.jsx`)
- Fetches `/api/notifications?limit=15`; red unread-count badge.
- Dropdown with per-type icons/colors (`TYPE_META`): `TASK_DUE`, `TASK_OVERDUE`, `COMPLIANCE_DUE`, `COMPLIANCE_OVERDUE`, `PAYMENT_DUE`, `DOCUMENT_UPLOADED`, `TASK_ASSIGNED`, `LOGIN`.
- "Mark all as read" → `PATCH /api/notifications/read-all`; clicking an item marks it read and navigates to its entity; click-outside/✕ closes.

### 4.3 User menu (`components/layout/UserMenu.jsx`)
- Avatar + name + role caption; dropdown shows name/email, role badge, **permissions list** for staff, Logout.
- Closes on outside mousedown; Logout → `logout()` + redirect to login.

### 4.4 Root layout (`app/layout.js`)
- Metadata title "CA Office CRM", Geist fonts, `AuthProvider`, `FirebaseAnalytics`.

---

## 5. Dashboard

### 5.1 Summary cards (`app/(app)/dashboard/page.js`)
- **Clients** (total/active), **Compliance** (counts by status incl. derived OVERDUE), **Tasks** (counts by status incl. derived OVERDUE), **Documents** count.
- Financial cards gated by `canViewFinancials`: **Total Revenue**, **Amount Received**, **Outstanding**, **Total Expenses** — forced to 0 for staff without `dashboardFinancials`.

### 5.2 Revenue overview
- 6-month **AreaChart** (recharts) from `/api/dashboard/revenue` — monthly revenue grouped by `invoiceDate` year/month; `[]` if user can't view financials; staff scoped to own clients.

### 5.3 Recent activity feed
- Latest 10 `Activity` docs from `/api/dashboard/activity`, populated with actor name (`"System"` when none): `{ id, action, description, actor, createdAt }`.

### 5.4 Upcoming deadlines (`components/dashboard/UpcomingDeadlinesCard.jsx`)
- Merged list from `/api/dashboard/upcoming`: up to 30 upcoming compliance records + 30 open tasks, role-scoped, with `{ id, type, label, client, dueDate, daysLeft, assignedTo }`, sorted ascending.
- Overdue badge; **Upcoming / Overdue** toggle views; refresh via `refreshKey`.

### 5.5 Due calendar (`components/dashboard/DueCalendarModal.jsx`)
- Month grid (Mon–Sun), month/year header, ‹ › month navigation.
- Fetches `/api/compliance?upcoming=1&limit=100` + `?status=OVERDUE&limit=100`; day dots (red = overdue, green = upcoming).
- Clicking a day shows side list of that day's compliance items (type, client, status); clicking an item navigates to compliance page.

### 5.6 Expenses panel
- Tabs **Daily / Weekly / Monthly / All** from `/api/expenses?period=…`; period total; add/edit/delete expense modal with `EXPENSE_CATEGORIES`.

### 5.7 Dashboard API (`lib/dashboard.js`)
| Function | Behavior |
|---|---|
| `getDashboardSummary(user)` | Parallel: client counts (soft-delete excluded), compliance/task status buckets with derived OVERDUE, invoice sum, payment sum, document count, expense sum → `{ totalClients, activeClients, compliance, tasks, totalRevenue, amountReceived, outstandingAmount, totalExpenses, documents }`; `outstandingAmount = max(0, revenue − received)`; financials 0 unless `canViewFinancials`; staff scoped to assigned clients |
| `getRevenueSeries(user)` | Last 6 months `[{ name: "Jan", revenue }]` |
| `getRecentActivity(user)` | Latest 10 activities, company-scoped |
| `getUpcomingDeadlines(user)` | Merged compliance + tasks, populated names |
| `staffClientIds(user)` (private) | Client ids where `assignedStaff = user._id` |
| `statusBucket(...)` (private) | Aggregation deriving OVERDUE for non-COMPLETED with past dueDate, grouped counts |
| `monthKey(date)` (private) | `"YYYY-MM"` |

**Dashboard endpoints:** `/api/dashboard/summary`, `/api/dashboard/revenue`, `/api/dashboard/activity`, `/api/dashboard/upcoming` (upcoming runs status/reminder sweeps first).

---

## 6. Clients Module

### 6.1 Clients list page (`app/(app)/clients/page.js`)
- **Three view modes:** Grid (cards) / Table / List toggle.
- **Debounced search** across name, client code, PAN, GSTIN, email, phone.
- **Category filter** (Individual, Proprietor, Pvt Ltd, LLP, Partnership, HUF, Other).
- **Assigned filter:** All / Assigned / Unassigned.
- **Pagination** (`components/common/Pagination.jsx`: Prev/Next + page numbers + "N of Total" count).
- **Export CSV** and **Export Excel** — walks all pages via `fetchAllList` so full filtered dataset is exported (date-suffixed filenames).
- **Import Clients** modal, **Add Client** button.
- **Row/card actions:** Edit, Delete (ConfirmDialog), Assign Staff, WhatsApp.

### 6.2 Client form (`components/clients/ClientForm.jsx`)
- Add + edit modes; `react-hook-form` + `zod` (`clientSchema`).
- Fields: Name* (min 2), Category* (select), **PAN*** (regex `[A-Za-z]{5}\d{4}[A-Za-z]`, uppercase), Aadhaar (12 digits), **GSTIN** (15-char regex), CIN, Email* (valid), Phone* (Indian mobile `^(\+91[\s-]?)?[0]?[6-9]\d{9}$`), Address (textarea), Father/Spouse name, Assigned Staff (select from `/api/users`, "Unassigned" option).
- **Live client-code preview** ("XX-0001") from `previewNextClientSequence` (non-destructive peek).
- Field-level validation errors; loading spinner; cancel closes; save → `POST /api/clients` or `PUT/PATCH /api/clients/:id`; shared `loadClients` refresh.

### 6.3 Client views
- **`ClientsTable.jsx`** — columns: Client (avatar + name + code), Category badge, PAN/GSTIN, Contact (email/phone), Staff, Added date, Actions (WhatsApp, Edit, Delete, Assign Staff).
- **`ClientCard.jsx`** — gradient avatar by category, name link to detail, code chip, category badge, PAN, email, masked phone, staff chip, floating WhatsApp + Edit/Delete/Assign actions.
- **`ClientsList.jsx`** — compact rows: initials, name, category badge, short PAN, contact, actions (WhatsApp, Edit, Delete, Assign).

### 6.4 Client detail page (`app/(app)/clients/[clientId]/page.js`)
- `CATEGORY_GRADIENTS` hero header; overview cards: **Contacts, Documents, Invoices, Compliance, Tasks** with counts.
- Activity log for the client; `maskAadhaar` display; WhatsApp button; Assign Staff modal; delete.

### 6.5 Assign staff (`components/clients/AssignStaffModal.jsx`)
- Shows client name + current assignee; staff select; Save → `PATCH /api/clients/:id { assignedStaff }`; loading state; `onAssigned` refresh.

### 6.6 Client search picker (`components/clients/ClientSearchPicker.jsx`)
- 300 ms debounced search against `/api/clients?search=`; dropdown of name/code/phone; select sets value; ✕ clears; "No clients found" empty state. Reused by compliance/task/invoice/document forms.

### 6.7 Client import — 2-step wizard (`components/clients/ImportClientsModal.jsx`)
- **Step 1:** upload card (drag-drop styled input) accepting `.xlsx`, `.xls`, `.csv`; **Download Template** link; instructions.
- **Step 2 (preview):** valid-row count, optional **header auto-mapping** selects (map arbitrary columns to canonical fields), scrollable error list with "Show All" toggle.
- Confirm → `POST /api/clients/import` → result view (X imported / Y errors) → list refresh.
- Cancel aborts.

### 6.8 Client import API
| Endpoint | Features |
|---|---|
| `POST /api/clients/import/preview` | 10MB cap, `.xlsx`/`.xls`, header-row sniffing, **alias maps** (e.g. `private limited`→Pvt Ltd, `domestic company`, `limited liability partnership`), PAN/AADHAAR regex validation, per-row error reporting, header auto-mapping |
| `POST /api/clients/import` | XLSX parse (first sheet), category alias normalization, PAN/Aadhaar/email/phone regex validation, per-row errors, **batch upsert with retry**, company-scoped, mapped fields + arbitrary **extra fields** stored in `extraFields` Map |

### 6.9 Clients API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/clients` | GET | `search`, `category`, `assigned`, `page`, `limit`; staff scoped to own clients |
| | POST | name/email/pan/phone/address required; **PAN/GSTIN duplicate check**; auto client code via `nextClientCode`; **triggers compliance calendar** (`applyComplianceCalendar`); retry on code collision |
| `/api/clients/[id]` | GET | Embeds compliance, tasks, documents, invoices, activities + counts; **staff 403 unless assigned** |
| | PATCH | field allowlist; PAN/GSTIN dedupe; staff validity check |
| | DELETE | **soft delete** (`isDeleted`, `deletedAt`, `deletedBy`); admin-only |
| `/api/clients/code` | GET | Preview next client sequence (non-destructive) |

### 6.10 Client model (`models/Client.js` — collection `clients`)
Fields: `companyId`, `clientCode` (uppercase, unique sparse per company), `name*`, `category` enum (Individual/Proprietor/Pvt Ltd/LLP/Partnership/HUF/Other, default Other), `pan`, `aadhaar`, `gstin`, `cin`, `email` (lowercase), `phone`, `address`, `fatherName`, `extraFields` (Map), `assignedStaff`, `status` (active/inactive), `createdBy`, `isDeleted`, `deletedAt`, `deletedBy`, timestamps.
Indexes: text on `name/email/gstin`; unique `{companyId, clientCode}` sparse; `{isDeleted, category, createdAt:-1}`; `{isDeleted, assignedStaff, createdAt:-1}`; `{pan, isDeleted}`; `{gstin, isDeleted}`; `{aadhaar, isDeleted}`.

### 6.11 Client code generation (`lib/counter.js`)
- `nextClientCode(name, companyId)` — initials from first 2 words (default `"CL"`) + atomic `Counter` increment → `AV-0001` (4-digit).
- `previewNextClientSequence(companyId)` — peek without incrementing.
- Atomic `findOneAndUpdate` + `$inc` + upsert = concurrency-safe; unique `{key, companyId}` index.

---

## 7. Compliance Module

### 7.1 Compliance page (`app/(app)/compliance/page.js`)
- **Tab counts** from `/api/compliance/counts`: All / Pending / In Progress / Overdue / Completed (honors assigned filter).
- Filters: **status** (`?status=`, pre-set from URL query), **type**, **category**, **assigned staff**, search.
- Export **CSV / Excel** (full filtered dataset via `fetchAllList`).
- "Add Compliance" → ComplianceForm.

### 7.2 Compliance form (`components/compliance/ComplianceForm.jsx`)
- Fields: Client (search picker), Type* (from `COMPLIANCE_TYPES`), Category (from `COMPLIANCE_CATEGORIES`), Period, Financial Year, Due Date*, Assigned Staff, Description, Priority (LOW/MEDIUM/HIGH), **Recurrence (NONE/MONTHLY/QUARTERLY/ANNUAL)**.
- Zod validation (`complianceSchema`): clientId/type/category/period/financialYear/dueDate required.
- Save → `POST /api/compliance` or edit endpoint.

### 7.3 Compliance card (`components/compliance/ComplianceCard.jsx`)
- Displays: type, client link, category badge, period/FY, due date + **days-remaining indicator** (overdue red / due-soon amber / upcoming green), status badge, priority badge, assigned staff.
- **Status quick-change dropdown** with optimistic UI update + rollback on failure (`PATCH /api/compliance/:id`); shows `nextScheduled` (auto-generated next occurrence) after PATCH.
- `isLate` / `isSoon` flags.
- **WhatsApp document-request** button → pre-filled `DOCUMENT_REQUEST` message.
- Edit → form; Delete → ConfirmDialog.

### 7.4 Automatic compliance calendar (`lib/complianceCalendar.js`)
Runs automatically on client creation:
- `buildComplianceCalendar(client)` — pure generator based on client `category` + `gstin` presence:
  | Filing | Rule |
  |---|---|
  | GSTR-1 (Monthly, day 11) | only if GSTIN present |
  | GSTR-3B (Monthly, day 20) | only if GSTIN present |
  | GSTR-9 (Annual, Dec 31) | only if GSTIN present |
  | ITR (Annual, Jul 31) | category ≠ "Other" |
  | TDS Return (Quarterly: 30 Apr / 31 Jul / 31 Oct / 31 Jan) | Proprietor, Partnership, Pvt Ltd, LLP |
  | ROC Filing (Annual, Oct 31) | Pvt Ltd, LLP |
- Each record: PENDING, MEDIUM priority, `autoGenerated: true`, computed `period` + Indian `financialYear` + next future `dueDate`.
- `applyComplianceCalendar(client)` — `insertMany({ ordered: false })`, suppresses 11000 dup errors (safe to re-call; partial unique index guards races).
- Helpers: `nextDueOn(dayOfMonth)`, `nextQuarterlyTdsDue()`, `formatMonthYear()`, `fyLabel()`, `fyForDate()` (Indian FY from April).

### 7.5 Compliance API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/compliance` | GET | `status`, `type`, `assigned`, `upcoming`, `page`, `limit`; **runs** `refreshOverdueCompliance` + `refreshComplianceReminders` + `ensureRecurringRollforward` |
| | POST | client/type/dueDate required; staff validation; status derived; **notification to assignee** |
| `/api/compliance/counts` | GET | Per-status tab counts |
| `/api/compliance/[id]` | PATCH | status → sets `completedAt`/`completedBy`; editable fields; dueDate change → status recompute; **on COMPLETED → `generateNextCompliance` + refresh reminders** |
| | DELETE | Hard delete |

### 7.6 Recurring compliance engine (`lib/reminders.js`)
- Constants: `DUE_SOON_DAYS = 7`; `RECURRENCE_STEP_MONTHS = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 }`.
- **`generateNextCompliance(record)`** — on completion, creates the NEXT occurrence: skips `NONE`; advances ≥ 1 full cycle and loops (guard < 240) until next day strictly after now (**early completions never clone themselves**); duplicate pre-check on `companyId+clientId+type+category+dueDate`; creates PENDING `autoGenerated: true` inheriting staff/priority/description; computes fresh financial year; catches 11000 races; sends `COMPLIANCE_DUE` "Next filing scheduled" notification; never throws.
- **`ensureRecurringRollforward()`** — backfill sweep, **single-flight + 10 s cooldown**; per active company: `dedupeAutoGenerated` (keep oldest, delete duplicate auto-clones) then up to 50 COMPLETED recurring records completed within 400 days → generate next if no open occurrence exists.
- **`refreshComplianceReminders()`** — reminder sweep, **single-flight + 10 s cooldown**; up to 200 open records due ≤ now+7 days; builds `COMPLIANCE_OVERDUE` ("Filing overdue") or `COMPLIANCE_DUE_SOON` ("Filing due TODAY" / "Filing due soon") with client name + days phrasing; **dedupe per record + type + user** via `Notification.exists`; assigned → that staff; unassigned → all company admins.
- Helpers: `calendarDaysLeft(dueDate)` (calendar-day diff), `computeNextDueDate(dueDate, recurrence)`, `computeFinancialYear(dueDate)`, `addMonths` (end-of-month clamping), `notifyRecipients`, `getActiveCompanyIds`.

### 7.7 Overdue sweep (`lib/status.js`)
- `startOfToday()`, `endOfDay(date)` — a filing due "today" stays PENDING all day (no UTC-midnight flip).
- `refreshOverdueCompliance()` — flips non-COMPLETED records with `dueDate < startOfToday()` to `OVERDUE` via `updateMany`; per-tenant; **single-flight + 10 s cooldown**.

### 7.8 Compliance model (`models/Compliance.js` — `compliances`)
Fields: `companyId`, `clientId*`, `type*`, `category` enum (GST/Income Tax/TDS/ROC/PF/ESI/Other, default GST), `period`, `financialYear`, `dueDate*`, `assignedStaff`, `status` enum (PENDING/IN_PROGRESS/OVERDUE/COMPLETED), `priority` (LOW/MEDIUM/HIGH), `recurrence` (NONE/MONTHLY/QUARTERLY/ANNUAL), `nextDueDate`, `description`, `autoGenerated`, `completedAt`, `completedBy`, `createdBy`, timestamps.
Indexes: `{clientId, dueDate, status, assignedStaff, type}`; `{status, assignedStaff, dueDate}`; `{clientId, type, category, dueDate}`; **partial unique** `{clientId, type, category, dueDate}` where `autoGenerated: true` (`unique_auto_generated_occurrence`).

---

## 8. Tasks Module

### 8.1 Tasks page (`app/(app)/tasks/page.js`)
- **Status tabs:** All Status / Pending / In Progress / Completed / Overdue (Overdue = derived filter).
- **Priority filter:** All / Low / Medium / High.
- **Assigned filter:** All / Assigned / Unassigned.
- Search, **CSV/Excel export**, pagination, "Add Task" → TaskForm.
- Default post-login landing page for staff.

### 8.2 Task form (`components/tasks/TaskForm.jsx`)
- Fields: Title* (min 2), Description, Client (search picker, required), Assigned To (staff select), Priority (LOW/MEDIUM/HIGH, required), Due Date (required).
- Zod `taskSchema`; save → `POST /api/tasks` or edit endpoint.

### 8.3 Task card (`components/tasks/TaskCard.jsx`)
- Shows title, client link, due date + **days-remaining badge** (overdue red / due-soon ≤3 days amber), status badge, priority badge, assignee avatar/name, description snippet, `derivedStatus`, `isLate`, `isSoon`, `isUnassigned`.
- **Status change buttons** (Mark In Progress / Mark Completed) with **optimistic PATCH**.
- **WhatsApp task reminder** button (pre-filled `TASK_REMINDER`).
- Edit → form; Delete → ConfirmDialog.

### 8.4 Tasks API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/tasks` | GET | `status`, `priority`, `assigned`, `page`, `limit`; **derived-status filter**; applies `deriveTaskStatus` on rows |
| | POST | title/description/priority/dueDate required; client + staff validation; **`TASK_ASSIGNED` notification** |
| `/api/tasks/[id]` | PATCH | status change stamps `startedAt` (→ IN_PROGRESS) / `completedAt` (→ COMPLETED); editable fields; staff validation |
| | DELETE | **soft delete** |

### 8.5 Derived task status (`lib/status.js`)
- `deriveTaskStatus(task)` — returns `OVERDUE` when not COMPLETED and dueDate past; else stored status.
- `buildTaskStatusFilter(status)` — Mongo filters: COMPLETED exact; OVERDUE = `{$ne: COMPLETED}` + `dueDate < now`; PENDING/IN_PROGRESS accept future/null dueDate; else raw.

### 8.6 Task model (`models/Task.js` — `tasks`)
Fields: `companyId`, `title*`, `description`, `clientId`, `assignedTo`, `priority` (LOW/MEDIUM/HIGH, default MEDIUM), `status` (PENDING/IN_PROGRESS/COMPLETED, default PENDING), `dueDate`, `createdBy`, `startedAt`, `completedAt`, `isDeleted`, timestamps.
Indexes: `{clientId, assignedTo, status, priority, dueDate}`; `{isDeleted, assignedTo, dueDate, priority:-1}`.

---

## 9. Invoices Module

### 9.1 Invoices page (`app/(app)/invoices/page.js`)
- **Summary cards** (`InvoiceSummaryCards.jsx`): Total Revenue / Amount Received / Outstanding (gradient tiles).
- **Status filter:** All / PENDING / PARTIAL / PAID / OVERDUE.
- **CSV / Excel export** (full filtered dataset), pagination.
- "Add Invoice" → InvoiceForm.
- Display toggle: **`InvoiceTable`** (desktop table) / **`InvoiceCards`** (mobile stacked).

### 9.2 Invoice form (`components/invoices/InvoiceForm.jsx`)
- Fields: Client (search picker, required), Invoice Date (default today), Due Date, **GST Rate** (select, default 18%), dynamic **line items** — each: Description, **Service Type** (from `INVOICE_SERVICE_TYPES`), Quantity, Amount; "Add line item" / remove (✕); Notes.
- **Live computation** of subtotal, GST amount, grand total as items change.
- Auto invoice-number preview `INV-YYYY-NNN`.
- Zod `invoiceSchema` / `invoiceItemSchema`.
- Save → `POST /api/invoices` or edit endpoint.

### 9.3 Invoice table & cards
- **`InvoiceTable.jsx`** — columns: Invoice (number + client), Status badge, Amount, Paid, Due Date (days-remaining color), Actions: View details, Download (XLSX), **WhatsApp payment reminder**, Pay (PaymentModal), Edit, Delete. Mobile falls back to card layout.
- **`InvoiceCards.jsx`** — status color strip, invoice number + client, total/due amounts, due date + days badge (overdue red / due-soon amber), line-item count; actions: WhatsApp, Pay now, Edit, Delete, Download.

### 9.4 Invoice financial engine (`lib/invoice.js`)
- `calculateInvoice({ items, gstRate })` — `subtotal = Σ(qty × amount)`; `gstAmount = round(subtotal × rate / 100)`; `totalAmount = subtotal + gstAmount`.
- `deriveInvoiceStatus({ totalAmount, paidAmount, dueDate, status })` — `PENDING` → `PARTIAL` (0 < paid < total) → `PAID` (paid ≥ total); if not PAID and dueDate past → **`OVERDUE`** (overriding).

### 9.5 Invoice numbering (`lib/counter.js`)
- `nextInvoiceNumber(companyId)` — year-scoped key `invoice-<year>`; atomic `$inc` + upsert → `INV-2026-001` (3 digits); **per-company** so tenants never collide; backed by unique `{companyId, invoiceNumber}` index.

### 9.6 Invoices API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/invoices` | GET | `status` filter; **staff → only clients assigned to them**; populates client |
| | POST | client/dates/items required; `nextInvoiceNumber`; `calculateInvoice`; status `PENDING` |
| `/api/invoices/[id]` | GET | embeds payments + fully populated client |
| | PATCH | items **recalculated** via `calculateInvoice`; editable invoiceDate/dueDate/notes/status; **status re-derived** |
| | DELETE | **soft delete** |
| `/api/invoices/[id]/payments` | GET, POST | POST: positive amount required; creates Payment; **recomputes paid/outstanding from full payment history**; `deriveInvoiceStatus`; outstanding can never go negative (`Math.max(0, …)`) |
| `/api/invoices/[id]/download` | GET | **Multi-sheet XLSX** (Summary / Items / Payments), INR-formatted |
| `/api/invoices/[id]/view` | GET | **Styled HTML invoice** (escaped values, `FIRM_NAME` branding) |

### 9.7 Payments (`components/invoices/PaymentModal.jsx` + `models/Payment.js`)
- Modal shows invoice number, total amount, **outstanding balance**.
- Fields: Amount* (> 0 and **≤ outstanding**, inline error otherwise), Payment Date (default today), Payment Method* (CASH/UPI/BANK/CHEQUE/OTHER, default BANK), Reference Number (UTR), Notes.
- Submit → `POST /api/invoices/:id/payments` → invoice status auto-updates (PARTIAL→PAID) → lists refresh.
- Payment model fields: `companyId`, `invoiceId*`, `clientId*`, `amount*`, `paymentDate*`, `paymentMethod`, `referenceNumber`, `notes`, `recordedBy`, timestamps. Index: `{invoiceId, clientId, paymentDate}`.

### 9.8 Invoice model (`models/Invoice.js` — `invoices`)
Fields: `companyId`, `invoiceNumber*` (unique per company), `clientId*`, `invoiceDate*`, `dueDate*`, `items[]` (`description*`, `serviceType`, `quantity` default 1, `amount*`), `subtotal`, `gstRate`, `gstAmount`, `totalAmount`, `paidAmount`, `outstandingAmount`, `status` enum (PENDING/PARTIAL/PAID/OVERDUE), `notes`, `createdBy`, `isDeleted`, timestamps.
Indexes: `{clientId, invoiceDate, status, dueDate}`; `{isDeleted, status, invoiceDate:-1}`; **unique** `{companyId, invoiceNumber}`.

---

## 10. Documents Module

### 10.1 Documents page (`app/(app)/documents/page.js`)
- Search by name, **category filter** (GST, Income Tax, Bank Statement, TDS, ROC, KYC, Invoices, Other), pagination.
- **Upload Document** modal; delete with ConfirmDialog; **CSV/Excel export**; `formatBytes` sizes.

### 10.2 Upload (`components/documents/UploadDocumentModal.jsx`)
- Client search picker, category select (default "GST"), file picker/drop area showing chosen filename.
- **Validation:** extensions only `pdf, docx, xlsx, xls, jpg, jpeg, png`; **max 10 MB**; inline error otherwise.
- Submit → `POST /api/documents` (FormData) + **`DOCUMENT_UPLOADED` staff notification**; closes + refreshes.

### 10.3 Document card (`components/documents/DocumentCard.jsx`)
- `FILE_ICONS` by extension (PDF, DOC, XLS/XLSX, IMG, generic), file name, formatted size, uploaded date, client name, category badge.
- Actions: **View** (inline, new tab), **Download**, **Delete** (ConfirmDialog), client link.

### 10.4 Storage (`lib/storage.js`, `lib/cloudinary.js`, `lib/documents.js`)
- **Cloudinary when configured**, else local `public/uploads/<clientId>/`.
- `lib/cloudinary.js`: `isCloudinaryConfigured()`, `getCloudinary()` (secure), `uploadToCloudinary({ buffer, fileName, clientId })` → `public_id = client-documents/<clientId>/<ts>-<name>`, folder `ca-office-crm`, `resource_type: "auto"`, tags `[ca-office-crm, client-<id>]` → `{ cloudinaryUrl, cloudinaryPublicId, resourceType, format, size }`; `deleteFromCloudinary(publicId)`.
- `lib/storage.js`: `getUploadDir()` (mkdir), `saveLocalFile(...)` → `/uploads/…`, `deleteLocalFile` (only under `public/uploads`), `resolveLocalFile` (**path-traversal guard**).
- `lib/documents.js`: `mimeTypeFor(format)` (pdf/xlsx/xls/docx/doc/jpg/jpeg/png → MIME, fallback octet-stream); `readLocalDocumentFile`; `getDocumentContent(doc)` — **proxies bytes through the app's own API** (server-side fetch `cache: "no-store"` for Cloudinary; buffer for local) — never redirects to Cloudinary.

### 10.5 Documents API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/documents` | GET | `search`, `category`, `page`, `limit`; staff scoped to own clients |
| | POST | FormData: client/category/file; **extension allowlist + 10 MB cap**; Cloudinary or local storage |
| `/api/documents/[id]` | GET, DELETE | DELETE removes file from Cloudinary/local + soft-deletes record |
| `/api/documents/[id]/view` | GET | Inline serve |
| `/api/documents/[id]/download` | GET | Attachment serve |

### 10.6 Document model (`models/Document.js` — `documents`)
Fields: `companyId`, `name*`, `clientId*`, `category` enum (GST/Income Tax/Bank Statement/TDS/ROC/KYC/Invoices/Other), `cloudinaryUrl` (URL or local path), `cloudinaryPublicId`, `resourceType`, `format`, `size`, `storageType` (cloudinary/local), `uploadedBy`, `isDeleted`; timestamps with `createdAt` mapped to **`uploadedAt`**.
Indexes: text `{clientId, category, name}`; `{isDeleted, clientId, uploadedAt:-1}`; `{isDeleted, category, uploadedAt:-1}`.

---

## 11. Expenses Module

### 11.1 Expenses UI (dashboard panel)
- Tabs **Daily / Weekly / Monthly / All**; period total; add/edit/delete expense modal with category select (`EXPENSE_CATEGORIES`: Office Rent, Salaries, Utilities, Software & Tools, Travel, Marketing, Professional Services, Office Supplies, Miscellaneous, Other); notes field.

### 11.2 Expenses API & helpers
| Endpoint | Methods |
|---|---|
| `/api/expenses` | GET (`period` = daily/weekly/monthly/all), POST (description + amount required) |
| `/api/expenses/[id]` | GET, PUT, DELETE |

`lib/expenses.js`: `createExpense`, `deleteExpense` (scoped `findOneAndDelete`), `getExpenseById` (populates `addedBy.name`), `getExpenses(user, period)` → `{ expenses, total }` (period ranges: daily, weekly from Sunday, monthly from 1st, all), `updateExpense` (`runValidators`), `getTotalExpenses` (aggregate sum), `getMonthlyExpenseSeries` (last 6 months).

### 11.3 Expense model (`models/Expense.js` — `expenses`)
Fields: `companyId*`, `description*`, `amount*` (min 0), `category` (default "Other"), `date*` (default now), `notes`, `addedBy*`, timestamps. Index: `{companyId, date:-1}`.

---

## 12. Staff / Users Module

### 12.1 Staff page (`app/(app)/staff/page.js`)
- Two tabs (via `?tab=`): **Members** (default) and **Login Details**.
- Members: search, **Add Staff** → StaffForm, edit, **activate/deactivate toggle**, **CSV/Excel export**.

### 12.2 Staff form (`components/staff/StaffForm.jsx`)
- Fields: Name*, Email*, Phone, **Password** (required on add; blank = keep unchanged on edit), **Active toggle**, **Permissions checkbox group** generated from `NAV_PERMISSIONS` (Staff module itself not toggleable; defaults pre-selected), **"Dashboard Financials" checkbox** (grants `canViewFinancials`).
- Save → `POST /api/users` or edit endpoint; field-level errors; loading.

### 12.3 Login details (`components/staff/LoginDetails.jsx`)
- Fetch `/api/login-history` (`page`, `pageSize=50`, single `date` or `from`/`to` range).
- Search box; record count; **CSV + Excel export** of currently filtered rows; initials avatar; `formatDateTime`; Pagination.
- Table columns: User, Email, **IP Address**, **Browser/Device**, Time.

### 12.4 Users API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/users` | GET | Role-aware: admin → all company users; staff → active staff; superAdmin → `[]` |
| | POST | admin-only; creates **Firebase user** (Identity Toolkit REST) + Mongo staff user |
| `/api/users/[id]` | PATCH | allowed fields + **permissions sanitize**; | DELETE | **soft deactivate**; **cannot delete yourself** |
| `/api/login-history` | GET | admin-only; `date` or `from`/`to` range; `page`/`limit` up to 200 |

### 12.5 User model (`models/User.js` — `users`)
Fields: `firebaseUid` (unique sparse), `name*`, `email*` (unique, lowercase), `phone`, `role` enum (superAdmin/admin/staff, default staff), `companyId`, `avatarUrl`, `isActive` (default true), `permissions[]`, `dashboardFinancials` (default false), `lastLoginAt`, `passwordHash`, `resetPasswordTokenHash`, `resetPasswordExpires`, timestamps.
Indexes: `{role, isActive}`; `{companyId, role, isActive}`.

### 12.6 Login history model (`models/LoginHistory.js` — `loginhistories`)
Fields: `userId*`, `companyId*`, `name*` (snapshot), `email*` (snapshot), `timestamp*` (indexed). Indexes: `{companyId, timestamp:-1}`; `{companyId, userId, timestamp:-1}`.

---

## 13. Notifications

### 13.1 Notifications page (`app/(app)/notifications/page.js`)
- Full-page list (limit 100), per-type `TYPE_META` icons/colors, **Mark All Read**, individual read-on-click.

### 13.2 Notification API
- `GET /api/notifications` — `limit` + `unreadCount` in meta.
- `PATCH /api/notifications` — mark single by id, or mark-all.

### 13.3 Notification helpers (`lib/notifications.js`)
- `createNotification({ userId, companyId, type, title, message, entityType, entityId })` — creates with `isRead: false`; `null` if no userId; **never throws**.
- `notifyStaff(userIds, payload)` — fan-out to many users (skips falsy ids).

### 13.4 Notification model (`models/Notification.js` — `notifications`)
Fields: `userId*`, `companyId`, `type` (e.g. `COMPLIANCE_DUE`, `COMPLIANCE_DUE_SOON`, `COMPLIANCE_OVERDUE`, `TASK_ASSIGNED`, `TASK_DUE`, `TASK_OVERDUE`, `PAYMENT_DUE`, `DOCUMENT_UPLOADED`, `LOGIN`), `title*`, `message`, `entityType`, `entityId`, `isRead`, timestamps.
Indexes: `{userId, isRead, createdAt:-1}`; `{companyId, userId, isRead}`.

### 13.5 Notification triggers in the system
- Task assigned → assignee.
- Compliance created → assignee.
- Compliance due ≤ 7 days / overdue → assignee, or all admins if unassigned (idempotent).
- Recurring compliance rolled forward → "Next filing scheduled".
- Document uploaded → staff.
- Staff login (once per day per staff) → all active admins.
- Payment due (seeded/demo types), task due/overdue, login events.

---

## 14. WhatsApp Integration

### 14.1 UI (`components/whatsapp/`)
- **`WhatsAppButton.jsx`** — props: `phone`, `message`, `client`, `messageType` (default `CUSTOM_MESSAGE`), `clientId`, `iconOnly`, `variant`, `size`; opens preview modal.
- **`WhatsAppMessageModal.jsx`** — client name/phone header, **editable message textarea** pre-filled with template, hint text about wa.me; normalizes phone via `normalizeIndianPhone` (invalid → inline error + disabled button); "Open WhatsApp" builds `createWhatsAppUrl` and `window.open("_blank", "noopener,noreferrer")`; then `logWhatsAppOpen`. Cancel closes.
- **`WhatsAppIcon.jsx`** — inline brand SVG glyph.

### 14.2 URL builder (`lib/whatsapp.js`)
- `createWhatsAppUrl({ phone, message })` — normalizes Indian phone, throws on invalid, returns `https://wa.me/<91XXXXXXXXXX>?text=<encoded>` — official click-to-chat, **no API credentials required**.

### 14.3 Phone normalization (`lib/phone.js`)
- `normalizeIndianPhone(phone)` — strips non-digits, drops leading 0, handles 10-digit (prepends `91`), 12-digit `91…`; validates mobile starts 6–9; returns `{ valid, phone, reason? }`.
- `isValidIndianPhone(phone)` — boolean wrapper.

### 14.4 Message templates (`lib/whatsappMessages.js`) — all signed with `FIRM_NAME`
| Generator | Content |
|---|---|
| `generateClientMessage({ client })` | Generic greeting from the firm |
| `generateDocumentRequestMessage({ client, documents, period })` | Numbered document list; correct singular/plural ("document"/"documents") verb agreement |
| `generateComplianceReminderMessage({ client, compliance })` | Type, formatted due date, status |
| `generateComplianceOverdueMessage({ client, compliance })` | Overdue nudge with type + due date |
| `generatePaymentReminderMessage({ client, invoice })` | Invoice #, total, paid, outstanding, due date — uses **server-calculated** amounts (`formatINR`/`formatDate`), never trusts client-side totals |
| `generateTaskReminderMessage({ client, task })` | Title, due date, priority, `derivedStatus ?? status` |

### 14.5 Audit logging (`lib/whatsappLog.js`, `/api/whatsapp/log`)
- `logWhatsAppOpen({ clientId, messageType, clientName })` — POSTs open event; whitelisted types: `CLIENT_MESSAGE`, `DOCUMENT_REQUEST`, `COMPLIANCE_REMINDER`, `COMPLIANCE_OVERDUE`, `PAYMENT_REMINDER`, `TASK_REMINDER`, `CUSTOM_MESSAGE`.
- API logs `WHATSAPP_MESSAGE_OPENED` activity (**message content is never stored**); failures silently swallowed so logging never blocks UX.

---

## 15. Super Admin — Companies

### 15.1 Super-admin page (`app/(app)/super-admin/page.js`)
- Companies table: **Create company + admin** (companyName, adminName, adminEmail, adminPassword ≥ 6) via `POST /api/companies`.
- **Edit** company name / active flag; **view admin**; **edit-history modal** (audit trail); refresh.

### 15.2 Companies API
| Endpoint | Methods | Features |
|---|---|---|
| `/api/companies` | GET | `requireSuperAdmin`; populates admin |
| | POST | Creates company **and** Firebase admin user |
| `/api/companies/[id]` | GET, PATCH | PATCH: `companyName`/`isActive` + **editHistory audit** (capped at 200 entries) |

### 15.3 Company model (`models/Company.js` — `companies`)
Fields: `companyName*` (NOT unique — tenancy keyed by `_id`), `adminUserId`, `createdBy`, `isActive` (default true), `lastEditedBy`, `lastEditedAt`, `editHistory[]` (`editedBy`, `editedByName`, `field`, `oldValue`, `newValue`, `editedAt`, cap 200), timestamps. Indexes: `{companyName}`; `{isActive, createdAt:-1}`.

---

## 16. Activity Log

- `lib/activity.js` — `logActivity({ userId, companyId, action, entityType, entityId, description, metadata })`: creates Activity doc; wrapped in try/catch → **never throws** (failures console-logged, primary operation unaffected).
- `GET /api/activities` — `limit`/`skip`, populates user.
- Model (`models/Activity.js` — `activities`): `companyId`, `userId`, `action*` (e.g. `CLIENT_CREATED`, `INVOICE_CREATED`, `TASK_COMPLETED`, `DOCUMENT_UPLOADED`, `TASK_ASSIGNED`, `WHATSAPP_MESSAGE_OPENED`), `entityType`, `entityId`, `description`, `metadata` (Mixed), `createdAt`. Indexes: `{entityId, createdAt:-1}`; `{createdAt:-1}`.
- Surfaced on dashboard (last 10) and client detail page.

---

## 17. Export Engine (`lib/export.js`)

- **`downloadCSV({ filename, headers, rows })`** — quoted/escaped cells, **UTF-8 BOM** (`\uFEFF`) for Excel compatibility, filename `<name>-YYYY-MM-DD.csv`, temporary-anchor download.
- **`downloadExcel({ filename, sheetName, rows })`** — SheetJS `json_to_sheet` (object keys → headers), new workbook, `<name>-<date>.xlsx`.
- **`fetchAllList(path, params, pageSize = 100)`** — walks **all pages** (reads `pagination.totalPages`) so exports always cover the **full filtered dataset**, not just the current page.
- Private `triggerDownload(blob, name)` — object URL + invisible anchor + revoke.
- Available on: Clients, Compliance, Tasks, Invoices, Documents, Staff, Login Details.

---

## 18. Shared UI Primitives (`components/common/`)

| Component | Features |
|---|---|
| `Badge.jsx` | Pill with color variants per `STATUS_COLORS`; exports `Badge` (dot indicator), `StatusBadge`, `PriorityBadge`, `CategoryBadge` |
| `Button.jsx` | Variants `primary/success/danger/secondary/ghost/outline`; sizes `xs/sm/md/lg`; `loading` spinner, `disabled`, `block` (full-width), `type="button"` default (prevents accidental submits) |
| `ConfirmDialog.jsx` | AlertTriangle icon, title, message, Cancel/Confirm, `loading` state — used for every delete confirmation |
| `EmptyState.jsx` | Variants `default/search/unavailable/error` (distinct icons/messages), `compact` |
| `ErrorBanner.jsx` | Red banner + message + **Retry** button (re-fetches failed list) |
| `Field.jsx` | `Field` wrapper (label, red `*` required marker, error text, hint), `Input`, `Textarea`, `Select` (chevron) — used across every form |
| `Loading.jsx` | `Loading` spinner screen, `SkeletonCards`, `SkeletonRows` (list loading states) |
| `Modal.jsx` | Portal overlay + centered panel; **backdrop click close, Escape close, body scroll lock, focus trap**; widths `sm/md/lg/xl` |
| `Pagination.jsx` | Prev/Next (disabled at boundaries) + page-number buttons + "N of Total" count |

---

## 19. State, Hooks & Client Fetch

### 19.1 Auth context (`context/AuthContext.js`, `hooks/useAuth.js`)
- State: `user`, `loading`, `error`.
- `login(email, password)` — Firebase sign-in (or `/api/auth/login` fallback); persists user + token.
- `logout()` — `/api/auth/logout` + clears cookie/localStorage/state.
- `refreshUser()` — re-fetch `/api/auth/me` to re-sync role/permissions (called by AppShell on mount).

### 19.2 `hooks/useDebounce.js`
- `useDebounce(value, delay = 400)` — used at 300 ms in client picker and page search boxes.

### 19.3 Client fetch wrapper (`lib/client.js`)
- `apiFetch(url, options)` — attaches `Authorization: Bearer` from `crm_token` cookie, auto JSON-encodes non-string/FormData bodies, parses JSON (tolerates non-JSON), throws `Error` with `.status` on non-OK.
- `getToken()`, `getData`, `getList` (→ `{ data, pagination }`), `postData`, `patchData`, `deleteData`, `buildQuery(params)` (skips undefined/null/"").

---

## 20. Validation & Formatting Utilities

### 20.1 Zod schemas (`lib/validation.js`)
| Schema | Rules |
|---|---|
| `clientSchema` | name min 2, category required, PAN regex, aadhaar 12 digits optional, gstin regex optional, cin optional, valid email, phone regex, address min 1, assignedStaff optional, status active/inactive |
| `complianceSchema` | clientId, type, category, period, financialYear, dueDate all min 1; assignedStaff/description optional; priority enum |
| `taskSchema` | title min 2, description min 1, clientId min 1, assignedTo optional, priority enum required, dueDate min 1 |
| `invoiceItemSchema` | description, serviceType, quantity min 1, amount min 0 |
| `invoiceSchema` | clientId, invoiceDate, dueDate, gstRate 0–100 (default 0), items min 1, notes optional |
| `paymentSchema` | amount min 1, paymentDate, paymentMethod enum, referenceNumber/notes optional |

### 20.2 Format helpers (`lib/utils.js`)
- `formatINR(amount)` — `Intl.NumberFormat("en-IN")`, whole numbers without decimals.
- `roundMoney(amount)`, `formatDate(value)` (`dd MMM yyyy`, "—" on invalid), `formatDateTime`, `daysRemaining(dueDate)`, `formatBytes(bytes)` (B/KB/MB/GB).
- `maskAadhaar(aadhaar)` — `XXXX XXXX <last4>`.
- Validators: `isValidPAN` (`^[A-Z]{5}\d{4}[A-Z]$`), `isValidGSTIN` (15-char), `isValidEmail`, `isValidIndianPhone`.
- `getErrorMessage`, `initials(name)`, `toCamelCase`, `slugify`, `escapeRegex` (safe `$regex` queries).

### 20.3 Option constants (`lib/utils.js`)
- `CLIENT_CATEGORIES` — Individual, Proprietor, Pvt Ltd, LLP, Partnership, HUF, Other.
- `COMPLIANCE_TYPES` — GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, TDS Return, ITR, Advance Tax, ROC Filing, PF, ESI, Other.
- `COMPLIANCE_CATEGORIES` — GST, Income Tax, TDS, ROC, PF, ESI, Other.
- `DOCUMENT_CATEGORIES` — GST, Income Tax, Bank Statement, TDS, ROC, KYC, Invoices, Other.
- `INVOICE_SERVICE_TYPES` — GST Filing, ITR Filing, Tax Consultation, Accounting, Bookkeeping, Audit, TDS Filing, ROC Compliance, Payroll, Other.
- `PAYMENT_METHODS` — CASH, UPI, BANK, CHEQUE, OTHER.
- `EXPENSE_CATEGORIES` — Office Rent, Salaries, Utilities, Software & Tools, Travel, Marketing, Professional Services, Office Supplies, Miscellaneous, Other.
- `STATUS_COLORS`, `PRIORITY_COLORS` — status/priority → Tailwind color maps.

---

## 21. Database Layer (`lib/mongodb.js`)

- Cached connection on `global._mongo` (survives hot reload).
- `isDemoMode()` — hard-coded `false` (real Mongo always used).
- `dbConnect()` — requires `MONGODB_URI`; `mongoose.connect` with `bufferCommands: false`, `maxPoolSize: 10`, `serverSelectionTimeoutMS: 10000`; **background `syncIndexes()`** (non-blocking); non-blocking `ensureAdminUser()` bootstrap; resets cached promise on failure.
- `scripts/create-admin.mjs` — CLI admin-creation script (npm run `create-admin`).

---

## 22. Demo Data Seeding (`lib/seed.js`)

Runs once per in-process instance; no-ops if any users exist:
1. Company **"ABC & Associates"**.
2. Admin `Rajesh Kumar` (`admin@caoffice.com`), staff `Priya Sharma`, staff `Amit Patel` (demo firebaseUids).
3. **6 clients** with realistic PAN/Aadhaar/GSTIN/CIN/address/assigned staff.
4. **7 compliance records** with relative due dates (+20 GSTR-3B PENDING HIGH, +11 GSTR-1 IN_PROGRESS, +45 ITR, −5 TDS **OVERDUE**, +70 ROC, +30 GSTR-9 COMPLETED, +2 Advance Tax IN_PROGRESS).
5. **6 tasks** (varied statuses/priorities, some started/completed).
6. **4 invoices** `INV-2026-001..004` with computed subtotal/GST/total.
7. **2 payments** (full BANK payment → PAID; partial ₹4,000 UPI → PARTIAL), then invoice paid/outstanding/status recalculated.
8. **Counter sync** `invoice-<year>` → sequence 4 (no number collisions).
9. **4 notifications** (`TASK_ASSIGNED`, `COMPLIANCE_DUE`, `TASK_OVERDUE`, `PAYMENT_DUE`) + **4 activity entries**.

---

## 23. Background Maintenance Sweeps

| Sweep | Location | Trigger | Behavior |
|---|---|---|---|
| `refreshOverdueCompliance` | `lib/status.js` | compliance list API / cron | Flips past-due non-COMPLETED → OVERDUE per tenant; **single-flight + 10 s cooldown** |
| `refreshComplianceReminders` | `lib/reminders.js` | compliance list, upcoming API | Due ≤7 days / overdue notifications; per record+type+user idempotent; assigned→staff, unassigned→all admins; **single-flight + 10 s cooldown** |
| `ensureRecurringRollforward` | `lib/reminders.js` | compliance list | Backfills next occurrences of completed recurring filings (400-day cutoff); dedupes auto-generated clones; **single-flight + 10 s cooldown** |
| `generateNextCompliance` | `lib/reminders.js` | compliance PATCH → COMPLETED | Creates next cycle occurrence (monthly=1 / quarterly=3 / annual=12 months); never clones early completions; unique-index guarded; notifies |
| `ensureAdminUser` | `lib/ensureAdmin.js` | `dbConnect()` | Single-flight bootstrap of superAdmin from env |

Concurrency safety: single-flight promises + 10 s cooldowns mean parallel API calls on page load share one sweep run.

---

## 24. Complete API Reference (40 routes)

### Auth
| Endpoint | Methods |
|---|---|
| `/api/auth/sync` | POST |
| `/api/auth/demo` | POST |
| `/api/auth/admin` | POST |
| `/api/auth/me` | GET |
| `/api/auth/forgot-password` | POST |
| `/api/auth/reset-password` | POST |

### Clients
| Endpoint | Methods |
|---|---|
| `/api/clients` | GET, POST |
| `/api/clients/[id]` | GET, PATCH, DELETE |
| `/api/clients/code` | GET |
| `/api/clients/import` | POST |
| `/api/clients/import/preview` | POST |

### Compliance
| Endpoint | Methods |
|---|---|
| `/api/compliance` | GET, POST |
| `/api/compliance/counts` | GET |
| `/api/compliance/[id]` | PATCH, DELETE |

### Tasks
| Endpoint | Methods |
|---|---|
| `/api/tasks` | GET, POST |
| `/api/tasks/[id]` | PATCH, DELETE |

### Invoices & Payments
| Endpoint | Methods |
|---|---|
| `/api/invoices` | GET, POST |
| `/api/invoices/[id]` | GET, PATCH, DELETE |
| `/api/invoices/[id]/payments` | GET, POST |
| `/api/invoices/[id]/download` | GET |
| `/api/invoices/[id]/view` | GET |

### Documents
| Endpoint | Methods |
|---|---|
| `/api/documents` | GET, POST |
| `/api/documents/[id]` | GET, DELETE |
| `/api/documents/[id]/view` | GET |
| `/api/documents/[id]/download` | GET |

### Dashboard
| Endpoint | Methods |
|---|---|
| `/api/dashboard/summary` | GET |
| `/api/dashboard/revenue` | GET |
| `/api/dashboard/activity` | GET |
| `/api/dashboard/upcoming` | GET |

### Expenses
| Endpoint | Methods |
|---|---|
| `/api/expenses` | GET, POST |
| `/api/expenses/[id]` | GET, PUT, DELETE |

### Users / Staff / Companies / Misc
| Endpoint | Methods |
|---|---|
| `/api/users` | GET, POST |
| `/api/users/[id]` | PATCH, DELETE |
| `/api/login-history` | GET |
| `/api/companies` | GET, POST |
| `/api/companies/[id]` | GET, PATCH |
| `/api/notifications` | GET, PATCH |
| `/api/activities` | GET |
| `/api/whatsapp/log` | POST |

---

## 25. Data Models — All 14 Collections

| # | Model | Collection | Purpose |
|---|---|---|---|
| 1 | `User` | `users` | Logins, roles, permissions, reset tokens |
| 2 | `Company` | `companies` | Tenants + edit audit history |
| 3 | `Client` | `clients` | Client master (core entity) |
| 4 | `Compliance` | `compliances` | Regulatory filings, recurring calendar |
| 5 | `Task` | `tasks` | Staff work items |
| 6 | `Invoice` | `invoices` | Billing with GST line items |
| 7 | `Payment` | `payments` | Payments against invoices |
| 8 | `Document` | `documents` | Client file uploads (Cloudinary/local) |
| 9 | `Expense` | `expenses` | Firm operating expenses |
| 10 | `Notification` | `notifications` | In-app notifications |
| 11 | `Activity` | `activities` | Generic audit/action log |
| 12 | `LoginHistory` | `loginhistories` | Login audit trail |
| 13 | `Counter` | `counters` | Atomic sequences (invoice #, client code) |

(Full field lists documented in sections 6.10, 7.8, 8.6, 9.8, 10.6, 11.3, 12.5, 12.6, 13.4, 15.3, 16 above.)

---

## 26. Cross-Cutting Feature Summary

### Data safety
- **Soft deletes** (`isDeleted`) on Client, Task, Invoice, Document; staff deactivation (`isActive`) on User; hard deletes only for Compliance and Expense.
- PAN / GSTIN / Aadhaar **duplicate checks** on create/update and CSV import.
- Aadhaar **masked** in UI (`XXXX XXXX 1234`).
- **Path-traversal guards** on local file storage; extension allowlist + 10 MB upload cap; file bytes **proxied** through own API.
- Anti-enumeration message on forgot-password; constant-time password compare; SHA-256 reset-token storage with TTL.

### Concurrency & correctness
- Atomic counters for `INV-YYYY-NNN` and `XX-NNNN` (unique indexes as backstop).
- Partial unique index on auto-generated recurring compliance (race-proof).
- Single-flight + 10 s cooldown on all background sweeps.
- Invoice outstanding floored at 0; status derived server-side; payment history recomputed from full payment set.

### Visibility & reporting
- Financials gated by `canViewFinancials` (admin always; staff opt-in per user).
- CSV + Excel export everywhere with full-dataset pagination walk.
- 6-month revenue chart, expense period tabs, activity feed, deadline calendar.
- Dashboard counts derive OVERDUE dynamically rather than trusting stored status.

### Integration readiness
- WhatsApp click-to-chat (`wa.me`) with 7 message templates + open-event audit logging (content never stored).
- SMTP password-reset emails (branded HTML).
- Cloudinary cloud storage with local fallback.
- Firebase Auth + Analytics; demo-JWT fallback path.
- Multi-tenant isolation on every query path.

### Notable behaviors / known quirks
- Demo mode effectively disabled in code (`isDemoMode()` hard-coded `false`) though `/api/auth/demo` + login banner exist.
- Bootstrap superAdmin auto-created from `ADMIN_EMAIL`/`ADMIN_PASSWORD` at DB connect.
- Cloudinary deletion uses `resource_type: "image"` for all files (raw uploads may need `"raw"`).
- `firebaseAdmin.js` functions are stubs returning `null`.
- Firm name branding centralized in `lib/config.js` (`FIRM_NAME`).
