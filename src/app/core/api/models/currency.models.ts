export interface Currency {
  id: number;
  currencyName?: string | null;
  currencyShorcut?: string | null;
  fakhName?: string | null;
  valuesCurr?: number | null;
  isActive?: boolean | null;
  isBaseCurrency: boolean;
  effectiveDate?: string | null;
  lastUpdatedBy?: number | null;
  lastUpdatedDate?: string | null;
}

export interface CreateCurrencyRequest {
  currencyName?: string | null;
  currencyShorcut?: string | null;
  fakhName?: string | null;
  valuesCurr?: number | null;
  isActive?: boolean | null;
  isBaseCurrency: boolean;
  effectiveDate?: string | null;
  lastUpdatedBy?: number | null;
}

export interface UpdateCurrencyRequest {
  currencyName?: string | null;
  currencyShorcut?: string | null;
  fakhName?: string | null;
  valuesCurr?: number | null;
  isActive?: boolean | null;
  isBaseCurrency: boolean;
  effectiveDate?: string | null;
  lastUpdatedBy?: number | null;
}
