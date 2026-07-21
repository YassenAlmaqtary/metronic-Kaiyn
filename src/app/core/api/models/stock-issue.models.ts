import {
  NextVoucherNumber,
  ProductBarcodeResult,
  AvailableQtyResult,
  ItemUnitLookup,
  StockLineDetail,
  StockDocStatus,
} from './stock-shared.models';

export { StockDocStatus, type StockDocStatusValue } from './stock-shared.models';
export type {
  NextVoucherNumber,
  ProductBarcodeResult,
  AvailableQtyResult,
  ItemUnitLookup,
  StockLineDetail,
};

export interface StockIssueType {
  issueTypeId: number;
  issueTypeName?: string | null;
  description?: string | null;
  debitAccountId?: number;
  creditAccountId?: number;
  isActive?: boolean;
}

export interface StockIssueHeader {
  issueId: number;
  issueNumber?: string | null;
  issueDate?: string | null;
  branchId: number;
  branchName?: string | null;
  storeId: number;
  storeName?: string | null;
  issueToName?: string | null;
  currencyId?: number | null;
  currencyName?: string | null;
  exchangeRate?: number;
  reference?: string | null;
  issueTypeId?: number | null;
  issueTypeName?: string | null;
  scheduleDate?: string | null;
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

export type StockIssueListItem = StockIssueHeader;

export interface SaveStockIssueRequest {
  issueId?: number;
  issueNumber: string;
  issueDate: string;
  branchId: number;
  storeId: number;
  issueToName?: string | null;
  currencyId?: number | null;
  exchangeRate?: number;
  reference?: string | null;
  issueTypeId?: number | null;
  scheduleDate?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
  totalAmount?: number;
  details?: StockLineDetail[] | null;
}
