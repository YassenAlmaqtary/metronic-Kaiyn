import { Component, inject } from '@angular/core';

import { LoadingBarService } from '../../core/services/loading-bar.service';

@Component({
  selector: 'app-loading-bar',
  templateUrl: './loading-bar.component.html',
  styleUrl: './loading-bar.component.scss',
})
export class LoadingBarComponent {
  protected readonly loadingBar = inject(LoadingBarService);
}
