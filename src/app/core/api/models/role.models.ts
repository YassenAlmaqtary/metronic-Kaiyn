export interface Role {
  roleId: number;
  roleName?: string | null;
  description?: string | null;
  isSystem: boolean;
}

export interface CreateRoleRequest {
  roleName: string;
  description?: string | null;
}

export interface UpdateRoleRequest {
  roleName?: string | null;
  description?: string | null;
}
