export interface AppModule {
  moduleId: number;
  moduleName?: string | null;
  moduleKey?: string | null;
  parentModuleId?: number | null;
  sortOrder?: number | null;
}

export interface CreateModuleRequest {
  moduleName: string;
  moduleKey: string;
  parentModuleId?: number | null;
  sortOrder?: number | null;
}

export type UpdateModuleRequest = CreateModuleRequest;
