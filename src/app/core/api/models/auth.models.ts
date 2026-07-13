export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T;
  errors?: string[] | null;
}

export interface UserBranchDto {
  branchId: number;
  branchName?: string | null;
  isDefault?: boolean;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface AuthData {
  userId: number;
  userName?: string | null;
  token?: string | null;
  refreshToken?: string | null;
  tokenExpiration: string;
  roleId?: number | null;
  branches?: UserBranchDto[] | null;
  defaultBranchId?: number | null;
  isSuperUser: boolean;
}

export type AuthResponse = ApiResponse<AuthData>;
