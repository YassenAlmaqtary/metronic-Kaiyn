/** Shared helpers for stock movement documents (issue / transfer / receiving). */

/** Matches API document status (same pattern as sales invoices / stock taking). */
export const StockDocStatus = {
  Pending: 1,
  Posted: 2,
} as const;

export type StockDocStatusValue = (typeof StockDocStatus)[keyof typeof StockDocStatus];

export interface NextVoucherNumber {
  voucherNumber?: string | null;
}

export interface ProductBarcodeResult {
  itemId: number;
  itemName?: string | null;
  unitId: number;
  unitName?: string | null;
  barcode?: string | null;
  conversionFactor?: number;
  isBatchManaged?: boolean;
  hasExpiry?: boolean;
  currentCost?: number;
  isPurchasingUnit?: boolean;
}

export interface AvailableQtyResult {
  itemId: number;
  storeId: number;
  branchId: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  baseQty?: number;
  qtyInUnit?: number;
  conversionFactor?: number;
}

export interface ItemUnitLookup {
  unitId: number;
  unitName?: string | null;
  conversionFactor?: number;
  barcode?: string | null;
  isPurchasingUnit?: boolean;
  isBaseUnit?: boolean;
}

export interface StockLineDetail {
  detailId?: number;
  itemId: number;
  itemName?: string | null;
  barcode?: string | null;
  unitId: number;
  unitName?: string | null;
  quantity: number;
  price: number;
  total: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  locationName?: string | null;
  notes?: string | null;
  isBatchManaged?: boolean;
  hasExpiry?: boolean;
  availableQty?: number;
  conversionFactor?: number;
}

export function isStockDocPosted(
  status?: number | null,
  datePosted?: string | null,
): boolean {
  if (datePosted) {
    return true;
  }
  return status === StockDocStatus.Posted;
}

export function isStockDocPending(
  status?: number | null,
  datePosted?: string | null,
): boolean {
  return !isStockDocPosted(status, datePosted);
}
