export interface User {
  userId: number;
  userName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeId?: number | null;
  isActive: boolean;
  lastLoginDate?: string | null;
  createdDate: string;
}

export interface CreateUserRequest {
  userName: string;
  userPassword: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeId?: number | null;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  userName?: string | null;
  userPassword?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  employeeId?: number | null;
  isActive?: boolean | null;
}
