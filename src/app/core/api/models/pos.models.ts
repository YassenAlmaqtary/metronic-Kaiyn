/** POS order status — API pattern: `^(Paid|Suspended)$` */
export const PosOrderStatus = {
  Paid: 'Paid',
  Suspended: 'Suspended',
} as const;

export type PosOrderStatusValue = (typeof PosOrderStatus)[keyof typeof PosOrderStatus];

export interface PosCashier {
  cashierId: number;
  userId: number;
  userName?: string | null;
  branchId?: number | null;
  isActive?: boolean | null;
}

export interface CreatePosCashierRequest {
  userId: number;
  branchId?: number | null;
  isActive?: boolean | null;
}

export interface UpdatePosCashierRequest {
  branchId?: number | null;
  isActive?: boolean | null;
}

export interface PosDevice {
  deviceId: number;
  deviceName?: string | null;
  branchId: number;
  storeId: number;
  isActive?: boolean | null;
}

export interface CreatePosDeviceRequest {
  deviceName: string;
  branchId: number;
  storeId: number;
}

export interface UpdatePosDeviceRequest {
  deviceName?: string | null;
  branchId?: number | null;
  storeId?: number | null;
  isActive?: boolean | null;
}

export interface PosShift {
  shiftId: number;
  cashierId: number;
  deviceId: number;
  branchId?: number | null;
  status?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  openingBalance?: number | null;
  closingBalance?: number | null;
}

export interface UpsertPosSettingsRequest {
  branchId: number;
  deviceId?: number | null;
  settings: Record<string, string>;
}

export interface OpenShiftRequest {
  cashierId: number;
  deviceId: number;
  openingBalance?: number | null;
  /** Not always in Swagger, but DB requires BranchId — send to help backend/EF bind. */
  branchId?: number | null;
}

export interface CloseShiftRequest {
  closingBalance?: number | null;
}

export interface PosProductTile {
  productId: number;
  productName?: string | null;
  saleUnitId: number;
  saleUnitName?: string | null;
  salePrice?: number | null;
  stockQty?: number | null;
  costPrice?: number | null;
}

export interface ProductTaxInfo {
  taxRate?: number | null;
  isPriceInclusive?: boolean | null;
}

export interface ProductBatch {
  batchNumber?: string | null;
  expiryDate?: string | null;
  availableQty?: number | null;
}

export interface SavePosOrderItem {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  discountAmount?: number | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  isPromotionReward?: boolean | null;
  promotionDiscountAmount?: number | null;
}

export interface SavePosOrderPayment {
  paymentTypeId: number;
  paymentCategoryId: number;
  currencyId: number;
  exchangeRate: number;
  paidAmount: number;
}

export interface SavePosOrderRequest {
  orderId?: number | null;
  branchId: number;
  warehouseId: number;
  shiftId: number;
  cashierId: number;
  deviceId: number;
  orderDateTime: string;
  currencyId: number;
  exchangeRate: number;
  status: PosOrderStatusValue;
  customerId?: number | null;
  notes?: string | null;
  items: SavePosOrderItem[];
  payment?: SavePosOrderPayment | null;
}

export interface PosOrderItem {
  posOrderItemId?: number | null;
  posOrderId?: number | null;
  /** API field name */
  pro_ID?: number | null;
  productId?: number | null;
  unitId: number;
  qty: number;
  price: number;
  discountAmount?: number | null;
  taxAmount?: number | null;
  lineTotal?: number | null;
  isPromotionReward?: boolean | null;
  promotionDiscountAmount?: number | null;
}

export interface PosOrderPayment {
  paymentId?: number | null;
  posOrderId?: number | null;
  paymentTypeId: number;
  currencyId: number;
  exchangeRate?: number | null;
  paidAmount: number;
}

export interface PosOrderHeader {
  posOrderId: number;
  branchId: number;
  warehouseId: number;
  shiftId: number;
  cashierId: number;
  deviceId: number;
  orderDateTime?: string | null;
  currencyId?: number | null;
  exchangeRate?: number | null;
  status?: string | null;
  subTotal?: number | null;
  discountAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  customerId?: number | null;
  notes?: string | null;
  items?: PosOrderItem[] | null;
  payments?: PosOrderPayment[] | null;
}

export interface PosOrderListItem {
  posOrderId: number;
  orderDateTime?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  customerId?: number | null;
}

export interface SavePosReturnItem {
  productId: number;
  unitId: number;
  returnQty: number;
  reason?: string | null;
}

export interface SavePosReturnRequest {
  originalOrderId: number;
  items: SavePosReturnItem[];
}

export interface PosReturnResponse {
  success?: boolean | null;
  returnOrderId?: number | null;
  message?: string | null;
}
