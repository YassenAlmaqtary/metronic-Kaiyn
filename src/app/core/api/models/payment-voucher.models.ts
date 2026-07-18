export interface PaymentType {
  paymentTypeId: number;
  paymentTypeName?: string | null;
  defaultAccountId?: number | null;
}

export interface PaymentVoucherLine {
  lineId?: number;
  voucherId?: number;
  debitAccountId: number;
  debitAccountName?: string | null;
  costCenterId?: number | null;
  costCenterName?: string | null;
  description?: string | null;
  amount: number;
  amountLc?: number | null;
  isTaxable?: boolean | null;
  taxSetupId?: number | null;
  taxSetupName?: string | null;
  branchId?: number | null;
}

export interface PaymentVoucher {
  voucherId: number;
  voucherNumber?: string | null;
  voucherDate: string;
  description?: string | null;
  beneficiaryName?: string | null;
  beneficiaryId?: number | null;
  paymentTypeId: number;
  paymentTypeName?: string | null;
  defaultAccountId?: number | null;
  creditAccountId: number;
  creditAccountName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  currencyId: number;
  currencyName?: string | null;
  exchangeRate?: number | null;
  totalAmount: number;
  totalAmountLc?: number | null;
  preparedBy?: number | null;
  preparedByName?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  isApproved: boolean;
  reference?: string | null;
  createdDate?: string | null;
  lines?: PaymentVoucherLine[] | null;
}

export interface CreatePaymentVoucherLineRequest {
  debitAccountId: number;
  amount: number;
  costCenterId?: number | null;
  description?: string | null;
  amountLc?: number | null;
  isTaxable?: boolean | null;
  taxSetupId?: number | null;
  branchId?: number | null;
}

export interface CreatePaymentVoucherRequest {
  voucherNumber: string;
  voucherDate: string;
  beneficiaryName: string;
  paymentTypeId: number;
  creditAccountId: number;
  currencyId: number;
  totalAmount: number;
  lines: CreatePaymentVoucherLineRequest[];
  description?: string | null;
  beneficiaryId?: number | null;
  branchId?: number | null;
  exchangeRate?: number | null;
  totalAmountLc?: number | null;
  reference?: string | null;
}

export type UpdatePaymentVoucherRequest = Omit<CreatePaymentVoucherRequest, 'voucherNumber'>;

export interface ReceiptVoucherLine {
  lineId?: number;
  voucherId?: number;
  creditAccountId: number;
  creditAccountName?: string | null;
  costCenterId?: number | null;
  costCenterName?: string | null;
  description?: string | null;
  amount: number;
  amountLc?: number | null;
  isTaxable?: boolean | null;
  taxSetupId?: number | null;
  taxSetupName?: string | null;
  branchId?: number | null;
}

export interface ReceiptVoucher {
  voucherId: number;
  voucherNumber?: string | null;
  voucherDate: string;
  description?: string | null;
  payerName?: string | null;
  paymentTypeId: number;
  paymentTypeName?: string | null;
  debitAccountId: number;
  debitAccountName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  currencyId: number;
  currencyName?: string | null;
  exchangeRate?: number | null;
  totalAmount: number;
  totalAmountLc?: number | null;
  preparedBy?: number | null;
  preparedByName?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  isApproved: boolean;
  reference?: string | null;
  createdDate?: string | null;
  lines?: ReceiptVoucherLine[] | null;
}

export interface CreateReceiptVoucherLineRequest {
  creditAccountId: number;
  amount: number;
  costCenterId?: number | null;
  description?: string | null;
  amountLc?: number | null;
  isTaxable?: boolean | null;
  taxSetupId?: number | null;
  branchId?: number | null;
}

export interface CreateReceiptVoucherRequest {
  voucherNumber?: string | null;
  voucherDate: string;
  payerName: string;
  paymentTypeId: number;
  debitAccountId: number;
  currencyId: number;
  totalAmount: number;
  lines: CreateReceiptVoucherLineRequest[];
  description?: string | null;
  branchId?: number | null;
  exchangeRate?: number | null;
  totalAmountLc?: number | null;
  reference?: string | null;
}

export type UpdateReceiptVoucherRequest = Omit<CreateReceiptVoucherRequest, 'voucherNumber'>;
