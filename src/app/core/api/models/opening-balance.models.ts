export interface OpeningBalanceAccountLine {
  id?: number;
  accId: number;
  accCode?: string | null;
  accName?: string | null;
  debit: number;
  credit: number;
  notes?: string | null;
}

export interface OpeningBalancePartnerLine {
  id?: number;
  partnerType: number;
  partnerId: number;
  partnerName?: string | null;
  accId: number;
  accName?: string | null;
  debit: number;
  credit: number;
  dueDate?: string | null;
  reference?: string | null;
}

export interface OpeningBalanceInventoryLine {
  id?: number;
  itemId: number;
  itemName?: string | null;
  barcode?: string | null;
  warehouseId: number;
  warehouseName?: string | null;
  quantity: number;
  unitCost: number;
  totalValue?: number;
}

export interface OpeningBalance {
  openingId: number;
  periodId: number;
  periodName?: string | null;
  fiscalYearId: number;
  year?: number | null;
  branchId?: number | null;
  branchName?: string | null;
  costCenterId?: number | null;
  costCenterName?: string | null;
  openingDate: string;
  currencyId: number;
  currencyName?: string | null;
  exchangeRate: number;
  isPosted: boolean;
  postedEntryId?: number | null;
  createdBy?: number;
  createdByName?: string | null;
  createdAt?: string;
  accounts?: OpeningBalanceAccountLine[] | null;
  partners?: OpeningBalancePartnerLine[] | null;
  inventoryItems?: OpeningBalanceInventoryLine[] | null;
}

export interface CreateOpeningBalanceAccountRequest {
  accId: number;
  debit?: number;
  credit?: number;
  notes?: string | null;
}

export interface CreateOpeningBalancePartnerRequest {
  partnerType: number;
  partnerId: number;
  accId: number;
  debit?: number;
  credit?: number;
  dueDate?: string | null;
  reference?: string | null;
}

export interface CreateOpeningBalanceInventoryRequest {
  itemId: number;
  warehouseId: number;
  quantity: number;
  unitCost: number;
}

export interface CreateOpeningBalanceRequest {
  periodId: number;
  fiscalYearId: number;
  branchId?: number | null;
  costCenterId?: number | null;
  openingDate: string;
  currencyId: number;
  exchangeRate: number;
  accounts?: CreateOpeningBalanceAccountRequest[] | null;
  partners?: CreateOpeningBalancePartnerRequest[] | null;
  inventoryItems?: CreateOpeningBalanceInventoryRequest[] | null;
}

export interface UpdateOpeningBalanceRequest extends CreateOpeningBalanceRequest {
  openingId: number;
}

export interface PartnerTypeLookup {
  typeId: number;
  typeNameAr?: string | null;
  typeNameEn?: string | null;
  tableReference?: string | null;
}

export interface SupplierLookup {
  supplierId: number;
  supplierName?: string | null;
  isActive?: boolean;
}
