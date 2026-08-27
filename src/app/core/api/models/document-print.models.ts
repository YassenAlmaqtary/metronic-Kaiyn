export interface PrintField {
  label: string;
  value: string;
}

export interface PrintTableColumn {
  key: string;
  header: string;
  align?: 'start' | 'center' | 'end';
}

export interface PrintDocumentPayload {
  title: string;
  subtitle?: string;
  fields: PrintField[];
  columns: PrintTableColumn[];
  rows: Record<string, string | number>[];
  totals?: PrintField[];
  footerNote?: string;
}
