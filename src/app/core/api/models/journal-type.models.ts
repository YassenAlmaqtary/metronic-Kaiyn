export type { JournalType } from './journal-entry.models';

export interface CreateJournalTypeRequest {
  code: string;
  name: string;
  description?: string | null;
  allowManualEntry?: boolean;
  autoGenerate?: boolean;
  affectsBalances?: boolean;
  defaultDebitAccountId?: number | null;
  defaultCreditAccountId?: number | null;
  allowCrossBranches?: boolean;
  isActive?: boolean;
}

export interface UpdateJournalTypeRequest {
  journalTypeId: number;
  code: string;
  name: string;
  description?: string | null;
  allowManualEntry?: boolean;
  autoGenerate?: boolean;
  affectsBalances?: boolean;
  defaultDebitAccountId?: number | null;
  defaultCreditAccountId?: number | null;
  allowCrossBranches?: boolean;
  isActive?: boolean;
}
