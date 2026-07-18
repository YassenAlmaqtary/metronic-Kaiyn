import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import { AccountingPeriod } from '../../../../core/api/models/accounting-period.models';
import { Branch } from '../../../../core/api/models/branch.models';
import { CostCenter } from '../../../../core/api/models/cost-center.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { Customer } from '../../../../core/api/models/customer.models';
import { FiscalYear } from '../../../../core/api/models/fiscal-year.models';
import {
  CreateOpeningBalanceRequest,
  OpeningBalanceAccountLine,
  OpeningBalanceInventoryLine,
  OpeningBalancePartnerLine,
  PartnerTypeLookup,
  SupplierLookup,
  UpdateOpeningBalanceRequest,
} from '../../../../core/api/models/opening-balance.models';
import { ProductLookup } from '../../../../core/api/models/product.models';
import { StoreLookup } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountingPeriodsService } from '../../../../core/services/accounting-periods.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { CustomersService } from '../../../../core/services/customers.service';
import { FiscalYearsService } from '../../../../core/services/fiscal-years.service';
import { LanguageService } from '../../../../core/services/language.service';
import { LookupsService } from '../../../../core/services/lookups.service';
import { OpeningBalancesService } from '../../../../core/services/opening-balances.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StoresService } from '../../../../core/services/stores.service';
import { SuppliersService } from '../../../../core/services/suppliers.service';

type AccountLineGroup = FormGroup<{
  accId: FormControl<number | null>;
  debit: FormControl<number>;
  credit: FormControl<number>;
  notes: FormControl<string>;
}>;

type PartnerLineGroup = FormGroup<{
  partnerType: FormControl<number | null>;
  partnerId: FormControl<number | null>;
  accId: FormControl<number | null>;
  debit: FormControl<number>;
  credit: FormControl<number>;
  dueDate: FormControl<string>;
  reference: FormControl<string>;
}>;

type InventoryLineGroup = FormGroup<{
  itemId: FormControl<number | null>;
  warehouseId: FormControl<number | null>;
  quantity: FormControl<number>;
  unitCost: FormControl<number>;
}>;

type DetailTab = 'accounts' | 'partners' | 'inventory';

@Component({
  selector: 'app-opening-balance-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './opening-balance-form.component.html',
  styleUrl: './opening-balance-form.component.scss',
})
export class OpeningBalanceFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private openingBalancesService = inject(OpeningBalancesService);
  private accountingPeriodsService = inject(AccountingPeriodsService);
  private fiscalYearsService = inject(FiscalYearsService);
  private branchesService = inject(BranchesService);
  private costCentersService = inject(CostCentersService);
  private currenciesService = inject(CurrenciesService);
  private accountsService = inject(AccountsService);
  private customersService = inject(CustomersService);
  private suppliersService = inject(SuppliersService);
  private productsService = inject(ProductsService);
  private storesService = inject(StoresService);
  private lookupsService = inject(LookupsService);
  private language = inject(LanguageService);

  isEditMode = signal(false);
  isReadOnly = signal(false);
  openingId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  activeTab = signal<DetailTab>('accounts');

  periods = signal<AccountingPeriod[]>([]);
  fiscalYears = signal<FiscalYear[]>([]);
  branches = signal<Branch[]>([]);
  costCenters = signal<CostCenter[]>([]);
  currencies = signal<Currency[]>([]);
  accounts = signal<Account[]>([]);
  customers = signal<Customer[]>([]);
  suppliers = signal<SupplierLookup[]>([]);
  products = signal<ProductLookup[]>([]);
  stores = signal<StoreLookup[]>([]);
  partnerTypes = signal<PartnerTypeLookup[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    periodId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fiscalYearId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    branchId: new FormControl<number | null>(null),
    costCenterId: new FormControl<number | null>(null),
    openingDate: new FormControl(this.todayIso(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    currencyId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    exchangeRate: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.000001)],
    }),
    accounts: new FormArray<AccountLineGroup>([]),
    partners: new FormArray<PartnerLineGroup>([]),
    inventoryItems: new FormArray<InventoryLineGroup>([]),
  });

  /** Forces recomputation of totals when FormArray mutates without signal change. */
  private totalsTick = signal(0);

  accountsTotalDebit = computed(() => {
    this.totalsTick();
    return this.sumControl(this.accountsArray, 'debit');
  });
  accountsTotalCredit = computed(() => {
    this.totalsTick();
    return this.sumControl(this.accountsArray, 'credit');
  });
  partnersTotalDebit = computed(() => {
    this.totalsTick();
    return this.sumControl(this.partnersArray, 'debit');
  });
  partnersTotalCredit = computed(() => {
    this.totalsTick();
    return this.sumControl(this.partnersArray, 'credit');
  });
  inventoryTotal = computed(() => {
    this.totalsTick();
    return this.inventoryArray.controls.reduce((sum, group) => {
      return sum + (group.controls.quantity.value || 0) * (group.controls.unitCost.value || 0);
    }, 0);
  });

  grandDebit = computed(() => this.accountsTotalDebit() + this.partnersTotalDebit());
  grandCredit = computed(() => this.accountsTotalCredit() + this.partnersTotalCredit());
  isBalanced = computed(() => Math.abs(this.grandDebit() - this.grandCredit()) < 0.0001);

  ngOnInit(): void {
    this.loadLookups();

    this.form.controls.currencyId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currencyId) => this.onCurrencyChange(currencyId));

    this.form.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branchId) => this.onBranchChange(branchId));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.addAccountLine();
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.openingId.set(id);
    this.loadOpeningBalance(id);
  }

  get accountsArray(): FormArray<AccountLineGroup> {
    return this.form.controls.accounts;
  }

  get partnersArray(): FormArray<PartnerLineGroup> {
    return this.form.controls.partners;
  }

  get inventoryArray(): FormArray<InventoryLineGroup> {
    return this.form.controls.inventoryItems;
  }

  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  loadLookups(): void {
    this.accountingPeriodsService.getAll().subscribe({
      next: (items) => this.periods.set(items),
      error: () => this.periods.set([]),
    });
    this.fiscalYearsService.getAll().subscribe({
      next: (items) => this.fiscalYears.set(items),
      error: () => this.fiscalYears.set([]),
    });
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.costCentersService.getAll().subscribe({
      next: (items) => this.costCenters.set(items.filter((item) => item.isActive)),
      error: () => this.costCenters.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (items) => {
        this.currencies.set(items);
        if (!this.isEditMode() && !this.form.controls.currencyId.value) {
          const base = items.find((currency) => currency.isBaseCurrency) ?? items[0];
          if (base) {
            this.form.controls.currencyId.setValue(base.id);
            this.form.controls.exchangeRate.setValue(base.valuesCurr || 1);
          }
        }
      },
      error: () => this.currencies.set([]),
    });
    this.accountsService.getAll().subscribe({
      next: (items) => this.accounts.set(items),
      error: () => this.accounts.set([]),
    });
    this.customersService.getAll().subscribe({
      next: (items) => this.customers.set(items),
      error: () => this.customers.set([]),
    });
    this.suppliersService.getAll().subscribe({
      next: (items) => this.suppliers.set(items),
      error: () => this.suppliers.set([]),
    });
    this.productsService.getAll().subscribe({
      next: (items) => this.products.set(items),
      error: () => this.products.set([]),
    });
    this.storesService.getAll().subscribe({
      next: (items) => this.stores.set(items),
      error: () => this.stores.set([]),
    });
    this.lookupsService.getPartnerTypes().subscribe({
      next: (items) => this.partnerTypes.set(items),
      error: () => this.partnerTypes.set([]),
    });
  }

  loadOpeningBalance(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.openingBalancesService.getById(id).subscribe({
      next: (item) => {
        this.isReadOnly.set(item.isPosted);
        this.form.patchValue({
          periodId: item.periodId,
          fiscalYearId: item.fiscalYearId,
          branchId: item.branchId ?? null,
          costCenterId: item.costCenterId ?? null,
          openingDate: item.openingDate?.slice(0, 10) ?? this.todayIso(),
          currencyId: item.currencyId,
          exchangeRate: item.exchangeRate ?? 1,
        });

        this.accountsArray.clear();
        (item.accounts ?? []).forEach((line) => this.accountsArray.push(this.createAccountLine(line)));
        if (this.accountsArray.length === 0 && !item.isPosted) {
          this.addAccountLine();
        }

        this.partnersArray.clear();
        (item.partners ?? []).forEach((line) => this.partnersArray.push(this.createPartnerLine(line)));

        this.inventoryArray.clear();
        (item.inventoryItems ?? []).forEach((line) =>
          this.inventoryArray.push(this.createInventoryLine(line)),
        );

        if (item.isPosted) {
          this.form.disable({ emitEvent: false });
        }

        if (item.branchId) {
          this.onBranchChange(item.branchId, false);
        }

        this.loading.set(false);
        this.refreshTotals();
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('openingBalances.notFound')),
        );
      },
    });
  }

  createAccountLine(line?: Partial<OpeningBalanceAccountLine>): AccountLineGroup {
    const group = new FormGroup({
      accId: new FormControl<number | null>(line?.accId ?? null, {
        validators: [Validators.required],
      }),
      debit: new FormControl(line?.debit ?? 0, { nonNullable: true, validators: [Validators.min(0)] }),
      credit: new FormControl(line?.credit ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      notes: new FormControl(line?.notes ?? '', { nonNullable: true }),
    });
    group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshTotals());
    return group;
  }

  createPartnerLine(line?: Partial<OpeningBalancePartnerLine>): PartnerLineGroup {
    const group = new FormGroup({
      partnerType: new FormControl<number | null>(line?.partnerType ?? null, {
        validators: [Validators.required],
      }),
      partnerId: new FormControl<number | null>(line?.partnerId ?? null, {
        validators: [Validators.required],
      }),
      accId: new FormControl<number | null>(line?.accId ?? null, {
        validators: [Validators.required],
      }),
      debit: new FormControl(line?.debit ?? 0, { nonNullable: true, validators: [Validators.min(0)] }),
      credit: new FormControl(line?.credit ?? 0, {
        nonNullable: true,
        validators: [Validators.min(0)],
      }),
      dueDate: new FormControl(line?.dueDate?.slice(0, 10) ?? '', { nonNullable: true }),
      reference: new FormControl(line?.reference ?? '', { nonNullable: true }),
    });
    group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshTotals());
    return group;
  }

  createInventoryLine(line?: Partial<OpeningBalanceInventoryLine>): InventoryLineGroup {
    const group = new FormGroup({
      itemId: new FormControl<number | null>(line?.itemId ?? null, {
        validators: [Validators.required],
      }),
      warehouseId: new FormControl<number | null>(line?.warehouseId ?? null, {
        validators: [Validators.required],
      }),
      quantity: new FormControl(line?.quantity ?? 0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.000001)],
      }),
      unitCost: new FormControl(line?.unitCost ?? 0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
    });
    group.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshTotals());
    return group;
  }

  addAccountLine(): void {
    this.accountsArray.push(this.createAccountLine());
    this.refreshTotals();
  }

  removeAccountLine(index: number): void {
    this.accountsArray.removeAt(index);
    this.refreshTotals();
  }

  addPartnerLine(): void {
    this.partnersArray.push(this.createPartnerLine());
    this.refreshTotals();
  }

  removePartnerLine(index: number): void {
    this.partnersArray.removeAt(index);
    this.refreshTotals();
  }

  addInventoryLine(): void {
    this.inventoryArray.push(this.createInventoryLine());
    this.refreshTotals();
  }

  removeInventoryLine(index: number): void {
    this.inventoryArray.removeAt(index);
    this.refreshTotals();
  }

  partnerTypeLabel(type: PartnerTypeLookup): string {
    const isAr = this.language.locale() === 'ar';
    return (isAr ? type.typeNameAr : type.typeNameEn) || type.typeNameAr || type.typeNameEn || String(type.typeId);
  }

  isCustomerPartnerType(typeId: number | null): boolean {
    const type = this.partnerTypes().find((item) => item.typeId === typeId);
    const ref = (type?.tableReference || type?.typeNameEn || type?.typeNameAr || '').toLowerCase();
    return ref.includes('customer') || ref.includes('عميل');
  }

  isSupplierPartnerType(typeId: number | null): boolean {
    const type = this.partnerTypes().find((item) => item.typeId === typeId);
    const ref = (type?.tableReference || type?.typeNameEn || type?.typeNameAr || '').toLowerCase();
    return ref.includes('supplier') || ref.includes('مورد');
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
  }

  inventoryLineTotal(group: InventoryLineGroup): number {
    return (group.controls.quantity.value || 0) * (group.controls.unitCost.value || 0);
  }

  onSubmit(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(this.language.translate('openingBalances.validation.form'));
      return;
    }

    const hasLines =
      this.accountsArray.length > 0 ||
      this.partnersArray.length > 0 ||
      this.inventoryArray.length > 0;

    if (!hasLines) {
      this.errorMessage.set(this.language.translate('openingBalances.validation.lines'));
      return;
    }

    const payload = this.buildPayload();
    this.saving.set(true);
    this.errorMessage.set('');

    if (this.isEditMode() && this.openingId() != null) {
      const updatePayload: UpdateOpeningBalanceRequest = {
        ...payload,
        openingId: this.openingId()!,
      };
      this.openingBalancesService.update(this.openingId()!, updatePayload).subscribe({
        next: () => this.navigateSuccess('openingBalances.updateSuccess'),
        error: (error) => this.failSave(error),
      });
      return;
    }

    this.openingBalancesService.create(payload).subscribe({
      next: () => this.navigateSuccess('openingBalances.createSuccess'),
      error: (error) => this.failSave(error),
    });
  }

  private buildPayload(): CreateOpeningBalanceRequest {
    const value = this.form.getRawValue();
    return {
      periodId: value.periodId!,
      fiscalYearId: value.fiscalYearId!,
      branchId: value.branchId,
      costCenterId: value.costCenterId,
      openingDate: new Date(value.openingDate).toISOString(),
      currencyId: value.currencyId!,
      exchangeRate: value.exchangeRate,
      accounts: value.accounts
        .filter((line) => line.accId != null)
        .map((line) => ({
          accId: line.accId!,
          debit: line.debit || 0,
          credit: line.credit || 0,
          notes: line.notes || null,
        })),
      partners: value.partners
        .filter((line) => line.partnerType != null && line.partnerId != null && line.accId != null)
        .map((line) => ({
          partnerType: line.partnerType!,
          partnerId: line.partnerId!,
          accId: line.accId!,
          debit: line.debit || 0,
          credit: line.credit || 0,
          dueDate: line.dueDate ? new Date(line.dueDate).toISOString() : null,
          reference: line.reference || null,
        })),
      inventoryItems: value.inventoryItems
        .filter((line) => line.itemId != null && line.warehouseId != null)
        .map((line) => ({
          itemId: line.itemId!,
          warehouseId: line.warehouseId!,
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
    };
  }

  private onCurrencyChange(currencyId: number | null): void {
    if (currencyId == null || this.isReadOnly()) {
      return;
    }
    const currency = this.currencies().find((item) => item.id === currencyId);
    if (currency?.valuesCurr != null) {
      this.form.controls.exchangeRate.setValue(currency.valuesCurr || 1);
    }
  }

  private onBranchChange(branchId: number | null, clearWarehouse = true): void {
    if (branchId == null) {
      this.storesService.getAll().subscribe({
        next: (items) => this.stores.set(items),
        error: () => this.stores.set([]),
      });
      return;
    }

    this.storesService.getByBranch(branchId).subscribe({
      next: (items) => {
        this.stores.set(items);
        if (clearWarehouse) {
          this.inventoryArray.controls.forEach((group) => {
            const warehouseId = group.controls.warehouseId.value;
            if (warehouseId != null && !items.some((store) => store.storeId === warehouseId)) {
              group.controls.warehouseId.setValue(null);
            }
          });
        }
      },
      error: () => this.stores.set([]),
    });
  }

  private sumControl(
    array: FormArray<AccountLineGroup> | FormArray<PartnerLineGroup>,
    key: 'debit' | 'credit',
  ): number {
    return array.controls.reduce((sum, group) => sum + (group.controls[key].value || 0), 0);
  }

  private refreshTotals(): void {
    this.totalsTick.update((value) => value + 1);
  }

  private navigateSuccess(messageKey: 'openingBalances.createSuccess' | 'openingBalances.updateSuccess'): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/opening-balances'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private failSave(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('openingBalances.saveError')),
    );
  }
}
