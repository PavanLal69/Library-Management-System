import {
  PaymentProvider,
  PaymentIntentParams,
  PaymentIntentResult,
  PaymentVerificationParams,
  PaymentVerificationResult,
} from './PaymentProvider';
import crypto from 'crypto';

export class DevSandboxProvider implements PaymentProvider {
  readonly name = 'DEV_SANDBOX';

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const transactionId = `txn_sandbox_${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = `sec_${crypto.randomBytes(16).toString('hex')}`;

    return {
      provider: this.name,
      transactionId,
      clientSecret,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      meta: {
        fineId: params.fineId,
        memberId: params.memberId,
        testMode: true,
      },
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult> {
    // In Dev Sandbox, simulate realistic gateway verification
    // Fails only if transactionId contains 'fail' or explicit failure flag is provided
    if (params.transactionId.includes('fail') || params.payload?.forceFail === true) {
      return {
        success: false,
        transactionId: params.transactionId,
        status: 'FAILED',
        message: 'Payment was declined by issuing bank (Sandbox Test).',
      };
    }

    return {
      success: true,
      transactionId: params.transactionId,
      status: 'COMPLETED',
      message: 'Sandbox payment successfully verified by gateway.',
    };
  }

  async processRefund(transactionId: string): Promise<boolean> {
    return !transactionId.includes('fail');
  }
}
