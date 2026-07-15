export interface Customer {
  customerId: number;
  customerName?: string | null;
  customerNameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  crNumber?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
  isActive?: boolean | null;
  dateCreated?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  salesmanId?: number | null;
  salesmanName?: string | null;
  accountId?: number | null;
  accountCode?: number | null;
}

export interface CreateCustomerRequest {
  customerName: string;
  customerNameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  crNumber?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
  isActive?: boolean | null;
  groupId: number;
  salesmanId?: number | null;
  accountId?: number | null;
  accountCode?: number | null;
}

export interface UpdateCustomerRequest {
  customerId: number;
  customerName: string;
  customerNameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
  crNumber?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
  isActive?: boolean | null;
  groupId: number;
  salesmanId?: number | null;
  accountId?: number | null;
  accountCode?: number | null;
}
