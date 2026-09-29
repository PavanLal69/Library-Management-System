# Metropolitan Library Management System (LMS)
### 2026 Enterprise Full-Stack University & Public Library Platform

A production-grade, secure, multi-tier Library Management System built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Drizzle ORM**, and **PostgreSQL**. Designed with strict transaction boundaries, granular role-based access control (RBAC), multi-level physical shelf tracking, waitlist queue machines, automated overdue fine calculation, and polymorphic payment processing.

---

## ⚡ Quick Start

### 1. Requirements
- Node.js v20+ or v24+
- npm v10+

### 2. Zero-Config Run (Instant Local Development)
The project comes pre-configured with a dual-mode database engine. If no external `DATABASE_URL` is configured, it automatically initializes and runs on embedded persistent PostgreSQL (PGLite) in `.data/lms-db`:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Seed database with 100+ books, 200+ copies, 30+ authors, and demo users
npm run seed

# 3. Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Pre-Seeded Demo Credentials

The seed script initializes three accounts for testing the distinct portals and role boundaries:

| Role | Email | Password | Primary Portal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@example.com` | `Password123!` | `/admin` |
| **Librarian** | `librarian@example.com` | `Password123!` | `/librarian` |
| **Student Member** | `member@example.com` | `Password123!` | `/member` |

*Note: The `/login` page includes **1-Click Quick Demo Sign-in buttons** to switch personas instantly during testing.*

---

## 🧪 Automated Testing

Execute the complete 10-step transactional lifecycle test suite:

```bash
npm run test
```

This verifies:
1. Member enrollment & card generation
2. Session authentication & token security
3. Catalog search & fuzzy matching
4. Physical shelf location resolution
5. Waitlist queue positioning
6. ACID transactional checkout
7. Overdue calculation and fine assessment
8. Barcode return reconciliation & queue promotion
9. Server-side payment settlement
10. Immutable append-only audit stream verification

---

## 🚀 Key Modules & Architecture

- **Role-Based Access Control (RBAC)**: 5 roles (`SUPER_ADMIN`, `LIBRARIAN`, `ASSISTANT_LIBRARIAN`, `STAFF`, `MEMBER`) enforced server-side via granular permission codes (`BOOK_CREATE`, `BORROW_RETURN`, `FINE_WAIVE`, etc.).
- **Physical Item Tracking**: Clear separation between `Book` (bibliographic metadata) and `BookCopy` (physical items with Barcode, QR Code, accession number, condition, and shelf location).
- **Physical Shelving Hierarchy**: `Library → Building → Floor → Section → Room → Rack → Shelf`.
- **Circulation Machine**: Atomic transactions for book issue, returns, and renewals preventing race conditions.
- **Waitlist FIFO Queue**: Automated queue progression when books are returned, holding reservations for a configurable pickup window (e.g., 48 hours).
- **Payment Abstraction**: Polymorphic `PaymentProvider` interface supporting Stripe, Razorpay, and a zero-dependency Developer Sandbox provider.
- **Real-Time Barcode & QR Generation**: Generates standard Code128 barcodes and verified QR code tags for every physical volume.
- **Analytics & Observability**: Interactive Recharts visualizations, structured logging, health checks (`/api/health`), and append-only audit tracking.

---

## 📚 Technical Documentation Sitemap

- [ARCHITECTURE.md](file:///./ARCHITECTURE.md) - System architecture, request flow, and state machines.
- [DATABASE.md](file:///./DATABASE.md) - Relational schema, tables, foreign keys, and indexes.
- [API.md](file:///./API.md) - Complete REST API specification with response payloads.
- [SECURITY.md](file:///./SECURITY.md) - Authentication, cookie security, authorization, and rate limiting.
- [DEPLOYMENT.md](file:///./DEPLOYMENT.md) - Docker, Vercel, PostgreSQL, and Redis production deployment guide.
- [CONTRIBUTING.md](file:///./CONTRIBUTING.md) - Development workflow and engineering standards.
