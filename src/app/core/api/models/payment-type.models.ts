export interface PaymentType {
  paymentTypeId: number;
  paymentTypeName?: string | null;
  defaultAccountId?: number | null;
}

export interface CreatePaymentTypeRequest {
  paymentTypeName: string;
  defaultAccountId?: number | null;
}

export interface UpdatePaymentTypeRequest {
  paymentTypeName: string;
  defaultAccountId?: number | null;
}
