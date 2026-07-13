export interface Company {
  companyId: number;
  companyArName?: string | null;
  companyEnName?: string | null;
  websiteAddress?: string | null;
  companyLogo?: string | null;
  createdAt?: string | null;
  companyCode?: string | null;
  commercialRegister?: string | null;
  taxNumber?: string | null;
  baseCurrencyId?: number | null;
  fiscalYearStart?: string | null;
  fiscalYearEnd?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  updatedAt?: string | null;
  chartOfAccountsId?: number | null;
}

export interface CreateCompanyRequest {
  companyArName: string;
  companyEnName: string;
  websiteAddress?: string | null;
  companyCode?: string | null;
  commercialRegister?: string | null;
  taxNumber?: string | null;
  baseCurrencyId?: number | null;
  fiscalYearStart?: string | null;
  fiscalYearEnd?: string | null;
  chartOfAccountsId?: number | null;
  companyLogo?: string | null;
}

export interface UpdateCompanyRequest {
  companyId: number;
  companyArName: string;
  companyEnName: string;
  websiteAddress?: string | null;
  companyCode?: string | null;
  commercialRegister?: string | null;
  taxNumber?: string | null;
  baseCurrencyId?: number | null;
  fiscalYearStart?: string | null;
  fiscalYearEnd?: string | null;
  chartOfAccountsId?: number | null;
  companyLogo?: string | null;
}
