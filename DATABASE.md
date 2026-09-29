# Database Schema & Entity Documentation

The database schema is defined in Drizzle ORM using PostgreSQL dialect in `src/server/db/schema.ts` and managed with automated migrations.

---

## 1. Entity Dictionary & Tables

### Core Users & Roles
- **`users`**: UUID primary key, email, salted password hash (bcrypt), full name, failed login counter, lockout timestamp, verification flag, status (`ACTIVE`, `SUSPENDED`).
- **`roles`**: System roles (`SUPER_ADMIN`, `LIBRARIAN`, `ASSISTANT_LIBRARIAN`, `STAFF`, `MEMBER`).
- **`permissions`**: Granular capability codes (`BOOK_CREATE`, `BORROW_RETURN`, `FINE_WAIVE`, `REPORT_VIEW`, etc.).
- **`role_permissions`**: Many-to-many junction mapping roles to granular permissions.
- **`user_roles`**: Many-to-many junction assigning roles to users.
- **`sessions`**: Server-tracked active sessions with token, IP address, user agent, and expiration.

### Member Profiles
- **`members`**: Extends user with university credentials (`libraryCardNumber`, `universityId`, `department`, `course`, `yearOfStudy`, `membershipStatus`, `maxBorrowLimit`).

### Bibliographic Catalog
- **`books`**: Work entity storing ISBN, title, subtitle, synopsis, publication year, edition, pages, cover image URL, publisher ID, language ID.
- **`authors`**: Author biographical profile, birth year, website, avatar URL.
- **`book_authors`**: Junction table mapping books to authors with `is_primary` flag.
- **`categories`**: Hierarchical category tree with slugs.
- **`book_categories`**: Junction table mapping books to categories.
- **`publishers`**: Publisher corporate details and contact information.
- **`languages`**: ISO language codes and names.

### Physical Inventory & Multi-Tier Shelving
- **`libraries`**: Library branch institution details.
- **`buildings`**: Campus building containing library facilities.
- **`floors`**: Specific floor level.
- **`sections`**: Dedicated subject sections (e.g., Computer Science).
- **`rooms`**: Specific study or reading rooms.
- **`racks`**: Physical book racks / shelving units.
- **`shelves`**: Exact physical shelf row with capacity constraints.
- **`book_copies`**: Physical volume entity with unique barcode, accession number, generated QR code, condition (`NEW`, `GOOD`, `FAIR`, `POOR`, `DAMAGED`), current status (`AVAILABLE`, `BORROWED`, `RESERVED`, `LOST`, `DAMAGED`, `MAINTENANCE`), replacement price, and shelf FK.
- **`inventory_transactions`**: Audit log of physical copy status changes, damage inspection notes, and shelf relocations.

### Circulation & Operations
- **`loans`**: Loan checkout record linking member, copy, and book with `issuedBy`, `issuedAt`, `dueAt`, `returnedAt`, `renewedCount`, and status (`ACTIVE`, `RETURNED`, `OVERDUE`, `LOST`).
- **`reservations`**: FIFO waitlist queue linking member to book with `queuePosition`, status (`PENDING`, `AVAILABLE_FOR_PICKUP`, `FULFILLED`, `EXPIRED`, `CANCELLED`), assigned copy, and holding window timestamp.
- **`fines`**: Late fee or damage penalty record linking member and loan with amount, paid amount, status (`PENDING`, `PARTIALLY_PAID`, `PAID`, `WAIVED`), waiver reason, and waiver actor FK.
- **`payments`**: Verified financial ledger record with provider (`DEV_SANDBOX`, `STRIPE`, `RAZORPAY`), provider transaction ID, payment method, amount, and timestamp.
- **`notifications`**: Member in-app alert inbox with read state and action deep links.
- **`book_reviews`**: Verified borrower ratings (1-5 stars) and qualitative reviews.
- **`library_settings`**: Key-value table storing dynamic library policies (`LOAN_PERIOD_DAYS`, `DAILY_FINE_RATE`, etc.).
- **`audit_logs`**: Append-only log of sensitive actions across all modules.

---

## 2. Indexes & Performance Optimization

- **B-Tree Indexes**: Placed on all foreign keys (`loans.member_id`, `loans.copy_id`, `book_copies.book_id`, `reservations.book_id`).
- **Unique Indexes**: Placed on `users.email`, `members.library_card_number`, `books.isbn`, `book_copies.barcode`, `book_copies.accession_number`.
- **Compound Indexes**: `idx_reservations_queue` on `(book_id, queue_position)` for fast waitlist FIFO resolution.
- **Date Indexes**: Placed on `loans.due_at` and `loans.issued_at` for high-speed overdue scans.
