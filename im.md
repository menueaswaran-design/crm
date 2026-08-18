CA CRM feature audit
Gap analysis for CA Office CRM vs a production Chartered Accountant practice system. Source: current codebase inventory.

~70%
Ops MVP coverage
9
Core modules
6
P0 gaps
Partial
Invoicing readiness
Bottom line
Strong internal ops MVP (clients, compliance, tasks, docs, basic billing). Not yet production-ready for GST invoicing or practice reporting — PDF invoices, tax breakup, reminders, and reports are the highest gaps.
Module coverage
Module	Status	What you have
Clients	
CRUD, Excel import, PAN/GSTIN, assign staff
Compliance	
GST/ITR/TDS/ROC tracker + overdue
Tasks	
Assign, priority, start/complete
Documents	
Upload, categories, download
Invoices	
Create + payments; no PDF/GST split
Dashboard	
KPIs, revenue chart, upcoming
Staff / Auth	
Admin/staff roles, Firebase login
Reports	
No reports/export module
Reminders	
Email/WhatsApp not built
Invoices — pending / manage check
Direct answer: pending invoices and payment management exist. PDF, full GST breakup, reminders, and export do not.

Capability	Status	Detail
Pending invoices list	
Status filter: PENDING
Partial payments	
Record payment + PARTIAL status
Overdue invoices	
Status exists; list not auto-refreshed
Payment recording	
Cash/UPI/Bank/Cheque + reference
GST amount	
Flat GST % only — no CGST/SGST/IGST
Invoice numbering	
INV-YYYY-NNN auto counter
PDF / print	
Download icon is decorative only
Edit invoice (UI)	
API exists; table has no Edit
Payment reminders	
No email/SMS/WhatsApp
Export / GSTR sales register	
No Excel/CSV reports
Missing features by priority
Ship before daily CA use
GST tax invoice PDF + print

Cannot issue formal invoices to clients

Firm profile on invoice (name, GSTIN, address, bank)

Required for legal GST invoices

CGST / SGST / IGST + HSN/SAC

Flat GST % is not India GST-ready

Payment & compliance reminders

Day-to-day follow-ups still manual outside CRM

Reports + Excel export

Outstanding ageing, GST collected, staff workload

Recurring compliance calendar

Manual GSTR-3B every month does not scale

Expected in production
Wire invoice Edit in UI

Form/API exist but unreachable from table

Invoice detail + payment history page

Payments stored but not shown

Auto-refresh invoice OVERDUE on list

Stale status until payment/edit

Credit note / void invoice

Only soft-delete today

Filing fields (ARN, challan, ack)

Compliance is checklist-only

Fix staff dashboard task counts

Wrong field assignedStaff vs assignedTo

Nice improvements
• Recurring / retainer invoices

• Link documents ↔ compliance items

• Task comments / time tracking

• Client portal or share links

• Due-date rules engine (e.g. GSTR-3B = 20th)

Already working well
Practice ops
Client DB + Excel import

Compliance tracker (GST / ITR / TDS / ROC)

Tasks with overdue derivation

Document vault + download

Billing basics
Create invoice + line items

Pending / Partial / Paid filters

Record payments (multi-method)

Dashboard revenue & outstanding

Suggested build order
1) Invoice PDF + firm profile → 2) CGST/SGST/IGST → 3) Overdue refresh + Edit UI → 4) Outstanding & GST Excel reports → 5) Email reminders → 6) Recurring compliance calendar.
Audit based on current app routes, models, and APIs in the crm workspace.