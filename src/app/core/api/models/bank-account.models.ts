export const BankAccountType = {
  Current: 1,
  Savings: 2,
  Deposit: 3,
} as const;

export type BankAccountTypeValue = (typeof BankAccountType)[keyof typeof BankAccountType];

export const BankAccountStatus = {
  Active: 1,
  Inactive: 2,
  Closed: 3,
} as const;

export type BankAccountStatusValue = (typeof BankAccountStatus)[keyof typeof BankAccountStatus];

export interface BankAccount {
  bankAccountID: number;
  bankID: number;
  bankName?: string | null;
  branchID: number;
  accountName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  accountType: number;
  accountStatus: number;
  gl_AccountID: number;
  currencyID: number;
  currencyName?: string | null;
  allowMultiCurrency?: boolean | null;
  exchangeRatePolicy?: number | null;
  defaultCostCenter?: number | null;
  exchangeDiffAccountID?: number | null;
  openingBalance?: number | null;
  openingBalanceDate?: string | null;
  openingBalanceVoucher?: string | null;
  supportsChecks?: boolean | null;
  supportsTransfers?: boolean | null;
  supportsReconciliation?: boolean | null;
  isHidden?: boolean | null;
  notes?: string | null;
  lastReconciliationDate?: string | null;
  currentBalance?: number | null;
  availableBalance?: number | null;
  hasTransactions?: boolean | null;
  createdBy?: number | null;
  createdDate?: string | null;
  swiftCode?: string | null;
  requireCheckApproval?: boolean | null;
}

export interface CreateBankAccountRequest {
  accountName: string;
  accountNumber: string;
  accountStatus: number;
  accountType: number;
  bankID: number;
  branchID: number;
  createdBy: number;
  currencyID: number;
  gL_AccountID: number;
  iban?: string | null;
  allowMultiCurrency?: boolean | null;
  exchangeRatePolicy?: number | null;
  defaultCostCenter?: number | null;
  exchangeDiffAccountID?: number | null;
  openingBalance?: number | null;
  openingBalanceDate?: string | null;
  openingBalanceVoucher?: string | null;
  supportsChecks?: boolean | null;
  supportsTransfers?: boolean | null;
  supportsReconciliation?: boolean | null;
  isHidden?: boolean | null;
  notes?: string | null;
  swiftCode?: string | null;
  requireCheckApproval?: boolean | null;
}

export interface UpdateBankAccountRequest {
  bankAccountID: number;
  accountName: string;
  accountNumber: string;
  accountStatus: number;
  accountType: number;
  bankID: number;
  branchID: number;
  currencyID: number;
  gL_AccountID: number;
  iban?: string | null;
  allowMultiCurrency?: boolean | null;
  exchangeRatePolicy?: number | null;
  defaultCostCenter?: number | null;
  exchangeDiffAccountID?: number | null;
  openingBalance?: number | null;
  openingBalanceDate?: string | null;
  openingBalanceVoucher?: string | null;
  supportsChecks?: boolean | null;
  supportsTransfers?: boolean | null;
  supportsReconciliation?: boolean | null;
  isHidden?: boolean | null;
  notes?: string | null;
  swiftCode?: string | null;
  requireCheckApproval?: boolean | null;
}
