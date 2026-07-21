export const StockTakingStatus = {
  Draft: 1,
  Posted: 2,
  Cancelled: 3,
} as const;

export type StockTakingStatusValue =
  (typeof StockTakingStatus)[keyof typeof StockTakingStatus];

export const StockTakingType = {
  Full: 1,
  Partial: 2,
} as const;

export interface StoreItemForTaking {
  itemId: number;
  itemName?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  systemQty?: number;
  averageCost?: number;
}

export interface TakingAvailableForAdjustment {
  takingId: number;
  takingNo?: string | null;
  takingDate?: string;
  storeId: number;
  storeName?: string | null;
  itemsWithDifference?: number;
}

export interface StockTakingDetail {
  detailId?: number;
  itemId: number;
  itemName?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  systemQty?: number;
  countedQty?: number;
  differenceQty?: number;
  averageCost?: number;
  differenceValue?: number;
  notes?: string | null;
}

export interface SaveStockTakingDetail {
  itemId: number;
  unitId: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  systemQty?: number;
  countedQty?: number;
  differenceQty?: number;
  averageCost?: number;
  differenceValue?: number;
  notes?: string | null;
}

export interface StockTakingHeader {
  takingId: number;
  takingNo?: string | null;
  storeId: number;
  storeName?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  takingDate?: string | null;
  takingType?: number;
  takingTypeName?: string | null;
  statusId?: number;
  statusName?: string | null;
  responsibleUserId?: number | null;
  responsibleUserName?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdDate?: string | null;
  postedBy?: number | null;
  postedDate?: string | null;
  totalDifferenceValue?: number;
  itemsWithDifference?: number;
  details?: StockTakingDetail[] | null;
}

export type StockTakingListItem = StockTakingHeader;

export interface SaveStockTakingRequest {
  takingId?: number;
  storeId: number;
  takingDate: string;
  takingType?: number;
  responsibleUserId?: number | null;
  notes?: string | null;
  details: SaveStockTakingDetail[];
}

export function isTakingDraft(statusId?: number | null): boolean {
  return statusId == null || statusId === StockTakingStatus.Draft;
}

export function isTakingPosted(statusId?: number | null): boolean {
  return statusId === StockTakingStatus.Posted;
}
