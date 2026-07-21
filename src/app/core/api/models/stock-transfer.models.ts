import { StockLineDetail, StockDocStatus } from './stock-shared.models';

export { StockDocStatus, type StockDocStatusValue } from './stock-shared.models';
export type { StockLineDetail };

export interface StockTransferHeader {
  transferId: number;
  transferNumber?: string | null;
  transferDate?: string | null;
  fromBranchId: number;
  fromBranchName?: string | null;
  fromStoreId: number;
  fromStoreName?: string | null;
  toBranchId: number;
  toBranchName?: string | null;
  toStoreId: number;
  toStoreName?: string | null;
  currencyId?: number | null;
  currencyName?: string | null;
  exchangeRate?: number;
  reference?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  totalAmount?: number;
  status?: number;
  userId?: number;
  dateCreated?: string | null;
  datePosted?: string | null;
  details?: StockLineDetail[] | null;
}

export type StockTransferListItem = StockTransferHeader;

export interface SaveStockTransferRequest {
  transferId?: number;
  transferNumber: string;
  transferDate: string;
  fromBranchId: number;
  fromStoreId: number;
  toBranchId: number;
  toStoreId: number;
  currencyId?: number | null;
  exchangeRate?: number;
  reference?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  totalAmount?: number;
  details?: StockLineDetail[] | null;
}
