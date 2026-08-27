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

export interface ItemMovementFilter {
  itemId: number;
  fromDate?: string | null;
  toDate?: string | null;
  branchId?: number | null;
  storeId?: number | null;
  movementTypeId?: number | null;
}

export interface ItemMovementDetail {
  movementId?: number;
  movementDate?: string | null;
  movementTypeName?: string | null;
  operationNumber?: string | null;
  operationType?: string | null;
  storeName?: string | null;
  unitName?: string | null;
  documentQuantity?: number;
  inward?: number;
  outward?: number;
  averageCost?: number;
  unitCost?: number;
  totalMovementCost?: number;
  runningQuantity?: number;
  runningValue?: number;
  batchNumber?: string | null;
  notes?: string | null;
}

export interface ItemMovementReportResult {
  openingBalance?: number;
  totalInward?: number;
  totalOutward?: number;
  closingBalance?: number;
  transactions?: ItemMovementDetail[] | null;
}

export interface StockIssueReportFilter {
  fromDate?: string | null;
  toDate?: string | null;
  branchId?: number | null;
  storeId?: number | null;
  status?: number;
  searchTerm?: string | null;
}

export interface StockIssueReportRow {
  issueNumber?: string | null;
  issueDate?: string | null;
  branchName?: string | null;
  storeName?: string | null;
  currencyName?: string | null;
  issueToName?: string | null;
  itemName?: string | null;
  unitName?: string | null;
  quantity?: number;
  price?: number;
  total?: number;
  statusName?: string | null;
  responsibleName?: string | null;
}

export interface StockIssueReportResult {
  rowsCount?: number;
  totalAmount?: number;
  items?: StockIssueReportRow[] | null;
}
