import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Brand } from '../../../../core/api/models/brand.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BrandsService } from '../../../../core/services/brands.service';
import { LanguageService } from '../../../../core/services/language.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

type BrandFilter = 'all' | 'active';

@Component({
  selector: 'app-brands-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './brands-list.component.html',
  styleUrl: './brands-list.component.scss',
})
export class BrandsListComponent implements OnInit {
  private brandsService = inject(BrandsService);
  private language = inject(LanguageService);

  brands = signal<Brand[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<BrandFilter>('all');
  deleteTarget = signal<Brand | null>(null);
  deleting = signal(false);

  filteredBrands = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.brands();

    if (filter === 'active') {
      list = list.filter((brand) => brand.status !== false);
    }

    if (!term) {
      return list;
    }

    return list.filter((brand) =>
      [brand.brandArName, brand.brandEnName, brand.details, brand.brandId]
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
    this.loadBrands();
  }

  brandLabel(brand: Brand): string {
    if (this.language.locale() === 'ar') {
      return brand.brandArName || brand.brandEnName || String(brand.brandId);
    }
    return brand.brandEnName || brand.brandArName || String(brand.brandId);
  }

  loadBrands(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.brandsService.getAll().subscribe({
      next: (brands) => {
        this.brands.set(brands);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('brands.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: BrandFilter): void {
    this.filter.set(filter);
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('brands'),
      [
        this.language.translate('brands.brandArName'),
        this.language.translate('brands.brandEnName'),
        this.language.translate('brands.details'),
        this.language.translate('brands.status'),
      ],
      this.filteredBrands().map((brand) => [
        brand.brandArName ?? '',
        brand.brandEnName ?? '',
        brand.details ?? '',
        brand.status !== false
          ? this.language.translate('brands.active')
          : this.language.translate('brands.inactive'),
      ]),
    );
  }

  openDeleteDialog(brand: Brand): void {
    this.deleteTarget.set(brand);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const brand = this.deleteTarget();
    if (!brand) {
      return;
    }

    this.deleting.set(true);
    this.brandsService.delete(brand.brandId).subscribe({
      next: () => {
        this.brands.update((list) => list.filter((item) => item.brandId !== brand.brandId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('brands.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('brands.deleteError')),
        );
      },
    });
  }
}
