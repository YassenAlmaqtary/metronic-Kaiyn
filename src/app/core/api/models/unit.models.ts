export interface Unit {
  unitId: number;
  unitName?: string | null;
  statusUnit?: boolean | null;
  arrayShow?: number | null;
}

export interface CreateUnitRequest {
  unitName?: string | null;
  statusUnit?: boolean | null;
  arrayShow?: number | null;
}

export interface UpdateUnitRequest {
  unitId: number;
  unitName?: string | null;
  statusUnit?: boolean | null;
  arrayShow?: number | null;
}
