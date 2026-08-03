export interface UserBranchPermissions {
  branchId: number;
  branchName?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  isDefault?: boolean;
  /** moduleKey -> permissionKey -> allowed */
  permissions?: Record<string, Record<string, boolean>> | null;
}

export interface UserPermissionsByBranch {
  userId: number;
  userName?: string | null;
  branchId: number;
  branchName?: string | null;
  roleId?: number | null;
  roleName?: string | null;
  permissions?: Record<string, Record<string, boolean>> | null;
}

export interface CurrentUserPermissions {
  userId: number;
  userName?: string | null;
  branches?: UserBranchPermissions[] | null;
}
