import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Product } from '../../../../core/api/models/product.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';

type ProductFilter = 'all' | 'active';

@Component({
  selector: 'app-products-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent implements OnInit {
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);

  products = signal<Product[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<ProductFilter>('all');
  deleteTarget = signal<Product | null>(null);
  deleting = signal(false);

  filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.products();

    if (filter === 'active') {
      list = list.filter((product) => product.status !== false);
    }

    if (!term) {
      return list;
    }

    return list.filter((product) =>
      [product.productName, product.proCode, product.groupName, product.productId]
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
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products.set(products as Product[]);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('products.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: ProductFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(product: Product): void {
    this.deleteTarget.set(product);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const product = this.deleteTarget();
    if (!product) {
      return;
    }

    this.deleting.set(true);
    this.productsService.delete(product.productId).subscribe({
      next: () => {
        this.products.update((list) => list.filter((item) => item.productId !== product.productId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('products.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('products.deleteError')),
        );
      },
    });
  }
}
