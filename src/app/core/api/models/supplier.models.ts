export interface Supplier {
  supplierId: number;
  supplierName?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  inactiveReason?: string | null;
  taxNumber?: string | null;
  isLinkedToGL?: boolean;
  glAccountCode?: number | null;
  email?: string | null;
  type?: number | null;
  city?: string | null;
  country?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface SupplierLookup {
  supplierId: number;
  supplierName?: string | null;
  isActive?: boolean;
}

export interface CreateSupplierRequest {
  supplierName: string;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  inactiveReason?: string | null;
  taxNumber?: string | null;
  isLinkedToGL?: boolean;
  glAccountCode?: number | null;
  email?: string | null;
  type?: number | null;
  city?: string | null;
  country?: string | null;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  supplierId: number;
}
