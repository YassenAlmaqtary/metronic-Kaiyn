import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';

import { Branch } from '../../../../core/api/models/branch.models';
import { Currency } from '../../../../core/api/models/currency.models';
import { ProductLookup } from '../../../../core/api/models/product.models';
import {
  ItemUnitLookup,
  StockDocStatus,
  StockLineDetail,
  isStockDocPosted,
} from '../../../../core/api/models/stock-shared.models';
import { SaveStockIssueRequest, StockIssueType } from '../../../../core/api/models/stock-issue.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { CurrenciesService } from '../../../../core/services/currencies.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StockIssuesService } from '../../../../core/services/stock-issues.service';
import { StoresService } from '../../../../core/services/stores.service';

type Line = FormGroup<{
  itemId: FormControl<number | null>;
  unitId: FormControl<number | null>;
  quantity: FormControl<number>;
  price: FormControl<number>;
  total: FormControl<number>;
  barcode: FormControl<string>;
  batchNumber: FormControl<string>;
  expiryDate: FormControl<string>;
  availableQty: FormControl<number | null>;
}>;

@Component({
  selector: 'app-stock-issue-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, DecimalPipe],
  templateUrl: './stock-issue-form.component.html',
  styleUrl: './stock-issue-form.component.scss',
})
export class StockIssueFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private service = inject(StockIssuesService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private productsService = inject(ProductsService);
  private currenciesService = inject(CurrenciesService);
  private language = inject(LanguageService);

  readonly StockDocStatus = StockDocStatus;

  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);
  isReadOnly = signal(false);
  issueId = signal<number | null>(null);
  errorMessage = signal('');
  totalAmount = signal(0);

  branches = signal<Branch[]>([]);
  stores = signal<Store[]>([]);
  products = signal<ProductLookup[]>([]);
  currencies = signal<Currency[]>([]);
  issueTypes = signal<StockIssueType[]>([]);
  lineUnits = signal<ItemUnitLookup[][]>([]);

  form = new FormGroup({
    issueNumber: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    issueDate: new FormControl(this.today(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    branchId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    storeId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    issueTypeId: new FormControl<number | null>(null),
    issueToName: new FormControl('', { nonNullable: true }),
    currencyId: new FormControl<number | null>(null),
    exchangeRate: new FormControl(1, { nonNullable: true }),
    reference: new FormControl('', { nonNullable: true }),
    responsibleName: new FormControl('', { nonNullable: true }),
    scheduleDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    details: new FormArray<Line>([]),
  });

  get details(): FormArray<Line> {
    return this.form.controls.details;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.form.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => this.onBranch(id));
    this.form.controls.currencyId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((currencyId) => this.onCurrencyChange(currencyId));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.isEditMode.set(true);
      this.issueId.set(id);
      this.load(id);
    } else {
      this.addLine();
    }
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadLookups(): void {
    this.branchesService.getAll().subscribe({
      next: (x) => {
        this.branches.set(x);
        if (!this.isEditMode() && this.form.controls.branchId.value == null && x.length) {
          const defaultBranch =
            x.find((b) => (b as { isDefault?: boolean }).isDefault) ?? x[0];
          this.form.controls.branchId.setValue(defaultBranch.branchId);
        }
      },
      error: () => this.branches.set([]),
    });
    this.productsService.getAll().subscribe({
      next: (x) => this.products.set(x),
      error: () => this.products.set([]),
    });
    this.currenciesService.getAll().subscribe({
      next: (x) => this.currencies.set(x),
      error: () => this.currencies.set([]),
    });
    this.service.getTypes().subscribe({
      next: (x) => this.issueTypes.set(x),
      error: () => this.issueTypes.set([]),
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (d) => {
        this.isReadOnly.set(isStockDocPosted(d.status, d.datePosted));
        this.form.patchValue({
          issueNumber: d.issueNumber ?? '',
          issueDate: d.issueDate?.slice(0, 10) ?? this.today(),
          branchId: d.branchId,
          storeId: d.storeId,
          issueTypeId: d.issueTypeId ?? null,
          issueToName: d.issueToName ?? '',
          currencyId: d.currencyId ?? null,
          exchangeRate: d.exchangeRate ?? 1,
          reference: d.reference ?? '',
          responsibleName: d.responsibleName ?? '',
          scheduleDate: d.scheduleDate?.slice(0, 10) ?? '',
          notes: d.notes ?? '',
        });
        this.loadStores(d.branchId, d.storeId);
        this.rebuild(d.details ?? []);
        if (this.isReadOnly()) {
          this.form.disable();
        } else {
          this.form.enable({ emitEvent: false });
          this.form.controls.issueNumber.disable({ emitEvent: false });
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockIssues.loadError')),
        );
      },
    });
  }

  onBranch(id: number | null): void {
    if (this.isReadOnly()) {
      return;
    }
    this.form.controls.storeId.setValue(null);
    if (!id) {
      this.stores.set([]);
      return;
    }
    this.loadStores(id);
    if (!this.isEditMode()) {
      this.service.getNextNumber(id).subscribe({
        next: (x) => this.form.controls.issueNumber.setValue(x.voucherNumber ?? ''),
      });
    }
  }

  onCurrencyChange(currencyId: number | null): void {
    if (this.isReadOnly()) {
      return;
    }
    if (currencyId == null) {
      this.form.controls.exchangeRate.setValue(1);
      return;
    }

    this.service.getExchangeRate(currencyId).subscribe({
      next: (result) => {
        const rate = Number(result.exchangeRate);
        this.form.controls.exchangeRate.setValue(rate > 0 ? rate : 1);
      },
      error: () => {
        const currency = this.currencies().find((c) => c.id === currencyId);
        const fallback = Number(currency?.valuesCurr);
        this.form.controls.exchangeRate.setValue(fallback > 0 ? fallback : 1);
      },
    });
  }

  loadStores(branchId: number, selected?: number): void {
    this.storesService.getByBranch(branchId).subscribe({
      next: (stores) => this.applyStores(stores, selected),
      error: () => {
        this.storesService.getAll().subscribe({
          next: (all) =>
            this.applyStores(
              all.filter((s) => s.branchId === branchId || s.branchId == null),
              selected,
            ),
          error: () => this.stores.set([]),
        });
      },
    });
  }

  private applyStores(stores: Store[], selected?: number): void {
    this.stores.set(stores);
    if (selected != null) {
      this.form.controls.storeId.setValue(selected);
      return;
    }
    if (this.form.controls.storeId.value == null && stores.length === 1) {
      this.form.controls.storeId.setValue(stores[0].storeId);
    }
  }

  createLine(): Line {
    return new FormGroup({
      itemId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      unitId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      quantity: new FormControl(1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.0001)],
      }),
      price: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
      total: new FormControl(0, { nonNullable: true }),
      barcode: new FormControl('', { nonNullable: true }),
      batchNumber: new FormControl('', { nonNullable: true }),
      expiryDate: new FormControl('', { nonNullable: true }),
      availableQty: new FormControl<number | null>(null),
    });
  }

  addLine(): void {
    const line = this.createLine();
    this.details.push(line);
    this.lineUnits.update((x) => [...x, []]);
    this.bind(line);
    this.calculate(line);
  }

  rebuild(details: StockLineDetail[]): void {
    this.details.clear();
    this.lineUnits.set([]);
    details.forEach((d) => {
      const line = this.createLine();
      line.patchValue({
        itemId: d.itemId,
        unitId: d.unitId,
        quantity: d.quantity,
        price: d.price,
        total: d.total,
        barcode: d.barcode ?? '',
        batchNumber: d.batchNumber ?? '',
        expiryDate: d.expiryDate?.slice(0, 10) ?? '',
        availableQty: d.availableQty ?? null,
      });
      this.details.push(line);
      this.lineUnits.update((x) => [...x, []]);
      this.bind(line);
      this.loadUnits(this.details.length - 1, d.itemId, d.unitId);
    });
    if (!details.length) {
      this.addLine();
    }
    this.recalculateTotal();
  }

  bind(line: Line): void {
    merge(line.controls.quantity.valueChanges, line.controls.price.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.calculate(line));

    line.controls.itemId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        const i = this.details.controls.indexOf(line);
        if (id) {
          this.loadUnits(i, id);
        } else {
          this.setUnits(i, []);
          line.controls.unitId.setValue(null);
        }
      });

    merge(
      line.controls.unitId.valueChanges,
      line.controls.batchNumber.valueChanges,
      line.controls.expiryDate.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.available(line));
  }

  setUnits(i: number, units: ItemUnitLookup[]): void {
    this.lineUnits.update((all) => {
      const next = [...all];
      next[i] = units;
      return next;
    });
  }

  loadUnits(i: number, itemId: number, selected?: number): void {
    this.service.getItemUnits(itemId).subscribe({
      next: (units) => {
        this.setUnits(i, units);
        const line = this.details.at(i);
        if (!line) {
          return;
        }
        const preferred =
          selected != null && units.some((x) => x.unitId === selected)
            ? selected
            : (units.find((x) => x.isBaseUnit) ?? units[0])?.unitId ?? null;
        line.controls.unitId.setValue(preferred);
      },
      error: () => this.setUnits(i, []),
    });
  }

  unitsFor(i: number): ItemUnitLookup[] {
    return this.lineUnits()[i] ?? [];
  }

  calculate(line: Line): void {
    const qty = Number(line.controls.quantity.value) || 0;
    const price = Number(line.controls.price.value) || 0;
    line.controls.total.setValue(Number((qty * price).toFixed(4)), { emitEvent: false });
    this.recalculateTotal();
  }

  recalculateTotal(): void {
    const sum = this.details.controls.reduce(
      (total, line) => total + (Number(line.controls.total.value) || 0),
      0,
    );
    this.totalAmount.set(Number(sum.toFixed(4)));
  }

  lookup(line: Line, event: Event): void {
    event.preventDefault();
    const barcode = line.controls.barcode.value.trim();
    if (!barcode) {
      return;
    }
    this.service.lookupBarcode(barcode).subscribe({
      next: (x) => {
        const i = this.details.controls.indexOf(line);
        line.patchValue({
          itemId: x.itemId,
          unitId: x.unitId,
          price: x.currentCost ?? 0,
        });
        this.loadUnits(i, x.itemId, x.unitId);
        this.calculate(line);
        this.available(line);
      },
      error: (e) =>
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockIssues.loadError')),
        ),
    });
  }

  available(line: Line): void {
    const itemId = line.controls.itemId.value;
    const unitId = line.controls.unitId.value;
    const branchId = this.form.controls.branchId.value;
    const storeId = this.form.controls.storeId.value;
    if (!itemId || !unitId || !branchId || !storeId) {
      return;
    }
    this.service
      .getAvailableQty({
        itemId,
        unitId,
        branchId,
        storeId,
        batchNo: line.controls.batchNumber.value || undefined,
        expiryDate: line.controls.expiryDate.value || undefined,
      })
      .subscribe({
        next: (x) => line.controls.availableQty.setValue(x.qtyInUnit ?? x.baseQty ?? null),
      });
  }

  productLabel(p: ProductLookup): string {
    return [p.productName, p.proCode].filter(Boolean).join(' - ') || String(p.productId);
  }

  branchLabel(b: Branch): string {
    return b.branchName || String(b.branchId);
  }

  currencyLabel(c: Currency): string {
    return c.currencyName || c.currencyShorcut || String(c.id);
  }

  removeLine(i: number): void {
    this.details.removeAt(i);
    this.lineUnits.update((x) => x.filter((_, index) => index !== i));
    this.recalculateTotal();
  }

  save(): void {
    if (this.isReadOnly()) {
      return;
    }

    this.details.controls.forEach((line) => this.calculate(line));
    this.form.markAllAsTouched();
    this.errorMessage.set('');

    const missing: string[] = [];
    if (this.form.controls.branchId.invalid) {
      missing.push(this.language.translate('stockIssues.required.branch'));
    }
    if (this.form.controls.storeId.invalid) {
      missing.push(this.language.translate('stockIssues.required.store'));
    }
    if (!this.form.getRawValue().issueNumber.trim()) {
      missing.push(this.language.translate('stockIssues.required.number'));
    }
    if (!this.details.length || this.details.invalid) {
      missing.push(this.language.translate('stockIssues.required.details'));
    }

    if (missing.length || this.form.invalid) {
      this.errorMessage.set(missing.join(' — ') || this.language.translate('stockIssues.fixInvalid'));
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.branchId == null || raw.storeId == null) {
      this.errorMessage.set(this.language.translate('stockIssues.formInvalid'));
      return;
    }

    this.saving.set(true);

    const payload: SaveStockIssueRequest = {
      issueId: this.issueId() ?? undefined,
      issueNumber: raw.issueNumber,
      issueDate: new Date(raw.issueDate).toISOString(),
      branchId: raw.branchId,
      storeId: raw.storeId,
      issueTypeId: raw.issueTypeId,
      issueToName: raw.issueToName || null,
      currencyId: raw.currencyId,
      exchangeRate: Number(raw.exchangeRate) || 1,
      reference: raw.reference || null,
      responsibleName: raw.responsibleName || null,
      scheduleDate: raw.scheduleDate ? new Date(raw.scheduleDate).toISOString() : null,
      notes: raw.notes || null,
      totalAmount: this.totalAmount(),
      details: raw.details.map((x) => ({
        itemId: x.itemId!,
        unitId: x.unitId!,
        quantity: Number(x.quantity),
        price: Number(x.price),
        total: Number(x.total),
        barcode: x.barcode || null,
        batchNumber: x.batchNumber || null,
        expiryDate: x.expiryDate ? new Date(x.expiryDate).toISOString() : null,
      })),
    };

    this.service.save(payload).subscribe({
      next: (x) => {
        this.saving.set(false);
        const id = x.issueId;
        void this.router.navigate(
          id ? ['/demo1/inventory/stock-issues', id] : ['/demo1/inventory/stock-issues'],
          { state: { successMessage: this.language.translate('stockIssues.saveSuccess') } },
        );
      },
      error: (e) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockIssues.saveError')),
        );
      },
    });
  }
}
