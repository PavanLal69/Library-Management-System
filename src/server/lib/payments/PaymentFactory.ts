import { PaymentProvider } from './PaymentProvider';
import { DevSandboxProvider } from './DevSandboxProvider';
import { StripeProvider } from './StripeProvider';
import { RazorpayProvider } from './RazorpayProvider';

export class PaymentFactory {
  private static providers: Map<string, PaymentProvider> = new Map<string, PaymentProvider>([
    ['DEV_SANDBOX', new DevSandboxProvider()],
    ['STRIPE', new StripeProvider()],
    ['RAZORPAY', new RazorpayProvider()],
  ]);

  static getProvider(name?: string): PaymentProvider {
    const providerKey = (name || process.env.PAYMENT_PROVIDER || 'DEV_SANDBOX').toUpperCase();
    const provider = this.providers.get(providerKey);
    if (!provider) {
      // Default to DevSandboxProvider
      return this.providers.get('DEV_SANDBOX')!;
    }
    return provider;
  }
}
