export interface SystemLog {
  logID: number;
  userName?: string | null;
  actionType?: string | null;
  tableName?: string | null;
  recordID?: string | null;
  description?: string | null;
  actionDate?: string | null;
  machineName?: string | null;
  ipAddress?: string | null;
}

export interface CreateSystemLogRequest {
  userName?: string | null;
  actionType?: string | null;
  tableName?: string | null;
  recordID?: string | null;
  description?: string | null;
  actionDate?: string | null;
  machineName?: string | null;
  ipAddress?: string | null;
}
