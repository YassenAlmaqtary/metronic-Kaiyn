export interface AccountingPeriodLookup {
  periodId: number;
  periodName?: string | null;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  fiscalYear: number;
}
