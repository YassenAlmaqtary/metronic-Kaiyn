export interface Bank {
  bankID: number;
  bankName?: string | null;
  bankCode?: string | null;
  swiftCode?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive?: boolean | null;
  createdDate?: string | null;
  createdBy?: number | null;
  accountsCount?: number | null;
}

export interface CreateBankRequest {
  bankName: string;
  createdBy: number;
  bankCode?: string | null;
  swiftCode?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive?: boolean | null;
}

export interface UpdateBankRequest {
  bankID: number;
  bankName: string;
  bankCode?: string | null;
  swiftCode?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive?: boolean | null;
}
