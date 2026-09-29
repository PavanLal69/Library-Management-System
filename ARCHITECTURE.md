# System Architecture & Technical Design

## 1. High-Level Architecture Overview

Metropolitan LMS follows a layered, domain-driven full-stack architecture inside Next.js 16 (App Router):

```
┌────────────────────────────────────────────────────────────┐
│                    Client Layer                            │
│  Next.js App Router (React 19, Tailwind CSS, Lucide Icons) │
│  - Member Portal (/member)                                 │
│  - Librarian Console (/librarian)                          │
│  - Admin Console (/admin)                                  │
│  - Public Catalog (/ & /books/[id])                        │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTPS / JSON
┌─────────────────────────────▼──────────────────────────────┐
│                    API Gateway & Routing                   │
│  Route Handlers (/api/*) + Zod Input Validation             │
│  Session & RBAC Middleware (`requireAuth`, `hasPermission`) │
│  Standardized Response Wrapper (`apiSuccess`, `apiError`)  │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                    Domain Service Layer                    │
│  AuthService      - Registration, Lockout, Session tokens │
│  BookService      - Catalog search, multi-faceted filters │
│  BookCopyService  - Physical tracking, Barcode/QR gen     │
│  LoanService      - Issue, return, overdue fines, renewal │
│  ReservationService - FIFO waitlist queue & expiration     │
│  FineService      - Overdue assessment & waivers          │
│  PaymentService   - Intent creation & payment settlement  │
│  InventoryService - Shelf transfers, damage reports, CSV  │
│  AnalyticsService - Circulation trends & Recharts stats    │
│  AuditService     - Append-only event logging             │
└─────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│                Database & Data Access Layer                │
│  Drizzle ORM (PostgreSQL Dialect)                          │
│  Connection Pool (node-postgres / PGLite dual engine)      │
│  33 Normalized Relational Tables + Indexes + Constraints  │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Circulation Workflow State Machines

### A. Book Checkout (Issue Flow)
```mermaid
graph TD
    A[Librarian Scans Member ID] --> B{Account Active?}
    B -- No --> C[Block: Account Suspended]
    B -- Yes --> D{Loans < Max Limit?}
    D -- No --> E[Block: Limit Reached]
    D -- Yes --> F{Unpaid Fines <= $10?}
    F -- No --> G[Block: Blocking Fine Balance]
    F -- Yes --> H[Scan Book Copy Barcode]
    H --> I{Copy Available or Reserved for Member?}
    I -- No --> J[Block: Unavailable / On Hold for Other]
    I -- Yes --> K[Atomic DB Transaction Start]
    K --> L[Insert Active Loan Record]
    L --> M[Update Copy Status to BORROWED]
    M --> N[Mark Pickup Reservation FULFILLED]
    N --> O[Commit Transaction]
    O --> P[Log Audit Event: BORROW_CREATE]
    P --> Q[Dispatch Notification: BOOK_ISSUED]
```

### B. Book Return Flow
```mermaid
graph TD
    A[Scan Book Copy Barcode] --> B[Locate Active Loan Record]
    B --> C{Current Date > Due Date?}
    C -- Yes --> D[Calculate Overdue Days & Accrue Fine]
    C -- No --> E[Fine = $0.00]
    D --> F[Atomic DB Transaction Start]
    E --> F
    F --> G[Update Loan: RETURNED + Return Date]
    G --> H{Any PENDING Waitlist Reservations?}
    H -- Yes --> I[Promote Queue #1 to AVAILABLE_FOR_PICKUP]
    I --> J[Set Copy to RESERVED + 48h Window]
    J --> K[Dispatch Notification: RESERVATION_AVAILABLE]
    H -- No --> L[Set Copy to AVAILABLE on Shelf]
    K --> M[Commit Transaction]
    L --> M
    M --> N[Log Audit Event: BORROW_RETURN]
```

---

## 3. Payment Abstraction Layer

The application implements a decoupled payment architecture through the polymorphic `PaymentProvider` interface:

```typescript
export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;
  processRefund(transactionId: string, amount?: number): Promise<boolean>;
}
```

### Available Adapters:
1. **`DevSandboxProvider`**: Zero-dependency local verification provider for development and testing. Enables testing the full payment flow without requiring live Stripe/Razorpay keys.
2. **`StripeProvider`**: Stripe PaymentIntents API with webhook validation support.
3. **`RazorpayProvider`**: Razorpay Orders and signature verification API.

The active provider is resolved dynamically via `PaymentFactory.getProvider()`.
