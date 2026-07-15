export interface CustomerGroup {
  groupId: number;
  groupNameAr?: string | null;
  groupNameEn?: string | null;
  isActive?: boolean | null;
  accountId?: number | null;
  accountCode?: number | null;
  accountName?: string | null;
}

export interface CreateCustomerGroupRequest {
  groupNameAr: string;
  groupNameEn?: string | null;
  isActive?: boolean | null;
  accountId?: number | null;
  accountCode?: number | null;
}

export interface UpdateCustomerGroupRequest {
  groupId: number;
  groupNameAr: string;
  groupNameEn?: string | null;
  isActive?: boolean | null;
  accountId?: number | null;
  accountCode?: number | null;
}
