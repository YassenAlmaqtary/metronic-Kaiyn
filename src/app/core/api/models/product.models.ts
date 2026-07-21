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

export interface ProductAlternative {
  id?: number;
  productId?: number;
  productName?: string | null;
  alternativeProductId: number;
  alternativeProductName?: string | null;
  alternativeType?: number;
  priority?: number;
  isActive?: boolean;
  notes?: string | null;
}

export interface ProductImage {
  imageId?: number;
  imagePath?: string | null;
  isMainImage?: boolean;
  sortOrder?: number;
  imageType?: string | null;
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
  alternatives?: ProductAlternative[] | null;
  images?: ProductImage[] | null;
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

export interface CreateProductAlternativeRequest {
  /** Required for standalone /api/ProductAlternatives; omit on nested create (product not yet created). */
  productId?: number;
  alternativeProductId: number;
  alternativeType?: number;
  priority?: number;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateProductImageRequest {
  imagePath: string;
  isMainImage?: boolean;
  sortOrder?: number;
  imageType?: string | null;
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
  alternatives?: CreateProductAlternativeRequest[] | null;
  images?: CreateProductImageRequest[] | null;
}

export type UpdateProductRequest = CreateProductRequest;

/** Matches API alternativeType range 0–3 */
export const PRODUCT_ALTERNATIVE_TYPES = [
  { value: 0, labelKey: 'products.alternatives.type.matching' },
  { value: 1, labelKey: 'products.alternatives.type.substitute' },
  { value: 2, labelKey: 'products.alternatives.type.equivalent' },
  { value: 3, labelKey: 'products.alternatives.type.related' },
] as const;
