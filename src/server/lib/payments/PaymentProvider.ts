export interface PaymentIntentParams {
  amount: number;
  currency: string;
  fineId: string;
  memberId: string;
  description: string;
}

export interface PaymentIntentResult {
  provider: string;
  transactionId: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'REQUIRES_ACTION' | 'COMPLETED' | 'FAILED';
  meta?: Record<string, unknown>;
}

export interface PaymentVerificationParams {
  transactionId: string;
  signature?: string;
  payload?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  transactionId: string;
  status: 'COMPLETED' | 'FAILED';
  message?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<PaymentVerificationResult>;
  processRefund(transactionId: string, amount?: number): Promise<boolean>;
}
