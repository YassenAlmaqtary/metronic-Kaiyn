export interface AccountingPeriod {
  periodId: number;
  periodName?: string | null;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedBy?: number | null;
  closedAt?: string | null;
  fiscalYear: number;
  createdAt?: string;
}

/** Alias used by sales invoices and other lookups. */
export type AccountingPeriodLookup = AccountingPeriod;

export interface CreateAccountingPeriodRequest {
  periodName: string;
  startDate: string;
  endDate: string;
  isClosed?: boolean;
  fiscalYear: number;
}

export type UpdateAccountingPeriodRequest = CreateAccountingPeriodRequest;
