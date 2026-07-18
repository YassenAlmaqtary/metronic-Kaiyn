export interface CostCenter {
  costCenterId: number;
  costCenterCode?: string | null;
  costCenterName?: string | null;
  branchId?: number | null;
  isActive: boolean;
  notes?: string | null;
  parentId?: number | null;
  level: number;
  fullPath?: string | null;
}

export interface CreateCostCenterRequest {
  costCenterCode: string;
  costCenterName: string;
  branchId?: number | null;
  isActive?: boolean;
  notes?: string | null;
  parentId?: number | null;
  level?: number;
  fullPath?: string | null;
}

export type UpdateCostCenterRequest = CreateCostCenterRequest;
