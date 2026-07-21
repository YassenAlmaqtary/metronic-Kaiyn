import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';

import { AuthService } from '../../../../core/api/auth.service';
import { Branch } from '../../../../core/api/models/branch.models';
import { ProductGroup } from '../../../../core/api/models/product-group.models';
import { ProductLookup } from '../../../../core/api/models/product.models';
import {
  BranchPriceListAssignment,
  PriceChangeLog,
  PriceList,
  PricingDashboardItem,
} from '../../../../core/api/models/pricing.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { PricingService } from '../../../../core/services/pricing.service';
import { ProductGroupsService } from '../../../../core/services/product-groups.service';
import { ProductsService } from '../../../../core/services/products.service';

type PricingTab = 'dashboard' | 'lists' | 'assignments' | 'bulk' | 'changelog';

@Component({
  selector: 'app-item-pricing-page',
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, DecimalPipe, DatePipe],
  templateUrl: './item-pricing-page.component.html',
  styleUrl: './item-pricing-page.component.scss',
})
export class ItemPricingPageComponent implements OnInit {
  private pricingService = inject(PricingService);
  private branchesService = inject(BranchesService);
  private productGroupsService = inject(ProductGroupsService);
  private productsService = inject(ProductsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  activeTab = signal<PricingTab>('dashboard');
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  priceLists = signal<PriceList[]>([]);
  branches = signal<Branch[]>([]);
  groups = signal<ProductGroup[]>([]);
  products = signal<ProductLookup[]>([]);
  dashboardItems = signal<PricingDashboardItem[]>([]);
  assignments = signal<BranchPriceListAssignment[]>([]);
  changeLogs = signal<PriceChangeLog[]>([]);

  selectedPriceListId = signal<number | null>(null);
  selectedBranchId = signal<number | null>(null);
  dashboardSearch = signal('');

  editingPriceKey = signal<string | null>(null);
  editingPriceValue = signal<number | null>(null);
  editingMinPriceValue = signal<number | null>(null);

  editingListId = signal<number | null>(null);
  editingAssignmentId = signal<number | null>(null);
  deleteListTarget = signal<PriceList | null>(null);
  deleteAssignmentTarget = signal<BranchPriceListAssignment | null>(null);

  listForm = new FormGroup({
    listName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    description: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  assignmentForm = new FormGroup({
    priceListId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    branchId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    isDefault: new FormControl(false, { nonNullable: true }),
    priority: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  bulkForm = new FormGroup({
    priceListId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    percentageChange: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    categoryId: new FormControl<number | null>(null),
  });

  changeLogForm = new FormGroup({
    priceListId: new FormControl<number | null>(null),
    productId: new FormControl<number | null>(null),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });

  filteredDashboardItems = computed(() => {
    const term = this.dashboardSearch().trim().toLowerCase();
    const list = this.dashboardItems();
    if (!term) {
      return list;
    }
    return list.filter((item) =>
      [item.proName, item.productId, item.unitName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.loadLookups();
  }

  setTab(tab: PricingTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (tab === 'lists') {
      this.loadPriceLists();
    } else if (tab === 'assignments') {
      this.loadAssignments();
      this.loadPriceLists();
    } else if (tab === 'dashboard') {
      this.loadPriceLists();
    } else if (tab === 'bulk') {
      this.loadPriceLists();
    } else if (tab === 'changelog') {
      this.loadPriceLists();
    }
  }

  loadLookups(): void {
    this.loadPriceLists();
    this.branchesService.getAll().subscribe({
      next: (branches) => this.branches.set(branches.filter((b) => b.isActive !== false)),
    });
    this.productGroupsService.getAll().subscribe({
      next: (groups) => this.groups.set(groups.filter((g) => g.status !== false)),
    });
    this.productsService.getAll().subscribe({
      next: (products) => this.products.set(products),
    });
  }

  loadPriceLists(): void {
    this.pricingService.getPriceLists().subscribe({
      next: (lists) => {
        this.priceLists.set(lists);
        if (this.selectedPriceListId() == null && lists.length) {
          this.selectedPriceListId.set(lists[0].priceListId);
          this.loadDashboard();
        }
      },
      error: (error) =>
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.loadError')),
        ),
    });
  }

  loadDashboard(): void {
    const priceListId = this.selectedPriceListId();
    if (priceListId == null) {
      this.dashboardItems.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.pricingService.getDashboard(priceListId, this.selectedBranchId()).subscribe({
      next: (items) => {
        this.dashboardItems.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.loadError')),
        );
      },
    });
  }

  onPriceListFilterChange(value: number | null): void {
    this.selectedPriceListId.set(value);
    this.loadDashboard();
  }

  onBranchFilterChange(value: number | null): void {
    this.selectedBranchId.set(value);
    this.loadDashboard();
  }

  itemKey(item: PricingDashboardItem): string {
    return `${item.productId}-${item.uomId}`;
  }

  startEditPrice(item: PricingDashboardItem): void {
    this.editingPriceKey.set(this.itemKey(item));
    this.editingPriceValue.set(item.currentPrice ?? null);
    this.editingMinPriceValue.set(item.minPrice ?? null);
  }

  cancelEditPrice(): void {
    this.editingPriceKey.set(null);
    this.editingPriceValue.set(null);
    this.editingMinPriceValue.set(null);
  }

  savePrice(item: PricingDashboardItem): void {
    const priceListId = this.selectedPriceListId();
    const newPrice = this.editingPriceValue();
    if (priceListId == null || newPrice == null || newPrice <= 0) {
      this.errorMessage.set(this.language.translate('pricing.required.newPrice'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.pricingService
      .updatePrice(
        {
          productId: item.productId,
          priceListId,
          uomId: item.uomId,
          newPrice,
          minPrice: this.editingMinPriceValue(),
          startDate: item.startDate ?? null,
          endDate: item.endDate ?? null,
        },
        this.auth.user()?.userId,
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.language.translate('pricing.updatePriceSuccess'));
          this.cancelEditPrice();
          this.loadDashboard();
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('pricing.saveError')),
          );
        },
      });
  }

  // ---- Price lists CRUD ----
  resetListForm(): void {
    this.editingListId.set(null);
    this.listForm.reset({ listName: '', description: '', isActive: true });
  }

  editList(list: PriceList): void {
    this.editingListId.set(list.priceListId);
    this.listForm.patchValue({
      listName: list.listName ?? '',
      description: list.description ?? '',
      isActive: list.isActive ?? true,
    });
  }

  saveList(): void {
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();
      return;
    }

    const raw = this.listForm.getRawValue();
    const payload = {
      listName: raw.listName.trim(),
      description: raw.description.trim() || null,
      isActive: raw.isActive,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const editId = this.editingListId();
    const request$ =
      editId != null
        ? this.pricingService.updatePriceList(editId, payload)
        : this.pricingService.createPriceList(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set(
          this.language.translate(editId != null ? 'pricing.listUpdateSuccess' : 'pricing.listCreateSuccess'),
        );
        this.resetListForm();
        this.loadPriceLists();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.saveError')),
        );
      },
    });
  }

  openDeleteList(list: PriceList): void {
    this.deleteListTarget.set(list);
  }

  closeDeleteList(): void {
    if (!this.saving()) {
      this.deleteListTarget.set(null);
    }
  }

  confirmDeleteList(): void {
    const list = this.deleteListTarget();
    if (!list) {
      return;
    }

    this.saving.set(true);
    this.pricingService.deletePriceList(list.priceListId).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteListTarget.set(null);
        this.successMessage.set(this.language.translate('pricing.listDeleteSuccess'));
        if (this.selectedPriceListId() === list.priceListId) {
          this.selectedPriceListId.set(null);
        }
        this.loadPriceLists();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.deleteError')),
        );
      },
    });
  }

  // ---- Assignments CRUD ----
  loadAssignments(): void {
    this.loading.set(true);
    this.pricingService.getBranchAssignments().subscribe({
      next: (items) => {
        this.assignments.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.loadError')),
        );
      },
    });
  }

  resetAssignmentForm(): void {
    this.editingAssignmentId.set(null);
    this.assignmentForm.reset({
      priceListId: null,
      branchId: null,
      isDefault: false,
      priority: 1,
    });
  }

  editAssignment(item: BranchPriceListAssignment): void {
    this.editingAssignmentId.set(item.assignmentId);
    this.assignmentForm.patchValue({
      priceListId: item.priceListId,
      branchId: item.branchId,
      isDefault: item.isDefault ?? false,
      priority: item.priority ?? 1,
    });
  }

  saveAssignment(): void {
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const raw = this.assignmentForm.getRawValue();
    const payload = {
      priceListId: raw.priceListId!,
      branchId: raw.branchId!,
      isDefault: raw.isDefault,
      priority: Number(raw.priority) || 1,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const editId = this.editingAssignmentId();
    const request$ =
      editId != null
        ? this.pricingService.updateBranchAssignment(editId, payload)
        : this.pricingService.createBranchAssignment(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set(
          this.language.translate(
            editId != null ? 'pricing.assignmentUpdateSuccess' : 'pricing.assignmentCreateSuccess',
          ),
        );
        this.resetAssignmentForm();
        this.loadAssignments();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.saveError')),
        );
      },
    });
  }

  openDeleteAssignment(item: BranchPriceListAssignment): void {
    this.deleteAssignmentTarget.set(item);
  }

  closeDeleteAssignment(): void {
    if (!this.saving()) {
      this.deleteAssignmentTarget.set(null);
    }
  }

  confirmDeleteAssignment(): void {
    const item = this.deleteAssignmentTarget();
    if (!item) {
      return;
    }

    this.saving.set(true);
    this.pricingService.deleteBranchAssignment(item.assignmentId).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteAssignmentTarget.set(null);
        this.successMessage.set(this.language.translate('pricing.assignmentDeleteSuccess'));
        this.loadAssignments();
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('pricing.deleteError')),
        );
      },
    });
  }

  // ---- Bulk update ----
  submitBulkUpdate(): void {
    if (this.bulkForm.invalid) {
      this.bulkForm.markAllAsTouched();
      return;
    }

    const raw = this.bulkForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.pricingService
      .bulkUpdate(
        {
          priceListId: raw.priceListId!,
          percentageChange: Number(raw.percentageChange),
          categoryId: raw.categoryId,
          productIds: null,
        },
        this.auth.user()?.userId,
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.language.translate('pricing.bulkSuccess'));
          if (this.selectedPriceListId() === raw.priceListId) {
            this.loadDashboard();
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('pricing.saveError')),
          );
        },
      });
  }

  // ---- Change log ----
  loadChangeLog(): void {
    const raw = this.changeLogForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');

    this.pricingService
      .getChangeLog({
        priceListId: raw.priceListId,
        productId: raw.productId,
        startDate: raw.startDate ? new Date(raw.startDate).toISOString() : null,
        endDate: raw.endDate ? new Date(raw.endDate).toISOString() : null,
      })
      .subscribe({
        next: (logs) => {
          this.changeLogs.set(logs);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.language.translate('pricing.loadError')),
          );
        },
      });
  }

  productLabel(product: ProductLookup): string {
    const code = product.proCode ? ` (${product.proCode})` : '';
    return `${product.productName || product.productId}${code}`;
  }

  branchLabel(branch: Branch): string {
    return branch.branchName || String(branch.branchId);
  }
}
