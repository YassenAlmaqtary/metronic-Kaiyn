export interface StockReceivingType {
  receivingTypeId: number;
  receivingTypeName?: string | null;
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

export interface SaveStockReceivingTypeRequest {
  receivingTypeId?: number;
  receivingTypeName: string;
  debitAccountId: number;
  creditAccountId: number;
  description?: string | null;
  isActive?: boolean;
}
