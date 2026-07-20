export interface Store {
  storeId: number;
  storeName?: string | null;
  status?: boolean | null;
  locationStore?: string | null;
  branchId?: number | null;
  userId?: number | null;
  orderNumber?: number | null;
  dateCreated?: string | null;
}

export type StoreLookup = Pick<Store, 'storeId' | 'storeName' | 'status' | 'branchId'>;

export interface CreateStoreRequest {
  storeName?: string | null;
  status?: boolean | null;
  locationStore?: string | null;
  branchId?: number | null;
  userId?: number | null;
  orderNumber?: number | null;
}

export interface UpdateStoreRequest {
  storeId: number;
  storeName?: string | null;
  status?: boolean | null;
  locationStore?: string | null;
  branchId?: number | null;
  userId?: number | null;
  orderNumber?: number | null;
}
