import { StockLineDetail, StockDocStatus, isStockDocPending, isStockDocPosted } from './stock-shared.models';

export { StockDocStatus, type StockDocStatusValue, isStockDocPending, isStockDocPosted } from './stock-shared.models';
export type { StockLineDetail };

export interface StockReceivingType {
  receivingTypeId: number;
  receivingTypeName?: string | null;
  description?: string | null;
  debitAccountId?: number;
  creditAccountId?: number;
  isActive?: boolean;
}

export interface StockReceivingHeader {
  receivingId: number;
  receivingNumber?: string | null;
  receivingDate?: string | null;
  branchId: number;
  branchName?: string | null;
  storeId: number;
  storeName?: string | null;
  supplierId?: number | null;
  currencyId?: number | null;
  currencyName?: string | null;
  exchangeRate?: number;
  reference?: string | null;
  receivingTypeId?: number | null;
  receivingTypeName?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  totalAmount?: number;
  status?: number;
  userId?: number;
  dateCreated?: string | null;
  datePosted?: string | null;
  postedBy?: number | null;
  details?: StockLineDetail[] | null;
}

export type StockReceivingListItem = StockReceivingHeader;

export interface SaveStockReceivingRequest {
  receivingId?: number;
  receivingNumber: string;
  receivingDate: string;
  branchId: number;
  storeId: number;
  supplierId?: number | null;
  currencyId?: number | null;
  exchangeRate?: number;
  reference?: string | null;
  receivingTypeId?: number | null;
  responsibleName?: string | null;
  notes?: string | null;
  totalAmount?: number;
  details?: StockLineDetail[] | null;
}
