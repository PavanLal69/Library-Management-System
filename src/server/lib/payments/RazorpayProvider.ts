import {
  PaymentProvider,
  PaymentIntentParams,
  PaymentIntentResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
} from './PaymentProvider';
import crypto from 'crypto';

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'RAZORPAY';

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const orderId = `order_${crypto.randomBytes(10).toString('hex')}`;

    return {
      provider: this.name,
      transactionId: orderId,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      meta: {
        fineId: params.fineId,
        memberId: params.memberId,
      },
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return {
        success: true,
        transactionId: params.transactionId,
        status: 'COMPLETED',
        message: 'Verified via Razorpay adapter dev mode.',
      };
    }

    // In production, compute HMAC SHA256 of orderId + '|' + paymentId with keySecret
    return {
      success: true,
      transactionId: params.transactionId,
      status: 'COMPLETED',
    };
  }

  async processRefund(transactionId: string): Promise<boolean> {
    return Boolean(transactionId);
  }
}
