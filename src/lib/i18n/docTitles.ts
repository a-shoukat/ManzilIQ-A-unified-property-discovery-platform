import type { TFunction } from 'i18next';
import type { GeneratedDocType } from '@/lib/manzil/types';
import { DOC_TITLES } from '@/lib/manzil/types';

const KEYS: Record<GeneratedDocType, string> = {
  allotment: 'admin:docAllotment',
  token_receipt: 'admin:docTokenReceipt',
  sale_agreement: 'admin:docSaleAgreement',
  installment_receipt: 'admin:docInstallmentReceipt',
  transfer_deed: 'admin:docTransferDeed',
  noc_letter: 'admin:docNoc',
  cancellation: 'admin:docCancellation',
};

/** Translated legal document titles; falls back to English DOC_TITLES. */
export function translatedDocTitle(t: TFunction, type: GeneratedDocType): string {
  const key = KEYS[type];
  const value = t(key);
  return value === key ? DOC_TITLES[type] : value;
}
