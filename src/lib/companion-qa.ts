// Knowledge Base, FAQ, and Chat response engine for Library Companion (Lia)

export interface FaqItem {
  id: string;
  category: 'borrowing' | 'shelves' | 'compare' | 'fines' | 'reservations' | 'accounts';
  categoryLabel: string;
  question: string;
  answer: string;
  actionUrl?: string;
  actionText?: string;
  suggestedPrompt?: string;
}

export const LIBRARY_FAQS: FaqItem[] = [
  {
    id: 'faq-borrow-limit',
    category: 'borrowing',
    categoryLabel: 'Borrowing & Renewals',
    question: 'How many books can I borrow at a time and for how long?',
    answer: 'Standard student members can borrow up to 5 physical books simultaneously for a loan period of 14 days. Faculty and staff members can borrow up to 10 books for 30 days.',
    actionUrl: '/member/loans',
    actionText: 'View My Active Loans',
    suggestedPrompt: 'Can I renew my books before the due date?',
  },
  {
    id: 'faq-renew',
    category: 'borrowing',
    categoryLabel: 'Borrowing & Renewals',
    question: 'How do I renew my borrowed books?',
    answer: 'You can renew an active book loan up to 2 times from your Member Dashboard, provided no other patron has placed a hold/reservation on that copy. Each renewal extends the loan by an additional 14 days.',
    actionUrl: '/member/loans',
    actionText: 'Manage Renewals',
    suggestedPrompt: 'What happens if a book is already reserved by someone else?',
  },
  {
    id: 'faq-shelves',
    category: 'shelves',
    categoryLabel: 'Finding Physical Shelves',
    question: 'How do I find the exact physical floor and shelf of a book?',
    answer: 'Every book copy is tracked with a precise location locator. Click on any book in the catalog, scroll down to "Physical Inventory Copies", and you will see the exact Building, Floor (e.g. Floor 2 - Computer Science), Room, Rack Code (e.g. RCK-B), and Shelf Code (e.g. SH-B01).',
    actionUrl: '/',
    actionText: 'Browse Catalog Stacks',
    suggestedPrompt: 'Where are the Computer Science books located?',
  },
  {
    id: 'faq-compare',
    category: 'compare',
    categoryLabel: 'Book Comparison',
    question: 'How does the side-by-side Book Comparison feature work?',
    answer: 'You can click the "Compare" button on any book card or book details page to add up to 4 books into your floating Comparison Dock. Click "Compare Now" to view a side-by-side breakdown of editions, authors, page counts, publisher details, categories, and real-time shelf copy availability.',
    suggestedPrompt: 'How many books can I compare at once?',
  },
  {
    id: 'faq-fines',
    category: 'fines',
    categoryLabel: 'Fines & Payments',
    question: 'How are overdue fines calculated and how do I pay them?',
    answer: 'Overdue books accrue a modest fine of $0.50 per day past the due date. You can view all pending fines in your Member Dashboard under the Fines tab and settle them instantly using our sandbox card simulator or Stripe/Razorpay payment gateway.',
    actionUrl: '/member/fines',
    actionText: 'Check Fines & Balance',
    suggestedPrompt: 'How can I pay my library fines online?',
  },
  {
    id: 'faq-reservations',
    category: 'reservations',
    categoryLabel: 'Waitlists & Holds',
    question: 'How do reservations and waitlists work if all copies are borrowed?',
    answer: 'When a book has 0 available copies on shelf, click the "Reserve / Join Waitlist" button. You will be assigned a priority queue spot (e.g., #1 in line). When a copy is returned to the library, our system automatically holds it for you and updates your reservation status to READY for pick-up.',
    actionUrl: '/member/reservations',
    actionText: 'View My Reservations',
    suggestedPrompt: 'How will I know when my reserved book is ready?',
  },
  {
    id: 'faq-accounts',
    category: 'accounts',
    categoryLabel: 'Accounts & Credentials',
    question: 'How do I log in or test different roles (Admin, Librarian, Member)?',
    answer: 'You can log in as a Student Member (member@example.com), Staff Librarian (librarian@example.com), or System Administrator (admin@example.com), all using password "Password123!". Each role unlocks tailored capabilities like circulation desks, loan check-ins, inventory transfers, and audit logs.',
    actionUrl: '/login',
    actionText: 'Go to Login Page',
    suggestedPrompt: 'What can librarians do that student members cannot?',
  },
  {
    id: 'faq-lost-book',
    category: 'borrowing',
    categoryLabel: 'Borrowing & Renewals',
    question: 'What should I do if I misplace or lose a library book?',
    answer: 'If you misplace a book, immediately visit the "Clear a Problem" desk in this companion or notify the librarian circulation desk. We will pause daily overdue fines while a search is conducted or assist with standard replacement processing.',
    suggestedPrompt: 'I lost a library book, what are the replacement fees?',
  },
];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'lia';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    url?: string;
    onClickPrompt?: string;
  };
}

/**
 * Intelligent in-character knowledge retrieval for Lia the Librarian
 */
export function generateLiaResponse(userQuery: string): { text: string; action?: { label: string; url?: string; onClickPrompt?: string } } {
  const query = userQuery.toLowerCase().trim();

  // 1. Borrowing / Checkout
  if (query.includes('borrow') || query.includes('check out') || query.includes('how to get a book') || query.includes('take home')) {
    return {
      text: "To borrow a book, you can check its shelf availability right on the catalog page! As a student member, you can borrow up to 5 volumes for 14 days. If you're on campus, grab the book from its shelf and visit our circulation desk, or reserve it online if copies are currently checked out!",
      action: { label: 'Explore Catalog', url: '/' },
    };
  }

  // 2. Renewal
  if (query.includes('renew') || query.includes('extend') || query.includes('keep longer')) {
    return {
      text: "You can renew any active loan up to 2 times directly from your Member Loans page, as long as no other student has placed a hold on it! Each renewal gives you an extra 14 days of reading time.",
      action: { label: 'View Loans & Renew', url: '/member/loans' },
    };
  }

  // 3. Physical Shelves / Location / Floors
  if (query.includes('shelf') || query.includes('floor') || query.includes('location') || query.includes('where') || query.includes('find') || query.includes('rack')) {
    return {
      text: "Every physical book in our library has an exact building, floor, room, and rack code! For example, Computer Science books are on Floor 2, Section B. On any book's details page, check the 'Physical Inventory Copies' section to see the exact Shelf code (like RCK-B, Shelf SH-B01)!",
      action: { label: 'Browse Catalog Stacks', url: '/' },
    };
  }

  // 4. Comparison
  if (query.includes('compare') || query.includes('comparison') || query.includes('difference') || query.includes('side by side')) {
    return {
      text: "Our Book Comparison tool is magnificent! Click the 'Compare' button on any book card to add up to 4 titles into your comparison dock. You'll see a complete side-by-side matrix comparing editions, page counts, ratings, topics, and live shelf availability!",
      action: { label: 'Open Compare Guide', onClickPrompt: 'How many books can I compare at once?' },
    };
  }

  // 5. Fines / Fees / Payments
  if (query.includes('fine') || query.includes('fee') || query.includes('late') || query.includes('overdue') || query.includes('pay') || query.includes('cost')) {
    return {
      text: "Overdue books accrue a gentle fine of $0.50 per day past the due date. You can review all pending balances in your Member Dashboard under Fines and settle them online instantly via card simulator or integrated payment providers!",
      action: { label: 'Check My Fines', url: '/member/fines' },
    };
  }

  // 6. Reservations / Holds / Waitlists
  if (query.includes('reserve') || query.includes('waitlist') || query.includes('hold') || query.includes('out of stock') || query.includes('unavailable')) {
    return {
      text: "If all physical copies of a book are currently checked out, simply click 'Reserve / Join Waitlist'! You'll be assigned a priority spot in our automated FIFO queue, and as soon as a copy is returned, it will be held at the front desk for you!",
      action: { label: 'My Reservations', url: '/member/reservations' },
    };
  }

  // 7. Login / Credentials / Roles
  if (query.includes('login') || query.includes('account') || query.includes('password') || query.includes('admin') || query.includes('librarian') || query.includes('role')) {
    return {
      text: "You can test any role with password 'Password123!': use member@example.com for student borrowing, librarian@example.com for desk circulation & check-in, or admin@example.com for system configs and audit logs!",
      action: { label: 'Go to Login', url: '/login' },
    };
  }

  // 8. Lost or damaged books
  if (query.includes('lost') || query.includes('damage') || query.includes('torn') || query.includes('stolen') || query.includes('misplaced')) {
    return {
      text: "Don't panic! If a book is misplaced or damaged, please inform our circulation desk or use our 'Clear a Problem' tab to report it. We will pause overdue fines immediately while we investigate the shelf or arrange a replacement!",
      action: { label: 'Clear a Problem Desk', onClickPrompt: 'I lost a library book, what should I do?' },
    };
  }

  // 9. Hours / Contact / Desk location
  if (query.includes('hour') || query.includes('open') || query.includes('time') || query.includes('contact') || query.includes('desk') || query.includes('staff')) {
    return {
      text: "Our physical library building is open Monday through Saturday from 8:00 AM to 9:00 PM, and Sundays from 10:00 AM to 6:00 PM. Our central circulation desk is located right on Floor 1 in the Main Atrium. And I am always right here on your screen 24/7!",
      action: { label: 'Library Tour', onClickPrompt: 'Show me the library tour' },
    };
  }

  // 10. Greetings
  if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('good morning') || query.includes('good afternoon')) {
    return {
      text: "Hello there! Wonderful to see you in the stacks today! 📚 How can I help you? You can ask me about book recommendations, borrowing rules, finding shelf locations, comparing editions, or resolving any issue!",
      action: { label: 'Top Recommended Books', onClickPrompt: 'Recommend me a great book' },
    };
  }

  // 11. Recommendations
  if (query.includes('recommend') || query.includes('best book') || query.includes('what should i read') || query.includes('suggestion')) {
    return {
      text: "If you want a life-changing engineering read, I passionately recommend Martin Kleppmann's 'Designing Data-Intensive Applications' or Uncle Bob's 'Clean Code'! Check out my 'Top Pick' tab in this hub for a live random gem from the archives!",
      action: { label: 'Explore Curated Books', url: '/' },
    };
  }

  // Fallback
  return {
    text: `That's an interesting question! As your resident librarian, I'm here to ensure you have a seamless experience. You can search books in the catalog, look up specific rules in our FAQ tab, or file an issue in our 'Clear a Problem' tab!`,
    action: { label: 'Browse FAQs', onClickPrompt: 'How many books can I borrow at a time and for how long?' },
  };
}

export interface ProblemReport {
  id: string;
  category: string;
  bookTitleOrId?: string;
  description: string;
  timestamp: string;
  status: 'resolved' | 'ticket_created';
  resolutionTitle: string;
  resolutionMessage: string;
}

/**
 * Instant problem clearance engine
 */
export function resolvePatronProblem(category: string, bookIdentifier: string, notes: string): ProblemReport {
  const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (category) {
    case 'book_returned_still_borrowed':
      return {
        id: ticketId,
        category,
        bookTitleOrId: bookIdentifier,
        description: notes,
        timestamp: now,
        status: 'ticket_created',
        resolutionTitle: 'Drop-Box Clearance Logged & Fine Hold Applied',
        resolutionMessage: `We have logged Ticket #${ticketId} for circulation desk verification. If you dropped the book in the after-hours return box, batches are processed at 9:00 AM and 3:00 PM. Any automated late fines during this window have been paused!`,
      };

    case 'cannot_find_shelf':
      return {
        id: ticketId,
        category,
        bookTitleOrId: bookIdentifier,
        description: notes,
        timestamp: now,
        status: 'ticket_created',
        resolutionTitle: 'Floor Sweep Request Dispatched to Staff',
        resolutionMessage: `Ticket #${ticketId} dispatched to our Floor 2 & Floor 3 student aides. Often books examined within the last 45 minutes are on the central sorting cart. We've marked this copy for an immediate physical shelf check!`,
      };

    case 'fine_discrepancy':
      return {
        id: ticketId,
        category,
        bookTitleOrId: bookIdentifier,
        description: notes,
        timestamp: now,
        status: 'ticket_created',
        resolutionTitle: 'Payment & Balance Reconciliation Initiated',
        resolutionMessage: `Ticket #${ticketId} logged with payment audit. If you paid via card sandbox or gateway, please verify your transaction receipt under Member Fines. Our financial reconciliation system cross-checks records every 10 minutes.`,
      };

    case 'renewal_blocked':
      return {
        id: ticketId,
        category,
        bookTitleOrId: bookIdentifier,
        description: notes,
        timestamp: now,
        status: 'ticket_created',
        resolutionTitle: 'Hold Queue Check & Extension Assessment',
        resolutionMessage: `Ticket #${ticketId} registered. Renewals are usually restricted when another patron has joined the reservation waitlist. Our desk has flagged your request for a 3-day courtesy grace window if no immediate holds exist.`,
      };

    default:
      return {
        id: ticketId,
        category: 'general',
        bookTitleOrId: bookIdentifier,
        description: notes,
        timestamp: now,
        status: 'ticket_created',
        resolutionTitle: 'Patron Support Ticket Created',
        resolutionMessage: `Ticket #${ticketId} has been successfully submitted to the Metropolitan Library Help Desk. Lia and the library staff will review this inquiry promptly. You can quote #${ticketId} at the circulation desk!`,
      };
  }
}
