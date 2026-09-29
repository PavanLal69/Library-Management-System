# Security Architecture & Best Practices

## 1. Authentication & Session Security
- **Salted Password Hashing**: Passwords hashed with bcrypt and 10 salt rounds. Plaintext passwords are never logged, transmitted in responses, or retained in memory longer than the authentication request.
- **HTTP-Only Cookies**: Authentication session tokens are stored in `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies (`lms_auth_token`) to prevent cross-site scripting (XSS) extraction.
- **Account Lockout & Brute-Force Defense**: Failed login attempts increment `failed_login_attempts`. On 5 consecutive failed attempts, the account is locked for 15 minutes (`lockout_until`).
- **Session Revocation**: Logging out deletes the session record from the database, rendering previously issued tokens immediately invalid.

## 2. Granular Role-Based Access Control (RBAC)
- All mutations and sensitive queries execute server-side authorization checks using `requireAuth(permissionCode)`.
- Roles (`SUPER_ADMIN`, `LIBRARIAN`, `ASSISTANT_LIBRARIAN`, `STAFF`, `MEMBER`) have explicitly mapped capability sets.
- Client-side navigation guards are strictly cosmetic; every API route enforces policy compliance.

## 3. Data Integrity & Concurrency Controls
- **ACID Transactions**: Critical circulation operations (book checkout, return, renewal, and fine waivers) execute within database transaction boundaries.
- **Race Condition Prevention**: Prevents two librarians from issuing the exact same physical copy simultaneously.

## 4. Financial & Payment Safety
- **No Client-Reported Trust**: Payment status received from browser callbacks is never trusted. Payments must be verified server-side against payment provider APIs (`PaymentProvider.verifyPayment`) before fine clearance.
- **Immutable Financial Ledger**: Payments are recorded into an append-only `payments` table linking to the member and fine.

## 5. Input Validation & Defense-in-Depth
- All incoming payloads are validated using strict Zod schemas with sanitization.
- Database queries use Drizzle ORM parameterized SQL preventing SQL injection.
- System activity is recorded into an append-only `audit_logs` table with actor, IP address, user agent, and timestamp.
