export const ItemAccountingItemType = {
  Inventory: 1,
  Service: 2,
  Asset: 3,
  Other: 9,
} as const;

export type ItemAccountingItemTypeValue =
  (typeof ItemAccountingItemType)[keyof typeof ItemAccountingItemType];

export const ItemAccountingOperationType = {
  Purchase: 1,
  Sale: 2,
  StockIssue: 3,
  StockReceiving: 4,
  Adjustment: 5,
  Transfer: 6,
} as const;

export type ItemAccountingOperationTypeValue =
  (typeof ItemAccountingOperationType)[keyof typeof ItemAccountingOperationType];

export interface ItemAccountingPolicy {
  policyId: number;
  policyCode?: string | null;
  policyName?: string | null;
  itemType: number;
  isActive?: boolean;
  notes?: string | null;
  rules?: ItemAccountingPolicyRule[] | null;
}

export interface ItemAccountingPolicyRule {
  ruleId: number;
  policyId?: number;
  operationType: number;
  debitAccountId?: number | null;
  creditAccountId?: number | null;
  debitAccountName?: string | null;
  creditAccountName?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateItemAccountingPolicyRequest {
  policyCode: string;
  policyName: string;
  itemType: number;
  isActive?: boolean;
  notes?: string | null;
}

export interface UpdateItemAccountingPolicyRequest {
  policyName: string;
  itemType: number;
  isActive?: boolean;
  notes?: string | null;
}

export interface CreateItemAccountingPolicyRuleRequest {
  operationType: number;
  debitAccountId?: number | null;
  creditAccountId?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export type UpdateItemAccountingPolicyRuleRequest = CreateItemAccountingPolicyRuleRequest;
