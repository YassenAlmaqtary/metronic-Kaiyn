export interface Salesman {
  salesmanId: number;
  salesmanNameAr?: string | null;
  salesmanNameEn?: string | null;
  phone?: string | null;
  commissionRate?: number | null;
  isActive?: boolean | null;
}

export interface CreateSalesmanRequest {
  salesmanNameAr: string;
  salesmanNameEn?: string | null;
  phone?: string | null;
  commissionRate?: number | null;
  isActive?: boolean | null;
}

export interface UpdateSalesmanRequest {
  salesmanId: number;
  salesmanNameAr: string;
  salesmanNameEn?: string | null;
  phone?: string | null;
  commissionRate?: number | null;
  isActive?: boolean | null;
}
