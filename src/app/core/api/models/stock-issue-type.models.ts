export interface StockIssueType {
  issueTypeId: number;
  issueTypeName?: string | null;
  debitAccountId?: number;
  debitAccountName?: string | null;
  debitAccountCode?: string | null;
  creditAccountId?: number;
  creditAccountName?: string | null;
  creditAccountCode?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface SaveStockIssueTypeRequest {
  issueTypeId?: number;
  issueTypeName: string;
  debitAccountId: number;
  creditAccountId: number;
  description?: string | null;
  isActive?: boolean;
}
