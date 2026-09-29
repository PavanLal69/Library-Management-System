import { AuthService } from '../src/server/services/AuthService';
import { BookService } from '../src/server/services/BookService';
import { BookCopyService } from '../src/server/services/BookCopyService';
import { LoanService } from '../src/server/services/LoanService';
import { ReservationService } from '../src/server/services/ReservationService';
import { FineService } from '../src/server/services/FineService';
import { PaymentService } from '../src/server/services/PaymentService';
import { AuditService } from '../src/server/services/AuditService';
import { db, initPromise } from '../src/server/db';
import { bookCopies, loans, reservations } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

async function runTestSuite() {
  console.log('====================================================');
  console.log('STARTING LMS AUTOMATED FULL-LIFECYCLE TEST SUITE');
  console.log('====================================================');
  await initPromise;

  const testEmail = `student_${Date.now()}@university.edu`;
  let testMemberId = '';
  let testUserId = '';
  let testBookId = '';
  let testCopyId = '';
  let testLoanId = '';
  let testFineId = '';

  // Step 1: Member Registration
  console.log('\n[TEST 1] Registering new library member...');
  const regResult = await AuthService.register({
    email: testEmail,
    password: 'Password123!',
    firstName: 'Linus',
    lastName: 'Torvalds',
    department: 'Operating Systems',
    course: 'Kernel Engineering',
    yearOfStudy: 3,
  });

  if (!regResult.user || !regResult.token) {
    throw new Error('Test 1 Failed: Registration response missing user or token');
  }
  testUserId = regResult.user.id;
  testMemberId = regResult.user.memberProfile!.id;
  console.log(`✓ Member registered successfully: Card ${regResult.user.memberProfile!.libraryCardNumber}`);

  // Step 2: Authentication & Session Verification
  console.log('\n[TEST 2] Verifying login and session token validation...');
  const loginResult = await AuthService.login(testEmail, 'Password123!');
  const validatedSession = await AuthService.validateSessionToken(loginResult.token);
  if (!validatedSession || validatedSession.email !== testEmail) {
    throw new Error('Test 2 Failed: Session token validation failed');
  }
  console.log(`✓ Session validated for user ${validatedSession.email} with roles: ${validatedSession.roles.join(', ')}`);

  // Step 3: Catalog Search
  console.log('\n[TEST 3] Searching catalog for available books...');
  const searchResult = await BookService.searchBooks({ availableOnly: true });
  if (searchResult.books.length === 0) {
    throw new Error('Test 3 Failed: Book search returned 0 results');
  }
  const book = searchResult.books[0];
  testBookId = book.id;
  console.log(`✓ Catalog search matched: "${book.title}" (ISBN: ${book.isbn})`);

  // Step 4: Book Details & Physical Copies Table
  console.log('\n[TEST 4] Retrieving book details and shelf locations...');
  const bookDetails = await BookService.getBookById(testBookId);
  if (!bookDetails || bookDetails.copies.length === 0) {
    throw new Error('Test 4 Failed: No physical copies found for book');
  }
  const targetCopy = bookDetails.copies.find((c) => c.status === 'AVAILABLE') || bookDetails.copies[0];
  testCopyId = targetCopy.id;
  console.log(`✓ Found physical copy: ${targetCopy.barcode} located at "${targetCopy.shelfLocation}"`);

  // Step 5: Waitlist Reservation Queue
  console.log('\n[TEST 5] Creating waitlist reservation...');
  const reservation = await ReservationService.createReservation({
    memberId: testMemberId,
    bookId: testBookId,
    actorId: testUserId,
  });
  if (!reservation || reservation.status !== 'PENDING') {
    throw new Error('Test 5 Failed: Reservation status is not PENDING');
  }
  console.log(`✓ Reservation created in waitlist position #${reservation.queuePosition}`);

  // Step 6: Librarian Issues Loan
  console.log('\n[TEST 6] Librarian issuing book to member (ACID Transaction)...');
  const issueResult = await LoanService.issueLoan({
    memberId: testMemberId,
    copyId: testCopyId,
    issuedBy: testUserId,
  });
  if (!issueResult.loan || issueResult.loan.status !== 'ACTIVE') {
    throw new Error('Test 6 Failed: Loan status is not ACTIVE');
  }
  testLoanId = issueResult.loan.id;

  // Verify copy status transitioned to BORROWED
  const [updatedCopy] = await db.select().from(bookCopies).where(eq(bookCopies.id, testCopyId)).limit(1);
  if (updatedCopy.status !== 'BORROWED') {
    throw new Error(`Test 6 Failed: Copy status expected BORROWED, got ${updatedCopy.status}`);
  }
  console.log(`✓ Loan ${testLoanId} issued. Copy status transitioned to ${updatedCopy.status}`);

  // Step 7: Overdue Fine Computation
  console.log('\n[TEST 7] Testing overdue fine calculation algorithm...');
  const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days overdue
  const fineCalculation = await FineService.calculateOverdueFine(pastDueDate, new Date());
  if (fineCalculation.overdueDays !== 5 || fineCalculation.fineAmount <= 0) {
    throw new Error(`Test 7 Failed: Expected fine for 5 overdue days, got $${fineCalculation.fineAmount}`);
  }
  console.log(`✓ Overdue calculation verified: ${fineCalculation.overdueDays} days late = $${fineCalculation.fineAmount}`);

  // Step 8: Return Book Workflow
  console.log('\n[TEST 8] Librarian processing return with fine generation...');
  // Force loan due date to past for testing fine assessment
  await db.update(loans).set({ dueAt: pastDueDate }).where(eq(loans.id, testLoanId));

  const returnResult = await LoanService.returnLoan({
    barcode: targetCopy.barcode,
    returnedBy: testUserId,
  });

  if (!returnResult.loan || returnResult.loan.status !== 'RETURNED') {
    throw new Error('Test 8 Failed: Loan status expected RETURNED');
  }
  if (!returnResult.fine) {
    throw new Error('Test 8 Failed: Expected overdue fine was not created');
  }
  testFineId = returnResult.fine.id;
  console.log(`✓ Return processed. Status: RETURNED. Fine assessed: $${returnResult.fine.amount}`);

  // Step 9: Settle Fine via Payment Provider Abstraction
  console.log('\n[TEST 9] Settling fine via Dev Sandbox Payment Provider...');
  const intent = await PaymentService.createIntent({
    fineId: testFineId,
    memberId: testMemberId,
    providerName: 'DEV_SANDBOX',
  });

  const paymentResult = await PaymentService.verifyAndSettlePayment({
    fineId: testFineId,
    memberId: testMemberId,
    providerName: intent.provider,
    transactionId: intent.transactionId,
    paymentMethod: 'TEST_CARD',
  });

  if (!paymentResult.success || paymentResult.fine.status !== 'PAID') {
    throw new Error(`Test 9 Failed: Fine status expected PAID, got ${paymentResult.fine.status}`);
  }
  console.log(`✓ Fine #${testFineId.slice(0, 8)} successfully settled and verified via ${intent.provider}`);

  // Step 10: Audit Log Verification
  console.log('\n[TEST 10] Verifying immutable audit trail of all operations...');
  const auditEntries = await AuditService.getLogs({ limit: 15 });
  const actions = auditEntries.map((a) => a.action);
  const requiredActions = ['USER_REGISTER', 'BORROW_CREATE', 'BORROW_RETURN', 'FINE_PAY'];

  for (const reqAct of requiredActions) {
    if (!actions.includes(reqAct)) {
      throw new Error(`Test 10 Failed: Required audit action ${reqAct} missing from audit trail`);
    }
  }
  console.log(`✓ Audit log verified with actions: ${actions.slice(0, 6).join(', ')}`);

  console.log('\n====================================================');
  console.log('ALL 10 LIFECYCLE TESTS PASSED WITH 100% SUCCESS');
  console.log('====================================================');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failure:', err);
    process.exit(1);
  });
