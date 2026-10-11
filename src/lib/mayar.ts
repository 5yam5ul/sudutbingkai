import { EventPackageTier, PACKAGE_TIERS } from './types';

const MAYAR_API_KEY = process.env.MAYAR_API_KEY || '';
const MAYAR_WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN || '';

export const isMayarConfigured = Boolean(
  MAYAR_API_KEY && 
  !MAYAR_API_KEY.includes('placeholder') &&
  MAYAR_API_KEY.length > 5
);

export interface MayarInvoiceRequest {
  name: string;
  email?: string;
  mobile?: string;
  amount: number;
  description: string;
  redirectUrl: string;
  packageTier: EventPackageTier;
  eventId?: string;
  isAddonPax?: boolean;
  paxAmount?: number;
}

export interface MayarInvoiceResponse {
  success: boolean;
  isSimulation: boolean;
  paymentUrl: string;
  invoiceId: string;
  amount: number;
  message?: string;
}

/**
 * Creates an invoice in Mayar (or returns a simulation invoice if Mayar API key is not configured)
 */
export async function createMayarInvoice(params: MayarInvoiceRequest): Promise<MayarInvoiceResponse> {
  const simulatedId = `inv_myr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // If Mayar API key is not yet set (e.g. pending KYC review), use interactive simulation mode
  if (!isMayarConfigured) {
    return {
      success: true,
      isSimulation: true,
      invoiceId: simulatedId,
      amount: params.amount,
      paymentUrl: `/payment/simulate?id=${simulatedId}&tier=${params.packageTier}&amount=${params.amount}&name=${encodeURIComponent(params.name)}`,
      message: 'Mode Simulasi Sandbox Aktif (Menunggu aktivasi API Key Mayar)'
    };
  }

  try {
    const payload = {
      name: params.name || 'Tuan Rumah / Pengantin',
      email: params.email || 'customer@sudutbingkai.id',
      mobile: params.mobile || '081234567890',
      amount: params.amount,
      description: params.description || `Paket ${params.packageTier.toUpperCase()} SudutBingkai`,
      redirectUrl: params.redirectUrl,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    const res = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data?.data?.link) {
      return {
        success: true,
        isSimulation: false,
        paymentUrl: data.data.link,
        invoiceId: data.data.id || simulatedId,
        amount: params.amount
      };
    }

    console.warn('Mayar API non-ok response, falling back to sandbox simulation:', data);
    return {
      success: true,
      isSimulation: true,
      invoiceId: simulatedId,
      amount: params.amount,
      paymentUrl: `/payment/simulate?id=${simulatedId}&tier=${params.packageTier}&amount=${params.amount}&name=${encodeURIComponent(params.name)}`,
      message: data?.message || 'Fallback to simulation mode'
    };
  } catch (err: unknown) {
    console.error('Mayar API call error, using sandbox fallback:', err);
    return {
      success: true,
      isSimulation: true,
      invoiceId: simulatedId,
      amount: params.amount,
      paymentUrl: `/payment/simulate?id=${simulatedId}&tier=${params.packageTier}&amount=${params.amount}&name=${encodeURIComponent(params.name)}`,
      message: (err as Error).message
    };
  }
}

/**
 * Verifies Mayar Webhook Token header
 */
export function verifyMayarWebhookToken(tokenHeader: string | null): boolean {
  if (!MAYAR_WEBHOOK_TOKEN) return true;
  return tokenHeader === MAYAR_WEBHOOK_TOKEN;
}
