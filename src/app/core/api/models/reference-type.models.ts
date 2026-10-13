export interface ReferenceType {
  referenceId: number;
  referenceName?: string | null;
}

export interface CreateReferenceTypeRequest {
  referenceName: string;
}

export interface UpdateReferenceTypeRequest {
  referenceName: string;
}
