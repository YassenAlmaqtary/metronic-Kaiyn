export const StockAdjustmentStatus = {
  Draft: 1,
  Posted: 2,
} as const;

export interface StockAdjustmentDetail {
  adjDetailId?: number;
  itemId: number;
  itemName?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  oldQty?: number;
  adjQty?: number;
  newQty?: number;
  averageCost?: number;
  totalValue?: number;
  isBatchManaged?: boolean;
  hasExpiry?: boolean;
}

export interface SaveStockAdjustmentDetail {
  itemId: number;
  unitId: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  oldQty?: number;
  adjQty?: number;
  newQty?: number;
  averageCost?: number;
  totalValue?: number;
}

export interface StockAdjustmentHeader {
  adjId: number;
  adjNo?: string | null;
  takingId?: number | null;
  takingNo?: string | null;
  storeId: number;
  storeName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  adjDate?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdDate?: string | null;
  statusId?: number;
  statusName?: string | null;
  postedBy?: number | null;
  postedDate?: string | null;
  totalValue?: number;
  details?: StockAdjustmentDetail[] | null;
}

export type StockAdjustmentListItem = StockAdjustmentHeader;

export interface SaveStockAdjustmentRequest {
  adjId?: number;
  takingId?: number | null;
  storeId: number;
  adjDate: string;
  notes?: string | null;
  details: SaveStockAdjustmentDetail[];
}

export interface PostAdjustmentResult {
  success?: boolean;
  message?: string | null;
  failedItems?: string[] | null;
}

export function isAdjustmentDraft(statusId?: number | null): boolean {
  return statusId == null || statusId === StockAdjustmentStatus.Draft;
}
