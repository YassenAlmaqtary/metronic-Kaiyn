export interface PagedResponse<T> {
  items?: T[] | null;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SystemAuditLog {
  auditId: number;
  tableName?: string | null;
  tableDisplayName?: string | null;
  recordId?: string | null;
  actionType?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  performedAt: string;
  performedByUserId: number;
  performedByUserName?: string | null;
  sourcePlatform: number;
  performedFromIP?: string | null;
  performedFromDevice?: string | null;
}

export interface SystemAuditLogQuery {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string | null;
  tableName?: string | null;
  actionType?: string | null;
}

export interface PermissionAuditLog {
  auditId: number;
  entityType?: string | null;
  entityId: number;
  moduleId: number;
  moduleName?: string | null;
  permissionId: number;
  permissionKey?: string | null;
  oldValue?: boolean | null;
  newValue?: boolean | null;
  changedBy: number;
  changedByName?: string | null;
  changedAt: string;
  notes?: string | null;
}
