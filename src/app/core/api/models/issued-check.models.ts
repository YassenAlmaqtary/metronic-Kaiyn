export const IssuedCheckStatus = {
  Draft: 1,
  Issued: 2,
  Posted: 3,
  Paid: 4,
  Cancelled: 5,
  Bounced: 6,
} as const;

export type IssuedCheckStatusValue = (typeof IssuedCheckStatus)[keyof typeof IssuedCheckStatus];

export interface IssuedCheck {
  checkID: number;
  checkBookID: number;
  checkBookNumber?: string | null;
  checkNumber?: string | null;
  bankAccountID: number;
  bankAccountName?: string | null;
  checkDate?: string | null;
  payeeName?: string | null;
  payeeID?: number | null;
  amount?: number | null;
  currencyID: number;
  currencyName?: string | null;
  exchangeRate?: number | null;
  baseCurrencyAmount?: number | null;
  checkAmountInWords?: string | null;
  purpose?: string | null;
  status?: number | null;
  statusName?: string | null;
  paymentDate?: string | null;
  clearingDate?: string | null;
  branchID: number;
  gL_AccountID: number;
  gL_AccountName?: string | null;
  costCenterID?: number | null;
  costCenterName?: string | null;
  isPosted?: boolean | null;
  isPrinted?: boolean | null;
  approvalStatus?: number | null;
  approvalStatusName?: string | null;
  createdBy?: number | null;
  createdDate?: string | null;
  notes?: string | null;
}

export interface IssueCheckRequest {
  amount: number;
  bankAccountID: number;
  branchID: number;
  checkBookID: number;
  checkDate: string;
  createdBy: number;
  currencyID: number;
  gL_AccountID: number;
  payeeName: string;
  payeeID?: number | null;
  exchangeRate?: number | null;
  purpose?: string | null;
  costCenterID?: number | null;
  notes?: string | null;
}

export interface PayCheckRequest {
  paymentDate: string;
  clearingDate?: string | null;
  userId: number;
}

export interface RejectRequest {
  reason?: string | null;
  userId: number;
}
