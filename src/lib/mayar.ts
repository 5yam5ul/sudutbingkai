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
  error?: string;
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
    const payload: Record<string, any> = {
      name: params.name || 'Tuan Rumah / Pengantin',
      email: params.email || 'customer@sudutbingkai.id',
      amount: params.amount,
      description: params.description || `Paket ${params.packageTier.toUpperCase()} SudutBingkai`,
      redirectUrl: params.redirectUrl,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Only attach mobile if provided with valid length (avoid static dummy number which triggers rate-limit)
    if (params.mobile && params.mobile.trim().length >= 8) {
      payload.mobile = params.mobile.trim();
    }

    // STRICT REQUIREMENT: Mayar API strictly requires all extraData values to be STRINGS
    if (params.eventId || params.isAddonPax !== undefined || params.paxAmount !== undefined) {
      payload.extraData = {
        eventId: String(params.eventId || ''),
        isAddonPax: params.isAddonPax ? 'true' : 'false',
        paxAmount: String(params.paxAmount || 0),
        packageTier: String(params.packageTier || ''),
      };
    }

    const res = await fetch('https://api.mayar.id/hl/v1/payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAYAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.data?.link) {
      return {
        success: true,
        isSimulation: false,
        paymentUrl: data.data.link,
        invoiceId: data.data.id || simulatedId,
        amount: params.amount
      };
    }

    console.error('Mayar API non-ok response:', res.status, data);

    // Extract exact human-readable error from Mayar error structures
    let errMsg = 'Gagal membuat tautan pembayaran Mayar. Silakan coba beberapa saat lagi.';
    const rawMsg = data?.messages || data?.message || data?.error;
    if (typeof rawMsg === 'string') {
      errMsg = rawMsg;
    } else if (Array.isArray(rawMsg)) {
      errMsg = rawMsg.join(', ');
    } else if (data?.data && typeof data.data === 'object') {
      const fieldErrors = Object.values(data.data).flat();
      if (fieldErrors.length > 0) {
        errMsg = fieldErrors.map(e => String(e)).join(', ');
      }
    }

    return {
      success: false,
      isSimulation: false,
      invoiceId: '',
      amount: params.amount,
      paymentUrl: '',
      message: errMsg,
      error: errMsg
    };
  } catch (err: unknown) {
    console.error('Mayar API call error:', err);
    const errText = (err as Error).message || 'Gagal menghubungi gateway pembayaran Mayar.';
    return {
      success: false,
      isSimulation: false,
      invoiceId: '',
      amount: params.amount,
      paymentUrl: '',
      message: errText,
      error: errText
    };
  }
}

/**
 * Verifies Mayar Webhook Token header
 * Strictly rejects requests if MAYAR_WEBHOOK_TOKEN is not configured or doesn't match
 */
export function verifyMayarWebhookToken(tokenHeader: string | null): boolean {
  if (!MAYAR_WEBHOOK_TOKEN || MAYAR_WEBHOOK_TOKEN.trim().length === 0) {
    console.error('CRITICAL SECURITY: MAYAR_WEBHOOK_TOKEN is not configured in server environment. Webhook rejected.');
    return false;
  }
  return Boolean(tokenHeader && tokenHeader.trim() === MAYAR_WEBHOOK_TOKEN.trim());
}
