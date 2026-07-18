export interface TaxSetup {
  taxSetupId: number;
  taxCode?: string | null;
  taxType?: string | null;
  accountId: number;
  taxRate: number;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  createdBy?: string | null;
  createdDate?: string;
  lastModifiedBy?: string | null;
  lastModifiedDate?: string | null;
  notes?: string | null;
}

export interface CreateTaxSetupRequest {
  taxCode: string;
  taxType: string;
  accountId: number;
  taxRate: number;
  isActive?: boolean;
  startDate: string;
  endDate?: string | null;
  createdBy?: string | null;
  notes?: string | null;
}

export type UpdateTaxSetupRequest = CreateTaxSetupRequest;

/** Common ERP tax type codes used as defaults in the UI. */
export const CommonTaxTypes = ['VAT', 'Sales', 'Withholding', 'Exempt'] as const;
