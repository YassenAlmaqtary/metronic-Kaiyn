import { Component } from '@angular/core';

import { PosReportsPageComponent } from '../reports/pos-reports-page.component';

@Component({
  selector: 'app-pos-returns-report-page',
  imports: [PosReportsPageComponent],
  template: `
    <app-pos-reports-page
      [titleKey]="'posAdmin.returnsReport.title'"
      [subtitleKey]="'posAdmin.returnsReport.subtitle'"
      [hintKey]="'posAdmin.returnsReport.hint'"
    />
  `,
})
export class PosReturnsReportPageComponent {}
