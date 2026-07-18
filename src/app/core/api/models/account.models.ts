export interface Account {
  accId: number;
  accCode: number;
  accName?: string | null;
  accName2?: string | null;
  accType?: number | null;
  accParent?: number | null;
  accDmType?: number | null;
  accNote?: string | null;
  isBranchRequired?: boolean | null;
  isCostCenterRequired?: boolean | null;
  costCenterId?: number | null;
  addUser?: number | null;
  addDate?: string | null;
  editUser?: number | null;
  editDate?: string | null;
  numOfEdit?: number | null;
  accStopped?: boolean | null;
  accStoppedType?: number | null;
  accountCategory?: number | null;
  reasonsStop?: string | null;
  dtpFrom?: string | null;
  dtpTo?: string | null;
  isLinkWithGroup?: boolean | null;
  groupId?: number | null;
  currencyId?: number | null;
  isMultiCurrency?: boolean | null;
  taxType?: string | null;
  isTaxable?: boolean | null;
}

export interface CreateAccountRequest {
  accCode: number;
  accName: string;
  accName2?: string | null;
  accType?: number | null;
  accParent?: number | null;
  accDmType?: number | null;
  accNote?: string | null;
  isBranchRequired?: boolean | null;
  isCostCenterRequired?: boolean | null;
  costCenterId?: number | null;
  accStopped?: boolean | null;
  accStoppedType?: number | null;
  accountCategory?: number | null;
  reasonsStop?: string | null;
  dtpFrom?: string | null;
  dtpTo?: string | null;
  isLinkWithGroup?: boolean | null;
  groupId?: number | null;
  currencyId?: number | null;
  isMultiCurrency?: boolean | null;
  taxType?: string | null;
  isTaxable?: boolean | null;
}

export type UpdateAccountRequest = CreateAccountRequest;

/** Structure: main (header) vs sub (posting / leaf). */
export const AccountStructureType = {
  Main: 1,
  Sub: 2,
} as const;

/** Natural balance. */
export const AccountNatureType = {
  Debit: 1,
  Credit: 2,
} as const;

/** High-level FS classification. */
export const AccountCategory = {
  Assets: 1,
  Liabilities: 2,
  Equity: 3,
  Revenue: 4,
  Expenses: 5,
} as const;

export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
  level: number;
  hasChildren: boolean;
}
