/** Sales invoice status values used by the API (1–3). */
export const SalesInvoiceStatus = {
  Draft: 1,
  Posted: 2,
  Cancelled: 3,
} as const;

export type SalesInvoiceStatusValue =
  (typeof SalesInvoiceStatus)[keyof typeof SalesInvoiceStatus];

/** Invoice type values used by the API (1–2). */
export const SalesInvoiceType = {
  Cash: 1,
  Credit: 2,
} as const;

export type SalesInvoiceTypeValue = (typeof SalesInvoiceType)[keyof typeof SalesInvoiceType];

export interface SalesInvoiceListItem {
  invoiceId: number;
  invoiceNo?: string | null;
  invoiceDate: string;
  status: number;
  customerId: number;
  netAmount: number;
  branchId: number;
}

export interface SalesInvoiceDetail {
  detailId?: number;
  baseQty?: number;
  groupId?: number;
  productId: number;
  productName?: string | null;
  barcode?: string | null;
  uomId: number;
  unitName?: string | null;
  qty: number;
  unitPrice: number;
  totalBeforeDiscount: number;
  discountRate: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  isBatchManaged?: boolean;
  hasExpiry?: boolean;
}

export interface SalesInvoiceCharge {
  chargeSetupId: number;
  chargeName?: string | null;
  amount: number;
  taxRate: number;
  taxAmount: number;
  accId: number;
}

export interface SalesInvoicePayment {
  paymentTypeId: number;
  paymentTypeName?: string | null;
  amount: number;
  refNumber?: string | null;
}

export interface SalesInvoiceHeader {
  invoiceId: number;
  invoiceNo?: string | null;
  invoiceDate: string;
  branchId: number;
  storeId: number;
  costCenterId?: number | null;
  customerId: number;
  salesmanId?: number | null;
  invoiceType: number;
  status: number;
  currencyId?: number | null;
  exchangeRate: number;
  totalBeforeDiscount: number;
  discountAmount: number;
  additionalCharges: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  primaryPaymentTypeId?: number | null;
  accJournalId?: number | null;
  details?: SalesInvoiceDetail[] | null;
  charges?: SalesInvoiceCharge[] | null;
  payments?: SalesInvoicePayment[] | null;
}

export interface SaveSalesInvoiceDetail {
  productId: number;
  uomId: number;
  qty: number;
  unitPrice: number;
  discountRate?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  netAmount?: number;
  totalBeforeDiscount?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

export interface SaveSalesInvoiceCharge {
  chargeSetupId: number;
  chargeName?: string | null;
  amount?: number;
  taxRate?: number;
  taxAmount?: number;
  accId?: number;
}

export interface SaveSalesInvoicePayment {
  paymentTypeId: number;
  amount?: number;
  refNumber?: string | null;
}

export interface SaveSalesInvoiceRequest {
  invoiceId?: number;
  invoiceNo?: string | null;
  invoiceDate: string;
  branchId: number;
  storeId: number;
  costCenterId?: number | null;
  customerId: number;
  salesmanId?: number | null;
  invoiceType: number;
  currencyId?: number | null;
  exchangeRate?: number;
  status?: number;
  totalBeforeDiscount?: number;
  discountAmount?: number;
  additionalCharges?: number;
  taxAmount?: number;
  netAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  details?: SaveSalesInvoiceDetail[] | null;
  charges?: SaveSalesInvoiceCharge[] | null;
  payments?: SaveSalesInvoicePayment[] | null;
}

export interface PostSalesInvoiceRequest {
  periodId: number;
  responsibleName?: string | null;
}

export interface NextSalesInvoiceNumber {
  invoiceNo?: string | null;
}
