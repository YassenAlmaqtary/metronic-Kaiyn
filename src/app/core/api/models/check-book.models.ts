export const CheckBookStatus = {
  Active: 1,
  Finished: 2,
  Cancelled: 3,
} as const;

export type CheckBookStatusValue = (typeof CheckBookStatus)[keyof typeof CheckBookStatus];

export interface CheckBook {
  checkBookID: number;
  bankAccountID: number;
  bankAccountName?: string | null;
  bankName?: string | null;
  checkBookNumber?: string | null;
  checkBookName?: string | null;
  startCheckNumber?: number | null;
  endCheckNumber?: number | null;
  currentCheckNumber?: number | null;
  issueDate?: string | null;
  status?: number | null;
  alertBeforeEnd?: number | null;
  remainingChecks?: number | null;
  createdBy?: number | null;
  createdDate?: string | null;
}

export interface CreateCheckBookRequest {
  bankAccountID: number;
  checkBookNumber: string;
  createdBy: number;
  endCheckNumber: number;
  issueDate: string;
  startCheckNumber: number;
  checkBookName?: string | null;
  status?: number | null;
  alertBeforeEnd?: number | null;
}

export interface UpdateCheckBookRequest {
  checkBookID: number;
  bankAccountID: number;
  checkBookNumber: string;
  startCheckNumber: number;
  endCheckNumber: number;
  issueDate: string;
  status: number;
  alertBeforeEnd?: number | null;
  checkBookName?: string | null;
}
