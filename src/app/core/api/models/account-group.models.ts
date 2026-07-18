export interface AccountGroup {
  groupId: number;
  groupName?: string | null;
  description?: string | null;
}

export interface CreateAccountGroupRequest {
  groupName: string;
  description?: string | null;
}

export interface UpdateAccountGroupRequest {
  groupName: string;
  description?: string | null;
}
