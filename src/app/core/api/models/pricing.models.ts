export interface PriceList {
  priceListId: number;
  listName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface CreatePriceListRequest {
  listName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export type UpdatePriceListRequest = CreatePriceListRequest;

export interface BranchPriceListAssignment {
  assignmentId: number;
  priceListId: number;
  listName?: string | null;
  branchId: number;
  branchName?: string | null;
  isDefault?: boolean;
  priority?: number;
}

export interface CreateBranchAssignmentRequest {
  priceListId: number;
  branchId: number;
  isDefault?: boolean;
  priority?: number;
}

export type UpdateBranchAssignmentRequest = CreateBranchAssignmentRequest;

export interface PricingDashboardItem {
  productId: number;
  proName?: string | null;
  groupId?: number;
  uomId: number;
  unitName?: string | null;
  unitCost?: number;
  currentPrice?: number;
  minPrice?: number;
  priceId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProductPriceRequest {
  productId: number;
  priceListId: number;
  uomId: number;
  newPrice: number;
  minPrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface BulkUpdatePricesRequest {
  priceListId: number;
  percentageChange: number;
  categoryId?: number | null;
  productIds?: number[] | null;
}

export interface PriceChangeLog {
  logId: number;
  proName?: string | null;
  listName?: string | null;
  oldPrice?: number;
  newPrice?: number;
  changeDate?: string;
  userName?: string | null;
}

export interface PriceChangeLogFilter {
  startDate?: string | null;
  endDate?: string | null;
  productId?: number | null;
  priceListId?: number | null;
}
