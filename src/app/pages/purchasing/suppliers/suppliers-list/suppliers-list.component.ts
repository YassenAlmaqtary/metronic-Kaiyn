import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Supplier } from '../../../../core/api/models/supplier.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SuppliersService } from '../../../../core/services/suppliers.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type SupplierFilter = 'all' | 'active';

@Component({
  selector: 'app-suppliers-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './suppliers-list.component.html',
})
export class SuppliersListComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private language = inject(LanguageService);

  suppliers = signal<Supplier[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<SupplierFilter>('all');
  deleteTarget = signal<Supplier | null>(null);
  deleting = signal(false);

  filteredSuppliers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.suppliers();

    if (filter === 'active') {
      list = list.filter((supplier) => supplier.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((supplier) =>
      [supplier.supplierName, supplier.phone, supplier.email, supplier.taxNumber, supplier.supplierId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadSuppliers();
  }

  supplierLabel(supplier: Supplier): string {
    return supplier.supplierName || String(supplier.supplierId);
  }

  loadSuppliers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.suppliersService.getAll().subscribe({
      next: (suppliers) => {
        this.suppliers.set(suppliers);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('suppliers.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: SupplierFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('suppliers'),
      [
        this.language.translate('suppliers.supplierName'),
        this.language.translate('suppliers.phone'),
        this.language.translate('suppliers.email'),
        this.language.translate('suppliers.taxNumber'),
        this.language.translate('suppliers.status'),
      ],
      this.filteredSuppliers().map((supplier) => [
        supplier.supplierName ?? '',
        supplier.phone ?? '',
        supplier.email ?? '',
        supplier.taxNumber ?? '',
        supplier.isActive
          ? this.language.translate('suppliers.active')
          : this.language.translate('suppliers.inactive'),
      ]),
    );
  }

  openDeleteDialog(supplier: Supplier): void {
    this.deleteTarget.set(supplier);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const supplier = this.deleteTarget();
    if (!supplier) {
      return;
    }

    this.deleting.set(true);
    this.suppliersService.delete(supplier.supplierId).subscribe({
      next: () => {
        this.suppliers.update((list) =>
          list.filter((item) => item.supplierId !== supplier.supplierId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('suppliers.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('suppliers.deleteError')),
        );
      },
    });
  }
}
