import { Injectable, Logger } from '@nestjs/common';

export interface RefundInput {
  /** payments.id — denetim/log için. */
  paymentId: string;
  /** PayTR tahsilat referansı (payments.provider_ref). İade bu referansa yapılır. */
  providerRef: string | null;
  /** İade edilecek tutar (TL). */
  amount: number;
}

export interface RefundResult {
  ok: boolean;
  /** Sağlayıcı iade referansı (payments.refund_ref). */
  refundRef: string;
}

/**
 * PayTR ödeme sağlayıcısı.
 *
 * ŞU AN STUB: gerçek API çağrısı yok — iade her zaman başarılı döner.
 * Sağlayıcı hesabı açılınca yalnızca bu sınıf doldurulacak (çağıran kod aynı kalır):
 *   • Env: PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT
 *   • refund(): POST https://www.paytr.com/odeme/iade
 *       merchant_id, merchant_oid (=providerRef), return_amount, paytr_token (HMAC)
 *   • Başarılıysa { status: 'success' } döner → refundRef = merchant_oid.
 */
@Injectable()
export class PaytrService {
  private readonly logger = new Logger(PaytrService.name);

  async refund(input: RefundInput): Promise<RefundResult> {
    // TODO(paytr): gerçek /odeme/iade çağrısını burada yap.
    this.logger.warn(
      `[STUB] PayTR refund — payment=${input.paymentId} ref=${input.providerRef ?? '—'} amount=${input.amount}`,
    );
    return { ok: true, refundRef: `STUB-REFUND-${Date.now()}` };
  }
}
