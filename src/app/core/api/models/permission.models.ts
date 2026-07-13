export interface Permission {
  permissionId: number;
  permissionKey?: string | null;
  description?: string | null;
}

export interface ModulePermissions {
  moduleId: number;
  moduleName?: string | null;
  moduleKey?: string | null;
  permissions?: Record<string, boolean> | null;
}

export interface RolePermissionsMatrix {
  roleId: number;
  roleName?: string | null;
  modules?: ModulePermissions[] | null;
}

export interface ModulePermissionAssignment {
  moduleId: number;
  permissionId: number;
  isAllowed: boolean;
}

export interface SetRolePermissionRequest {
  roleId: number;
  moduleId: number;
  permissionId: number;
  isAllowed: boolean;
}

export interface BulkSetRolePermissionsRequest {
  roleId: number;
  permissions: ModulePermissionAssignment[];
}
