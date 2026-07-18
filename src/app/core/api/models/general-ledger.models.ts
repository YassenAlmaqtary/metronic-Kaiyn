export interface GeneralLedgerTransaction {
  ledgerID?: number;
  entryID: number;
  accID: number;
  accCode: number;
  debit?: number | null;
  credit?: number | null;
  balance?: number | null;
  transactionDate?: string | null;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  branchID: number;
  costCenterID?: number | null;
  userID?: number | null;
  referenceNo?: string | null;
  currencyID?: number | null;
  amountInCurrency?: number | null;
  exchangeRate?: number | null;
  taxSetupID?: number | null;
  taxAmount?: number | null;
  taxType?: string | null;
  accName?: string | null;
  accName_2?: string | null;
}

export interface AccountLedgerReport {
  accId: number;
  accCode?: string | null;
  accName?: string | null;
  openingBalance: number;
  netBalance: number;
  transactions?: GeneralLedgerTransaction[] | null;
}

export interface TrialBalanceRow {
  accCode: number;
  accId: number;
  accName?: string | null;
  accName2?: string | null;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  branchId?: number | null;
}

export interface GeneralLedgerQueryParams {
  accId: number;
  fromDate?: string | null;
  toDate?: string | null;
  branchId?: number | null;
  costCenterId?: number | null;
}

export interface TrialBalanceQueryParams {
  fromDate?: string | null;
  toDate?: string | null;
  branchId?: number | null;
}
