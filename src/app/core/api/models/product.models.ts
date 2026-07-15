export interface ProductLookup {
  productId: number;
  productName?: string | null;
  proCode?: string | null;
  taxRate?: number | null;
  groupId?: number | null;
  isTax?: boolean | null;
}

export interface ProductUnit {
  unitId: number;
  unitName?: string | null;
  conversionFactor: number;
  isBaseUnit: boolean;
  isPurchasingUnit: boolean;
  isSalesUnit: boolean;
  barcode?: string | null;
}

export interface Product extends ProductLookup {
  minQty?: number | null;
  maxDiscount?: number | null;
  taxTypeId?: number | null;
  taxTypeName?: string | null;
  groupName?: string | null;
  typeId?: number | null;
  shelfsName?: string | null;
  productNameScientific?: string | null;
  hasExpiry?: boolean | null;
  warningExpiry?: number | null;
  isBundle?: boolean | null;
  isBatchManaged?: boolean | null;
  defaultSalesPrice?: number | null;
  minSalesPrice?: number | null;
  currentCost?: number | null;
  priceTaxInclusive?: boolean | null;
  accountingPolicyId?: number | null;
  accountingPolicyName?: string | null;
  status?: boolean | null;
  brandId?: number | null;
  brandName?: string | null;
  productImage?: string | null;
  units?: ProductUnit[] | null;
}

export interface CreateProductUnitRequest {
  unitId: number;
  unitName?: string | null;
  conversionFactor: number;
  isBaseUnit?: boolean;
  isPurchasingUnit?: boolean;
  isSalesUnit?: boolean;
  barcode?: string | null;
}

export interface CreateProductRequest {
  productName: string;
  productNameScientific?: string | null;
  proCode?: string | null;
  minQty?: number | null;
  maxDiscount?: number | null;
  groupId: number;
  typeId?: number | null;
  shelfsName?: string | null;
  isTax?: boolean;
  taxTypeId?: number | null;
  priceTaxInclusive?: boolean;
  defaultSalesPrice: number;
  minSalesPrice?: number | null;
  currentCost: number;
  hasExpiry?: boolean;
  warningExpiry?: number | null;
  isBundle?: boolean;
  isBatchManaged?: boolean;
  accountingPolicyId?: number | null;
  status?: boolean;
  units: CreateProductUnitRequest[];
}

export type UpdateProductRequest = CreateProductRequest;
