export interface ProductGroup {
  groupId: number;
  groupName?: string | null;
  status?: boolean | null;
  arrayShow?: number | null;
}

export interface CreateProductGroupRequest {
  groupName?: string | null;
  status?: boolean | null;
  arrayShow?: number | null;
}

export interface UpdateProductGroupRequest {
  groupId: number;
  groupName?: string | null;
  status?: boolean | null;
  arrayShow?: number | null;
}
