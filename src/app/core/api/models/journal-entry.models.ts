export const JournalEntryStatus = {
  Unposted: 0,
  Posted: 1,
} as const;

export type JournalEntryStatusValue =
  (typeof JournalEntryStatus)[keyof typeof JournalEntryStatus];

export interface JournalEntryDetail {
  id?: number;
  entryId?: number | null;
  accCode: number;
  debit?: number | null;
  credit?: number | null;
  description?: string | null;
  isTransferred?: boolean;
  costCenterId?: number | null;
  branchId?: number | null;
  isTaxable?: boolean | null;
  accId?: number | null;
  currencyId?: number | null;
  amountInCurrency?: number | null;
  amountInLocalCurrency?: number | null;
  exchangeRate?: number | null;
  taxSetupId?: number | null;
}

export interface JournalEntry {
  entryId: number;
  id?: number;
  entryDate?: string | null;
  status?: number | null;
  userId?: string | null;
  referenceId?: number | null;
  dateCreated?: string | null;
  branchId?: number | null;
  periodId?: number | null;
  isClosingEntry: boolean;
  isAdjusted: boolean;
  journalTypeId?: number | null;
  datePosted?: string | null;
  postedBy?: string | null;
  isReversingEntry: boolean;
  originalEntryId?: number | null;
  details?: JournalEntryDetail[] | null;
  totalDebit?: number;
  totalCredit?: number;
  isBalanced?: boolean;
}

export interface CreateJournalEntryDetailRequest {
  accCode: number;
  debit?: number | null;
  credit?: number | null;
  description?: string | null;
  costCenterId?: number | null;
  branchId?: number | null;
  isTaxable?: boolean | null;
  accId?: number | null;
  currencyId?: number | null;
  amountInCurrency?: number | null;
  amountInLocalCurrency?: number | null;
  exchangeRate?: number | null;
  taxSetupId?: number | null;
}

export interface CreateJournalEntryRequest {
  entryId: number;
  entryDate?: string | null;
  status?: number | null;
  userId?: string | null;
  referenceId?: number | null;
  branchId?: number | null;
  periodId?: number | null;
  isClosingEntry?: boolean;
  isAdjusted?: boolean;
  journalTypeId?: number | null;
  isReversingEntry?: boolean;
  originalEntryId?: number | null;
  details: CreateJournalEntryDetailRequest[];
}

export type UpdateJournalEntryRequest = Omit<CreateJournalEntryRequest, 'entryId'>;

export interface BulkPostJournalRequest {
  entryIds: number[];
}

export interface BulkPostItemResult {
  entryId: number;
  success: boolean;
  message?: string | null;
}

export interface BulkPostResult {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  results?: BulkPostItemResult[] | null;
}

export interface JournalType {
  journalTypeId: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  isSystem: boolean;
  allowManualEntry: boolean;
  autoGenerate: boolean;
  affectsBalances: boolean;
  defaultDebitAccountId?: number | null;
  defaultCreditAccountId?: number | null;
  allowCrossBranches: boolean;
  isActive: boolean;
}

export function isJournalEntryPosted(entry: JournalEntry): boolean {
  if (entry.datePosted) {
    return true;
  }
  return entry.status === JournalEntryStatus.Posted;
}
