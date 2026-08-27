import { Injectable, inject } from '@angular/core';

import { PrintDocumentPayload } from '../api/models/document-print.models';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class DocumentPrintService {
  private language = inject(LanguageService);

  print(payload: PrintDocumentPayload): void {
    const html = this.buildHtml(payload);

    // Do NOT use noopener — it blocks document.write on the new window (blank page).
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.printViaIframe(html);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = (): void => {
      printWindow.focus();
      printWindow.print();
    };

    // After document.write, onload often does not fire — use a short delay instead.
    setTimeout(triggerPrint, 300);
  }

  /** Fallback when pop-ups are blocked. */
  private printViaIframe(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
  }

  private buildHtml(payload: PrintDocumentPayload): string {
    const rtl = this.language.locale() === 'ar';
    const dir = rtl ? 'rtl' : 'ltr';
    const appName = this.language.translate('app.name');
    const generatedLabel = this.language.translate('documentPrint.generatedAt');
    const footer = payload.footerNote ?? this.language.translate('documentPrint.footer');
    const generatedAt = new Date().toLocaleString(rtl ? 'ar-SA' : 'en-GB');

    const fieldsHtml = payload.fields
      .map(
        (field) => `
        <div class="field">
          <div class="field-label">${this.escape(field.label)}</div>
          <div class="field-value">${this.escape(field.value)}</div>
        </div>`,
      )
      .join('');

    const headCells = payload.columns
      .map((col) => {
        const align = col.align ?? 'start';
        return `<th style="text-align:${align}">${this.escape(col.header)}</th>`;
      })
      .join('');

    const bodyRows = payload.rows
      .map((row) => {
        const cells = payload.columns
          .map((col) => {
            const align = col.align ?? 'start';
            const value = row[col.key] ?? '';
            return `<td style="text-align:${align}">${this.escape(String(value))}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const totalsHtml =
      payload.totals
        ?.map(
          (total) => `
        <div class="total-row">
          <span>${this.escape(total.label)}</span>
          <strong>${this.escape(total.value)}</strong>
        </div>`,
        )
        .join('') ?? '';

    return `<!DOCTYPE html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${this.escape(payload.title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      color: #111827;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand { font-size: 20px; font-weight: 700; color: #1e40af; }
    .doc-title { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .doc-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .meta { text-align: ${rtl ? 'left' : 'right'}; font-size: 11px; color: #6b7280; }
    .fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px 16px;
      margin-bottom: 18px;
    }
    .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .field-value { font-size: 12px; font-weight: 600; margin-top: 2px; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 7px 8px; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; font-weight: 700; }
    td { font-size: 11px; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .totals {
      margin-${rtl ? 'right' : 'left'}: auto;
      width: min(100%, 320px);
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row:last-child { border-bottom: 0; background: #eff6ff; font-size: 13px; }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #d1d5db;
      font-size: 10px;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${this.escape(appName)}</div>
      <div class="doc-title">${this.escape(payload.title)}</div>
      ${payload.subtitle ? `<div class="doc-subtitle">${this.escape(payload.subtitle)}</div>` : ''}
    </div>
    <div class="meta">
      <div>${this.escape(generatedLabel)}</div>
      <div>${this.escape(generatedAt)}</div>
    </div>
  </div>

  <div class="fields">${fieldsHtml}</div>

  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>

  ${totalsHtml ? `<div class="totals">${totalsHtml}</div>` : ''}

  <div class="footer">${this.escape(footer)}</div>
</body>
</html>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
