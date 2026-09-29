import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// 1. Core Users & Authentication
// ---------------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: text('avatar_url'),
    isEmailVerified: boolean('is_email_verified').default(false).notNull(),
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, SUSPENDED, PENDING_VERIFICATION
    failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
    lockoutUntil: timestamp('lockout_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_status').on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 2. Roles & Granular Permissions (RBAC)
// ---------------------------------------------------------------------------
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(), // SUPER_ADMIN, LIBRARIAN, ASSISTANT_LIBRARIAN, STAFF, MEMBER
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).unique().notNull(),
  description: text('description'),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: text('token').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_sessions_token').on(table.token),
    index('idx_sessions_user').on(table.userId),
  ]
);

// ---------------------------------------------------------------------------
// 3. Member Profiles
// ---------------------------------------------------------------------------
export const members = pgTable(
  'members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique()
      .notNull(),
    libraryCardNumber: varchar('library_card_number', { length: 50 }).unique().notNull(),
    universityId: varchar('university_id', { length: 50 }).unique(),
    department: varchar('department', { length: 100 }),
    course: varchar('course', { length: 100 }),
    yearOfStudy: integer('year_of_study'),
    membershipType: varchar('membership_type', { length: 30 }).default('STUDENT').notNull(), // STUDENT, FACULTY, RESEARCHER, PUBLIC
    membershipStatus: varchar('membership_status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, SUSPENDED, EXPIRED
    maxBorrowLimit: integer('max_borrow_limit').default(5).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_members_card').on(table.libraryCardNumber),
    index('idx_members_university_id').on(table.universityId),
    index('idx_members_status').on(table.membershipStatus),
  ]
);

// ---------------------------------------------------------------------------
// 4. Physical Library Shelving Hierarchy
// ---------------------------------------------------------------------------
export const libraries = pgTable('libraries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 150 }),
});

export const buildings = pgTable('buildings', {
  id: uuid('id').defaultRandom().primaryKey(),
  libraryId: uuid('library_id')
    .references(() => libraries.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
});

export const floors = pgTable('floors', {
  id: uuid('id').defaultRandom().primaryKey(),
  buildingId: uuid('building_id')
    .references(() => buildings.id, { onDelete: 'cascade' })
    .notNull(),
  floorNumber: integer('floor_number').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const sections = pgTable('sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  floorId: uuid('floor_id')
    .references(() => floors.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  sectionId: uuid('section_id')
    .references(() => sections.id, { onDelete: 'cascade' })
    .notNull(),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }),
});

export const racks = pgTable('racks', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id')
    .references(() => rooms.id, { onDelete: 'cascade' })
    .notNull(),
  rackNumber: varchar('rack_number', { length: 50 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
});

export const shelves = pgTable(
  'shelves',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rackId: uuid('rack_id')
      .references(() => racks.id, { onDelete: 'cascade' })
      .notNull(),
    shelfNumber: varchar('shelf_number', { length: 50 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    capacity: integer('capacity').default(50).notNull(),
  },
  (table) => [index('idx_shelves_rack').on(table.rackId)]
);

// ---------------------------------------------------------------------------
// 5. Bibliographic Metadata (Authors, Publishers, Categories, Genres)
// ---------------------------------------------------------------------------
export const authors = pgTable(
  'authors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    biography: text('biography'),
    birthYear: integer('birth_year'),
    website: text('website'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_authors_name').on(table.name)]
);

export const publishers = pgTable(
  'publishers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    address: text('address'),
    website: text('website'),
    contactEmail: varchar('contact_email', { length: 150 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_publishers_name').on(table.name)]
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).unique().notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
  },
  (table) => [index('idx_categories_slug').on(table.slug)]
);

export const genres = pgTable(
  'genres',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).unique().notNull(),
    description: text('description'),
  },
  (table) => [index('idx_genres_slug').on(table.slug)]
);

export const languages = pgTable('languages', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 10 }).unique().notNull(),
  name: varchar('name', { length: 50 }).notNull(),
});

// ---------------------------------------------------------------------------
// 6. Books & Physical Copies
// ---------------------------------------------------------------------------
export const books = pgTable(
  'books',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    isbn: varchar('isbn', { length: 30 }).unique().notNull(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    publisherId: uuid('publisher_id').references(() => publishers.id, { onDelete: 'set null' }),
    languageId: uuid('language_id').references(() => languages.id, { onDelete: 'set null' }),
    publicationYear: integer('publication_year'),
    edition: varchar('edition', { length: 50 }),
    pages: integer('pages'),
    coverImageUrl: text('cover_image_url'),
    searchVector: text('search_vector'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_books_isbn').on(table.isbn),
    index('idx_books_title').on(table.title),
    index('idx_books_year').on(table.publicationYear),
  ]
);

export const bookAuthors = pgTable(
  'book_authors',
  {
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    authorId: uuid('author_id')
      .references(() => authors.id, { onDelete: 'cascade' })
      .notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.authorId] })]
);

export const bookCategories = pgTable(
  'book_categories',
  {
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.categoryId] })]
);

export const bookGenres = pgTable(
  'book_genres',
  {
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    genreId: uuid('genre_id')
      .references(() => genres.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.genreId] })]
);

export const bookCopies = pgTable(
  'book_copies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    barcode: varchar('barcode', { length: 100 }).unique().notNull(),
    qrCode: text('qr_code').notNull(),
    accessionNumber: varchar('accession_number', { length: 100 }).unique().notNull(),
    shelfId: uuid('shelf_id').references(() => shelves.id, { onDelete: 'set null' }),
    condition: varchar('condition', { length: 30 }).default('GOOD').notNull(), // NEW, GOOD, FAIR, POOR, DAMAGED
    status: varchar('status', { length: 30 }).default('AVAILABLE').notNull(), // AVAILABLE, BORROWED, RESERVED, LOST, DAMAGED, MAINTENANCE, ARCHIVED
    price: numeric('price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    acquisitionDate: timestamp('acquisition_date', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_book_copies_book').on(table.bookId),
    index('idx_book_copies_barcode').on(table.barcode),
    index('idx_book_copies_accession').on(table.accessionNumber),
    index('idx_book_copies_status').on(table.status),
    index('idx_book_copies_shelf').on(table.shelfId),
  ]
);

// ---------------------------------------------------------------------------
// 7. Circulation: Loans, Returns, and Renewals
// ---------------------------------------------------------------------------
export const loans = pgTable(
  'loans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id')
      .references(() => members.id, { onDelete: 'restrict' })
      .notNull(),
    copyId: uuid('copy_id')
      .references(() => bookCopies.id, { onDelete: 'restrict' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'restrict' })
      .notNull(),
    issuedBy: uuid('issued_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    returnedBy: uuid('returned_by').references(() => users.id, { onDelete: 'set null' }),
    renewedCount: integer('renewed_count').default(0).notNull(),
    status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, RETURNED, OVERDUE, LOST, CANCELLED
    notes: text('notes'),
  },
  (table) => [
    index('idx_loans_member').on(table.memberId),
    index('idx_loans_copy').on(table.copyId),
    index('idx_loans_book').on(table.bookId),
    index('idx_loans_status').on(table.status),
    index('idx_loans_due').on(table.dueAt),
  ]
);

// ---------------------------------------------------------------------------
// 8. Reservations & Waitlist
// ---------------------------------------------------------------------------
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    assignedCopyId: uuid('assigned_copy_id').references(() => bookCopies.id, { onDelete: 'set null' }),
    queuePosition: integer('queue_position').notNull(),
    status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, AVAILABLE_FOR_PICKUP, FULFILLED, EXPIRED, CANCELLED
    reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(),
    availableUntil: timestamp('available_until', { withTimezone: true }),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_reservations_member').on(table.memberId),
    index('idx_reservations_book').on(table.bookId),
    index('idx_reservations_status').on(table.status),
    index('idx_reservations_queue').on(table.bookId, table.queuePosition),
  ]
);

// ---------------------------------------------------------------------------
// 9. Fines & Payments
// ---------------------------------------------------------------------------
export const fines = pgTable(
  'fines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberId: uuid('member_id')
      .references(() => members.id, { onDelete: 'restrict' })
      .notNull(),
    loanId: uuid('loan_id').references(() => loans.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 30 }).notNull(), // OVERDUE, LOST_BOOK, DAMAGED_BOOK, MANUAL
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, PARTIALLY_PAID, PAID, WAIVED, CANCELLED
    reason: text('reason'),
    waivedBy: uuid('waived_by').references(() => users.id, { onDelete: 'set null' }),
    waivedAt: timestamp('waived_at', { withTimezone: true }),
    waiveReason: text('waive_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_fines_member').on(table.memberId),
    index('idx_fines_status').on(table.status),
    index('idx_fines_loan').on(table.loanId),
  ]
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fineId: uuid('fine_id').references(() => fines.id, { onDelete: 'set null' }),
    memberId: uuid('member_id')
      .references(() => members.id, { onDelete: 'restrict' })
      .notNull(),
    provider: varchar('provider', { length: 50 }).notNull(), // STRIPE, RAZORPAY, DEV_SANDBOX, CASH
    providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    status: varchar('status', { length: 30 }).default('COMPLETED').notNull(), // PENDING, COMPLETED, FAILED, REFUNDED
    paymentMethod: varchar('payment_method', { length: 50 }),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_payments_member').on(table.memberId),
    index('idx_payments_fine').on(table.fineId),
    index('idx_payments_status').on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// 10. Notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 50 }).notNull(), // BOOK_ISSUED, BOOK_DUE_SOON, BOOK_OVERDUE, BOOK_RETURNED, RESERVATION_AVAILABLE, RESERVATION_EXPIRING, FINE_CREATED, PAYMENT_RECEIVED, MEMBERSHIP_EXPIRING
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: text('link'),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_unread').on(table.userId, table.isRead),
  ]
);

// ---------------------------------------------------------------------------
// 11. Book Reviews & Ratings
// ---------------------------------------------------------------------------
export const bookReviews = pgTable(
  'book_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookId: uuid('book_id')
      .references(() => books.id, { onDelete: 'cascade' })
      .notNull(),
    memberId: uuid('member_id')
      .references(() => members.id, { onDelete: 'cascade' })
      .notNull(),
    loanId: uuid('loan_id').references(() => loans.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(), // 1 to 5
    review: text('review').notNull(),
    isModerated: boolean('is_moderated').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_reviews_book').on(table.bookId),
    index('idx_reviews_member').on(table.memberId),
  ]
);

// ---------------------------------------------------------------------------
// 12. Physical Inventory Transactions
// ---------------------------------------------------------------------------
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    copyId: uuid('copy_id')
      .references(() => bookCopies.id, { onDelete: 'cascade' })
      .notNull(),
    performedBy: uuid('performed_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    transactionType: varchar('transaction_type', { length: 50 }).notNull(), // INTAKE, STATUS_CHANGE, SHELF_TRANSFER, DAMAGE_REPORT, MAINTENANCE_LOG, DISPOSAL
    previousStatus: varchar('previous_status', { length: 30 }),
    newStatus: varchar('new_status', { length: 30 }),
    previousShelfId: uuid('previous_shelf_id').references(() => shelves.id, { onDelete: 'set null' }),
    newShelfId: uuid('new_shelf_id').references(() => shelves.id, { onDelete: 'set null' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_inventory_tx_copy').on(table.copyId),
    index('idx_inventory_tx_type').on(table.transactionType),
  ]
);

// ---------------------------------------------------------------------------
// 13. Audit Logging (Append-Only)
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: varchar('actor_role', { length: 50 }),
    action: varchar('action', { length: 100 }).notNull(), // LOGIN, LOGOUT, BOOK_CREATE, BOOK_UPDATE, LOAN_CREATE, BOOK_RETURN, FINE_WAIVE, etc.
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }),
    metadata: text('metadata'), // JSON string
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_actor').on(table.actorId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_created').on(table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// 14. Configurable Library Settings
// ---------------------------------------------------------------------------
export const librarySettings = pgTable('library_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
