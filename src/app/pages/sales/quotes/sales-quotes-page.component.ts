import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-sales-quotes-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './sales-quotes-page.component.html',
})
export class SalesQuotesPageComponent {}
