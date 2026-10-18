import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Copies each column header onto its cells as `data-label` / `data-cell` so
 * `kayian-responsive.css` can render `.kt-table` rows as labelled cards on phones.
 * Opt a table out with `data-responsive="scroll"`.
 */
@Injectable({ providedIn: 'root' })
export class ResponsiveTablesService {
  private document = inject(DOCUMENT);
  private observer: MutationObserver | null = null;
  private frame = 0;

  start(): void {
    if (this.observer) {
      return;
    }
    // Attributes are not observed, so writing data-* below never re-triggers the observer.
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(this.document.body, { childList: true, subtree: true, characterData: true });
    this.schedule();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    cancelAnimationFrame(this.frame);
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.document
        .querySelectorAll<HTMLTableElement>('table.kt-table')
        .forEach((table) => this.labelTable(table));
    });
  }

  private labelTable(table: HTMLTableElement): void {
    const headRow = table.tHead?.rows[table.tHead.rows.length - 1];
    if (!headRow) {
      return;
    }

    const labels: string[] = [];
    for (const th of Array.from(headRow.cells)) {
      const text = this.text(th);
      for (let i = 0; i < th.colSpan; i++) {
        labels.push(text);
      }
    }

    const rows = [
      ...Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)),
      ...(table.tFoot ? Array.from(table.tFoot.rows) : []),
    ];

    for (const row of rows) {
      let column = 0;
      for (const cell of Array.from(row.cells)) {
        this.setAttr(cell, 'data-label', cell.colSpan > 1 ? '' : (labels[column] ?? ''));
        this.setAttr(cell, 'data-cell', this.cellKind(cell));
        column += cell.colSpan;
      }
    }
  }

  private cellKind(cell: HTMLTableCellElement): string {
    if (cell.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea')) {
      return 'field';
    }
    const buttons = Array.from(cell.querySelectorAll('.kt-btn'));
    if (buttons.length) {
      const buttonText = buttons.reduce((sum, button) => sum + this.text(button).length, 0);
      if (this.text(cell).length <= buttonText) {
        return 'actions';
      }
    }
    return 'value';
  }

  private text(element: Element): string {
    return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  private setAttr(element: Element, name: string, value: string): void {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }
}
