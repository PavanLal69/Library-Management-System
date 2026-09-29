import { db, initPromise } from '../db';
import { fines, payments, members } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { PaymentFactory } from '../lib/payments/PaymentFactory';
import { AuditService } from './AuditService';
import { NotificationService } from './NotificationService';

export class PaymentService {
  static async createIntent(params: {
    fineId: string;
    memberId: string;
    providerName?: string;
  }) {
    await initPromise;
    const [fine] = await db.select().from(fines).where(eq(fines.id, params.fineId)).limit(1);
    if (!fine) throw new Error('Fine record not found.');
    if (fine.status === 'PAID' || fine.status === 'WAIVED') {
      throw new Error(`This fine is already ${fine.status.toLowerCase()}.`);
    }

    const remainingAmount = parseFloat(fine.amount) - parseFloat(fine.paidAmount);
    if (remainingAmount <= 0) {
      throw new Error('No remaining balance due for this fine.');
    }

    const provider = PaymentFactory.getProvider(params.providerName);
    const intent = await provider.createPaymentIntent({
      amount: remainingAmount,
      currency: fine.currency,
      fineId: fine.id,
      memberId: params.memberId,
      description: `Payment for library fine (${fine.type}): $${remainingAmount.toFixed(2)}`,
    });

    return intent;
  }

  static async verifyAndSettlePayment(params: {
    fineId: string;
    memberId: string;
    providerName: string;
    transactionId: string;
    signature?: string;
    payload?: Record<string, unknown>;
    paymentMethod?: string;
  }) {
    await initPromise;

    // 1. Server-side verification via adapter
    const provider = PaymentFactory.getProvider(params.providerName);
    const verification = await provider.verifyPayment({
      transactionId: params.transactionId,
      signature: params.signature,
      payload: params.payload,
    });

    if (!verification.success) {
      throw new Error(`Payment verification failed: ${verification.message || 'Declined'}`);
    }

    // 2. Fetch and update Fine
    const [fine] = await db.select().from(fines).where(eq(fines.id, params.fineId)).limit(1);
    if (!fine) throw new Error('Fine not found.');

    const remaining = parseFloat(fine.amount) - parseFloat(fine.paidAmount);
    const updatedPaid = parseFloat(fine.amount); // Full payment

    const [updatedFine] = await db
      .update(fines)
      .set({
        paidAmount: updatedPaid.toFixed(2),
        status: 'PAID',
        updatedAt: new Date(),
      })
      .where(eq(fines.id, params.fineId))
      .returning();

    // 3. Record in payments table
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        fineId: fine.id,
        memberId: params.memberId,
        provider: provider.name,
        providerTransactionId: params.transactionId,
        amount: remaining.toFixed(2),
        currency: fine.currency,
        status: 'COMPLETED',
        paymentMethod: params.paymentMethod || 'CARD',
        metadata: JSON.stringify(params.payload || {}),
      })
      .returning();

    // 4. Notify member
    const [member] = await db.select().from(members).where(eq(members.id, params.memberId)).limit(1);
    if (member) {
      await NotificationService.send({
        userId: member.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Confirmed',
        message: `Your payment of $${remaining.toFixed(2)} for fine #${fine.id.slice(0, 8)} has been received and cleared.`,
        link: '/member/fines',
      });
    }

    // 5. Audit log
    await AuditService.log({
      actorId: member ? member.userId : null,
      action: 'FINE_PAY',
      entityType: 'PAYMENT',
      entityId: paymentRecord.id,
      metadata: {
        fineId: fine.id,
        amount: remaining,
        provider: provider.name,
        transactionId: params.transactionId,
      },
    });

    return {
      success: true,
      fine: updatedFine,
      payment: paymentRecord,
    };
  }

  static async getPaymentHistory(memberId?: string) {
    await initPromise;
    const query = db.select().from(payments);
    if (memberId) {
      return query.where(eq(payments.memberId, memberId)).orderBy(desc(payments.createdAt));
    }
    return query.orderBy(desc(payments.createdAt));
  }
}
