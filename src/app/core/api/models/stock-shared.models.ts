/** Shared helpers for stock movement documents (issue / transfer / receiving). */

/**
 * Status conventions differ by document type:
 * - Receiving / Transfer: 0 = pending, 1 = posted (+ DatePosted)
 * - Issue / Taking / Adjustment: 1 = draft/pending, 2 = posted
 * Prefer datePosted / isPosted / statusName; never treat bare status=1 as posted
 * (that value is draft for issues).
 */
export const StockDocStatus = {
  ReceivingPending: 0,
  ReceivingPosted: 1,
  IssuePending: 1,
  IssuePosted: 2,
  /** @deprecated Prefer ReceivingPending / IssuePending */
  Pending: 0,
  /** Issue/taking posted value; receiving uses ReceivingPosted + datePosted */
  Posted: 2,
} as const;

export type StockDocStatusValue = (typeof StockDocStatus)[keyof typeof StockDocStatus];

export type StockDocKind = 'receiving' | 'transfer' | 'issue' | 'taking' | 'adjustment';

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
  status?: number | string | null,
  datePosted?: string | null,
  extras?: {
    isPosted?: boolean | null;
    statusName?: string | null;
    kind?: StockDocKind;
  },
): boolean {
  if (extras?.isPosted === true) {
    return true;
  }
  const name = String(extras?.statusName ?? '').trim().toLowerCase();
  if (
    name === 'posted' ||
    name === 'مرحل' ||
    name === 'مرحّل' ||
    name.includes('post')
  ) {
    return true;
  }
  const postedAt = typeof datePosted === 'string' ? datePosted.trim() : datePosted;
  if (postedAt && !String(postedAt).startsWith('0001-01-01')) {
    return true;
  }
  const n = Number(status);
  if (!Number.isFinite(n)) {
    return false;
  }
  const kind = extras?.kind;
  if (kind === 'receiving' || kind === 'transfer') {
    return n === StockDocStatus.ReceivingPosted;
  }
  if (kind === 'issue' || kind === 'taking' || kind === 'adjustment') {
    return n === StockDocStatus.IssuePosted;
  }
  // Ambiguous without kind: only status=2 is safely "posted" across types.
  return n === StockDocStatus.IssuePosted;
}

export function isStockDocPending(
  status?: number | string | null,
  datePosted?: string | null,
  extras?: {
    isPosted?: boolean | null;
    statusName?: string | null;
    kind?: StockDocKind;
  },
): boolean {
  return !isStockDocPosted(status, datePosted, extras);
}

/** Normalize stock document header fields from camelCase / PascalCase API payloads. */
export function normalizeStockDocStatusFields(
  raw: Record<string, unknown>,
  kind?: StockDocKind,
): {
  status: number;
  datePosted: string | null;
  isPosted: boolean;
  statusName: string | null;
} {
  const statusRaw = raw['status'] ?? raw['Status'] ?? raw['statusId'] ?? raw['StatusId'];
  const datePostedRaw =
    raw['datePosted'] ??
    raw['DatePosted'] ??
    raw['postedAt'] ??
    raw['PostedAt'] ??
    raw['postedDate'] ??
    raw['PostedDate'] ??
    null;
  const isPostedRaw = raw['isPosted'] ?? raw['IsPosted'];
  const statusNameRaw = raw['statusName'] ?? raw['StatusName'] ?? raw['statusText'] ?? null;

  const datePosted =
    datePostedRaw == null || datePostedRaw === '' ? null : String(datePostedRaw);
  const statusName = statusNameRaw == null ? null : String(statusNameRaw);
  const isPostedFlag = isPostedRaw === true || isPostedRaw === 1 || isPostedRaw === 'true';
  const statusNum = Number(statusRaw);
  const fallbackPending =
    kind === 'issue' || kind === 'taking' || kind === 'adjustment'
      ? StockDocStatus.IssuePending
      : StockDocStatus.ReceivingPending;
  const status = Number.isFinite(statusNum) ? statusNum : fallbackPending;
  const isPosted = isStockDocPosted(status, datePosted, {
    isPosted: isPostedFlag,
    statusName,
    kind,
  });

  return {
    status,
    datePosted,
    isPosted,
    statusName,
  };
}
