export interface Brand {
  brandId: number;
  brandArName?: string | null;
  brandEnName?: string | null;
  details?: string | null;
  companyId?: number | null;
  status?: boolean | null;
}

export interface CreateBrandRequest {
  brandArName: string;
  brandEnName: string;
  details: string;
  companyId: number;
  status?: boolean;
}

export interface UpdateBrandRequest {
  brandId: number;
  brandArName: string;
  brandEnName: string;
  details: string;
  companyId: number;
  status?: boolean;
}
