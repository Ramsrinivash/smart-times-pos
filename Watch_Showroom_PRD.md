# Product Requirements Document (PRD)
## Watch Showroom Management System

**Version:** 1.0 (Final)
**Date:** July 09, 2026
**Scope:** Watch Showroom Management System

---

## 1. Project Overview

A web-based internal management system for a watch showroom, covering the full retail lifecycle — purchasing stock from suppliers, managing inventory with individual piece-level tracking, selling to customers, generating GST and non-GST invoices, managing exchanges and returns, running a customer reward points program, and handling after-sales repair, service, and warranty.

**Tech Stack**
- **Backend:** PHP (REST API), JWT-based authentication
- **Frontend:** React JS — single responsive web application, works on desktop browsers (counter PC) as well as mobile browsers
- **Database:** MySQL
- **Hosting:** To be procured based on requirements and budget

---

## 2. Goals
- Digitize watch showroom operations, replacing manual registers and spreadsheets
- Provide a live dashboard for daily visibility without needing to open separate reports
- Track every watch individually using a unique Watch ID (the identification number already assigned to the item)
- Accurately track the actual purchase cost of each unit, even when the same model is procured at different discount rates on different dates
- Support both GST and non-GST billing
- Handle watch exchanges cleanly, without disturbing already-issued invoices, while keeping inventory and cost records accurate
- Reward repeat customers through a points-based loyalty program
- Provide real-time reports, exportable in Excel, CSV, and PDF formats
- Allow simple, staff-initiated sharing of invoices via Email and WhatsApp

---

## 3. User Roles

| Role | Access |
|---|---|
| **Admin/Owner** | Full access — all modules, reports, settings, and user management |
| **Store Manager** | Inventory, purchase, sales, exchanges, reports (no user management/settings) |
| **Sales Staff** | Sales, invoice, exchange, customer lookup, repair intake, payments, expenses, and reports. Views selling price only — cost price and profit margin are restricted to Admin and Manager |

Expected staff strength: 3–7 user logins.

---

## 4. Core Modules

### 4.1 Dashboard (Home Screen)
The landing page after login, giving the owner/manager a live, at-a-glance summary:
- Today's sales total and number of invoices
- Low stock alerts by model
- Repair/service jobs due today, overdue, and ready for pickup
- Outstanding customer dues
- Supplier payments due
- Quick action shortcuts: New Sale, New Purchase Entry, New Service Job, New Exchange
- Role-based view: Admin/Manager see the full dashboard including profit snapshot; Sales Staff see a simplified view without cost/profit figures

### 4.2 Inventory Management
- Add/edit watch products: brand, model, category, gender, strap type, dial color, movement type
- Unique Watch ID / Serial Number field per individual piece, entered manually by staff
- **Watch images** — multiple photos per watch (front, back, box/packaging) uploaded at the time of adding inventory, shown across inventory listing, sales screen, and invoices where relevant
- Unit-level cost price tracking (see 4.4)
- Stock listing by brand/category/model, with low-stock alerts
- Stock adjustment log for damage, loss, internal use, and display transfers

### 4.3 Search (Sales & Service)
A persistent search box available on both the Sales screen and the Service/Repair screen:
- **Sales search:** by customer name, phone number, invoice number, or Watch ID — to quickly pull up past invoices or check item availability while billing
- **Service search:** by customer name, phone number, Watch ID, or job status — to quickly locate an ongoing or past repair job

### 4.4 Purchase Management — Cost-Price-Per-Unit Tracking
Addresses the requirement where the same model may be purchased at different discount rates across different dates (e.g., 10% off in one purchase, 20% off in a later purchase).

- Every purchase entry creates individual inventory units, each carrying its own Watch ID, actual cost price (post-discount), purchase date, supplier, and purchase batch/PO reference
- Cost is stored at the unit level, not the model level — two units of the same model can carry different cost prices
- Selling any unit automatically applies that unit's actual cost for profit calculation, avoiding cost averaging
- Purchase ledger displays: Model, Watch ID, Purchase Date, Supplier, MRP, Discount %, Actual Cost, and Status (In Stock/Sold)

### 4.5 Sales Management
- Billing screen: select customer, enter Watch ID/Serial Number to add an item
- Discount application at item level or bill level (flat or percentage)
- Payment modes recorded manually: Cash, Card, UPI, Bank Transfer, Part-payment
- Sales return handling
- Salesperson-wise sales tracking

### 4.6 Invoice/Billing
- Toggle at billing time between GST Invoice and Non-GST (plain) Invoice
  - GST: HSN code, CGST/SGST/IGST breakup, dedicated invoice numbering series
  - Non-GST: simplified bill format, separate numbering series
- Automatic invoice numbering, financial-year-wise, with separate series for GST and non-GST
- PDF generation with a manual Share button:
  - Download PDF for saving or printing
  - Share via Email — opens a pre-filled email with the PDF attached
  - Share via WhatsApp — opens WhatsApp with the PDF for the staff to send
- Duplicate invoice reprint

### 4.7 Exchange Management
Handles the case where a customer wants to exchange a previously purchased watch for a different one, days or weeks after the original sale.

- Exchange request is created by searching and referencing the **original invoice** (by invoice number, customer, or Watch ID) — the original invoice itself is never edited
- Staff selects the watch being returned (system pulls its original sale price) and the new watch the customer wants (system pulls its current selling price)
- System auto-calculates the price difference:
  - New watch costs more → customer pays the difference; a new invoice is generated for that amount
  - New watch costs less → a credit note is generated for the refund/adjustment
  - Same price → straight exchange, no additional payment
- **GST-enabled:** generates a Credit Note against the returned item plus a new Tax Invoice for the replacement item (correct legal treatment; the original invoice is not altered)
- **Non-GST:** generates a simplified Exchange Note showing the old watch, new watch, and net payable/refundable amount
- The returned watch is automatically added back to inventory, tagged as "Exchanged Return," and flagged for Admin/Manager review before being marked available for resale (or sent for servicing/refurbishment first)
- Original cost history of the returned watch is preserved for accurate profit calculation if it is resold
- Configurable exchange window in Settings (e.g., 7 days), with a flag if a request falls outside the allowed period
- Full exchange history is visible on the customer profile and linked to the original invoice record

### 4.8 Reward Points / Loyalty Program
- Customers earn reward points automatically on each purchase, based on a configurable earn rate (e.g., points per ₹100 spent), set in Settings
- Points are credited to the customer's profile and visible in their purchase history
- At billing, staff can apply **Redeem Points** to convert available points into a discount, based on a configurable redemption rate
- Points ledger per customer: earned, redeemed, and running balance
- Optional points expiry period, configurable in Settings
- Points are automatically reversed/adjusted if the related sale is returned or exchanged

### 4.9 Customer Management (CRM)
- Customer profile: name, phone, alternate contact number, email, address, birthday/anniversary
- Optional ID proof reference for high-value sales or warranty registration
- Customer tagging (e.g., VIP, Regular, Walk-in) and free-text notes/remarks
- Purchase history per customer, including exchanges
- Warranty card linked to customer and Watch ID
- Reward points balance and history
- Outstanding dues tracking for credit sales

### 4.10 Repair & Service / Warranty Management
- Service job intake: customer, Watch ID, issue reported, estimated cost, expected delivery date
- **Job Card generation** — when a customer hands over a watch for service/repair, the system generates a printable/PDF Job Card at the time of intake, containing:
  - Unique Job Card Number (separate numbering series from invoices)
  - Customer name and contact number
  - Watch details: brand, model, Watch ID (if already known/registered) or manually noted if it's an external watch not purchased from the showroom
  - Condition of the watch at drop-off (e.g., scratches, missing strap, existing damage) — noted to avoid future disputes
  - Issue reported by the customer
  - Estimated repair cost and expected delivery date
  - Terms and conditions (standard shop disclaimer text, configurable in Settings)
  - Two copies: one for the customer (proof of drop-off/token), one retained in the system as the shop's record
- Job Card status tracking, aligned with the job status flow: Received → In Repair → Ready → Delivered
- Job Card can be reprinted/re-shared (Email) if the customer misplaces their copy
- Automatic in-warranty/out-of-warranty check based on sale date and warranty period
- Separate service charge billing from sales invoices, raised once the job is marked "Ready"/"Delivered"
- Email notification when the watch is ready for pickup
- Searchable via the Search module (4.3) — by customer, Watch ID, Job Card Number, or job status

### 4.11 User & Role Management
- Staff login creation and role assignment
- Activity log tracking all create/edit/delete actions across the system

### 4.12 Reports & Export
All reports exportable in Excel, CSV, and PDF (ledger-style) formats:
- Daily/monthly sales report
- Stock valuation report, based on actual unit-level cost
- Purchase ledger (model, cost, discount, supplier, date)
- Exchange report (original item, replacement item, net amount)
- Reward points report (issued, redeemed, expired)
- Profit margin report (Admin/Manager only)
- Pending service jobs report
- Supplier due/payment report
- GST report for filing (GST invoices only)

### 4.13 Notifications
Email notifications for:
- Service-ready alerts
- Warranty expiry reminders
- Optional auto-email of invoice copy on sale

### 4.14 Settings/Configuration
- Showroom details, GST number, invoice format and logo
- Tax rate configuration
- GST/Non-GST invoice numbering series setup
- Exchange window (number of days) configuration
- Reward points earn rate, redemption rate, and expiry configuration
- Job Card numbering series and terms & conditions text
- Data backup and export

---

## 5. Suggested Development Phases

**Phase 1 (MVP):** Dashboard, Inventory (with images and unit-level cost tracking), Search, Purchase, Sales, GST + Non-GST Invoice, Customer profile, User roles, authentication
**Phase 2:** Exchange Management, Repair/Service & Warranty module, Reports & Export (Excel/CSV/PDF), Email notifications
**Phase 3:** Reward Points/Loyalty Program, Settings refinement, backup automation, activity log enhancements

---

## 6. Non-Functional Requirements
- Responsive React JS web application, usable on desktop counter PC and mobile browsers from a single codebase
- Role-based access control (RBAC)
- Daily automated database backup
- JWT-based secure authentication for the PHP REST API
- GST and Non-GST invoice formats supported
- Export support in Excel (.xlsx), CSV, and PDF for all reports
