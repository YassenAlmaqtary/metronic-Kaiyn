import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ReferenceType } from '../../../../core/api/models/reference-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ReferenceTypesService } from '../../../../core/services/reference-types.service';
import { ToastService } from '../../../../core/services/toast.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-reference-types-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './reference-types-list.component.html',
  styleUrl: './reference-types-list.component.scss',
})
export class ReferenceTypesListComponent implements OnInit {
  private service = inject(ReferenceTypesService);
  private language = inject(LanguageService);
  private toast = inject(ToastService);

  items = signal<ReferenceType[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<ReferenceType | null>(null);
  deleting = signal(false);

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.items();
    }
    return this.items().filter((item) =>
      [item.referenceName, item.referenceId].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.getAll().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('referenceTypes.loadError')),
        );
      },
    });
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('reference-types'),
      [
        this.language.translate('referenceTypes.referenceId'),
        this.language.translate('referenceTypes.referenceName'),
      ],
      this.filtered().map((item) => [item.referenceId, item.referenceName ?? '']),
    );
  }

  openDeleteDialog(item: ReferenceType): void {
    this.deleteTarget.set(item);
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    if (!item) {
      return;
    }
    this.deleting.set(true);
    this.service.delete(item.referenceId).subscribe({
      next: () => {
        this.items.update((list) => list.filter((x) => x.referenceId !== item.referenceId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success(this.language.translate('referenceTypes.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('referenceTypes.deleteError')),
        );
      },
    });
  }
}
