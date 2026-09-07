export interface UserBranchDto {
  userBranchId: number;
  userId: number;
  userName?: string | null;
  branchId: number;
  branchName?: string | null;
  roleId: number;
  roleName?: string | null;
  isDefault: boolean;
  createdDate: string;
}

export interface CreateUserBranchDto {
  userId: number;
  branchId: number;
  roleId: number;
  isDefault?: boolean;
}

export interface AssignUserBranchItemDto {
  branchId: number;
  roleId: number;
  isDefault?: boolean;
}

export interface AssignUserBranchesDto {
  userId: number;
  branches: AssignUserBranchItemDto[];
}

export interface UpdateUserBranchDto {
  roleId?: number;
  isDefault?: boolean;
}
