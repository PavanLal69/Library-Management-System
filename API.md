# REST API Documentation & Contract Reference

All API Route Handlers adhere to a standardized, deterministic response schema:

### Success Format:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { ... }
}
```

### Failure Format:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "BOOK_NOT_AVAILABLE",
    "message": "No physical copies currently available on shelf.",
    "details": []
  }
}
```

---

## Endpoint Directory

### Authentication & Sessions
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new student/public member | No |
| `POST` | `/api/auth/login` | Authenticate and issue secure cookie | No |
| `POST` | `/api/auth/logout` | Revoke session and delete cookie | Yes |
| `GET` | `/api/auth/me` | Return active user context and permissions | Yes |

### Books & Catalog
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/books` | Search catalog with filters & pagination | No |
| `POST` | `/api/books` | Create new catalog entry | `BOOK_CREATE` |
| `GET` | `/api/books/[id]` | Full book details with shelf locations | No |
| `PUT` | `/api/books/[id]` | Update book metadata | `BOOK_UPDATE` |
| `POST` | `/api/book-copies` | Create physical copy with barcode/QR | `INVENTORY_MANAGE` |
| `GET` | `/api/book-copies/[barcode]` | Lookup physical item by barcode | No |
| `GET` | `/api/shelves` | List all campus shelf locations | No |

### Circulation & Loans
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/loans/issue` | Atomic checkout: member card + copy barcode | `BORROW_CREATE` |
| `POST` | `/api/loans/return` | Return copy, compute overdue fine & advance queue | `BORROW_RETURN` |
| `POST` | `/api/loans/renew` | Extend loan due date (policy enforced) | `BORROW_RENEW` |
| `GET` | `/api/loans` | View active and historical loans | Yes |

### Reservations & Waitlist
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reservations` | Reserve book or join waitlist queue | Member |
| `GET` | `/api/reservations` | View user reservations or circulation queue | Yes |
| `POST` | `/api/reservations/[id]/cancel` | Cancel hold request | Yes |

### Fines & Payments
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/fines` | View outstanding and paid fines | Member |
| `POST` | `/api/fines/[id]/waive` | Waive fine with justification | `FINE_WAIVE` |
| `POST` | `/api/payments/intent` | Initialize payment intent | Member |
| `POST` | `/api/payments/verify` | Verify and settle fine server-side | Member |
| `GET` | `/api/payments/history` | Financial payment audit ledger | Yes |

### Inventory, Analytics & Administration
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/inventory/stats` | Physical stock breakdown by status | `INVENTORY_MANAGE` |
| `GET` | `/api/inventory/export` | Export inventory as CSV download | `INVENTORY_MANAGE` |
| `POST` | `/api/inventory/transfer` | Relocate physical copy to new shelf | `INVENTORY_MANAGE` |
| `POST` | `/api/inventory/damage` | Report damage or loss with fee assessment | `INVENTORY_MANAGE` |
| `GET` | `/api/analytics/circulation`| 14-day trends, top borrowed, category breakdown | `REPORT_VIEW` |
| `GET` | `/api/recommendations` | Deterministic book suggestions | No |
| `GET` | `/api/admin/audit` | View immutable audit stream | `AUDIT_VIEW` |
| `GET` | `/api/admin/settings` | Get dynamic policy settings | `SYSTEM_SETTINGS` |
| `PUT` | `/api/admin/settings` | Update dynamic policy settings | `SYSTEM_SETTINGS` |
| `GET` | `/api/health` | Service uptime and status | No |
| `GET` | `/api/health/database` | Database connectivity latency check | No |
| `GET` | `/api/health/redis` | Cache / queue connectivity check | No |
