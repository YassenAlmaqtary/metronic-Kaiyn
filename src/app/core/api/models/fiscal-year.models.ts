export interface FiscalYear {
  fiscalYearId: number;
  year: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  description?: string | null;
}

export interface CreateFiscalYearRequest {
  year: number;
  startDate: string;
  endDate: string;
  isClosed?: boolean;
  description?: string | null;
}

export type UpdateFiscalYearRequest = CreateFiscalYearRequest;
