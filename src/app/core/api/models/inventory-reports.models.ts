export interface CurrentStockFilter {
  branchId?: number | null;
  storeId?: number | null;
  itemId?: number | null;
  barcode?: string | null;
  hideZeroes?: boolean;
}

export interface CurrentStockDetail {
  itemId: number;
  storeId: number;
  branchId: number;
  itemName?: string | null;
  itemCode?: string | null;
  storeName?: string | null;
  branchName?: string | null;
  baseUnitName?: string | null;
  actualQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  averageCostWAC?: number;
  lastPurchasePrice?: number;
  totalStockValueWAC?: number;
  nearestExpiryDate?: string | null;
  batchNumber?: string | null;
}

export interface CurrentStockReportResult {
  totalItemsCount?: number;
  totalStockValue?: number;
  totalReservedQuantity?: number;
  totalAvailableQuantity?: number;
  items?: CurrentStockDetail[] | null;
}
