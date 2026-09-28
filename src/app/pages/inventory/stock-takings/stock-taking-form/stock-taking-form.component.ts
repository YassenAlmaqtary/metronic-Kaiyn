import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ProductLookup, ProductUnit } from '../../../../core/api/models/product.models';
import {
  SaveStockTakingRequest,
  StockTakingDetail,
  StockTakingStatus,
  StoreItemForTaking,
} from '../../../../core/api/models/stock-taking.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StockTakingsService } from '../../../../core/services/stock-takings.service';
import { StoresService } from '../../../../core/services/stores.service';

type TakingLine = FormGroup<{
  itemId: FormControl<number | null>;
  itemName: FormControl<string>;
  unitId: FormControl<number | null>;
  unitName: FormControl<string>;
  systemQty: FormControl<number>;
  countedQty: FormControl<number>;
  differenceQty: FormControl<number>;
  averageCost: FormControl<number>;
  differenceValue: FormControl<number>;
  batchNumber: FormControl<string>;
  expiryDate: FormControl<string>;
  notes: FormControl<string>;
}>;

@Component({
  selector: 'app-stock-taking-form',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, DecimalPipe],
  templateUrl: './stock-taking-form.component.html',
  styleUrl: './stock-taking-form.component.scss',
})
export class StockTakingFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(StockTakingsService);
  private storesService = inject(StoresService);
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);
  private destroyRef = inject(DestroyRef);

  id = signal<number | null>(null);
  loading = signal(false);
  loadingItems = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');
  takingNo = signal('');
  readOnly = signal(false);
  stores = signal<Store[]>([]);
  products = signal<ProductLookup[]>([]);
  lineUnits = signal<ProductUnit[][]>([]);
  /** Cached Products_Qty snapshot for the selected store */
  private storeStock = signal<StoreItemForTaking[]>([]);

  form = new FormGroup({
    storeId: new FormControl<number | null>(null, Validators.required),
    takingDate: new FormControl(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: Validators.required,
    }),
    takingType: new FormControl(1, { nonNullable: true }),
    responsibleUserId: new FormControl<number | null>(null),
    notes: new FormControl('', { nonNullable: true }),
    details: new FormArray<TakingLine>([]),
  });

  get details(): FormArray<TakingLine> {
    return this.form.controls.details;
  }

  ngOnInit(): void {
    this.storesService.getAll().subscribe({ next: (x) => this.stores.set(x ?? []) });
    this.productsService.getAll().subscribe({ next: (x) => this.products.set(x ?? []) });

    this.form.controls.storeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((storeId) => {
        this.storeStock.set([]);
        if (storeId) {
          this.refreshStoreStock(storeId);
        }
      });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.id.set(id);
      this.load(id);
    }
  }

  load(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (x) => {
        this.takingNo.set(x.takingNo ?? '');
        this.form.patchValue({
          storeId: x.storeId,
          takingDate: this.date(x.takingDate),
          takingType: x.takingType ?? 1,
          responsibleUserId: x.responsibleUserId ?? null,
          notes: x.notes ?? '',
        });
        this.details.clear();
        this.lineUnits.set([]);
        (x.details ?? []).forEach((d) => this.addLine(d));
        this.readOnly.set(
          x.statusId === StockTakingStatus.Posted || x.statusId === StockTakingStatus.Cancelled,
        );
        if (this.readOnly()) {
          this.form.disable();
        }
        if (x.storeId) {
          this.refreshStoreStock(x.storeId);
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTakings.notFound')),
        );
      },
    });
  }

  loadStoreItems(): void {
    const storeId = Number(this.form.controls.storeId.value);
    if (!storeId) {
      this.errorMessage.set(this.language.translate('stockTakings.selectStoreFirst'));
      return;
    }
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.loadingItems.set(true);
    this.service.getStoreItems(storeId).subscribe({
      next: (raw) => {
        try {
          const items = this.normalizeStoreItems(raw);
          this.storeStock.set(items);
          this.details.clear();
          this.lineUnits.set([]);
          items.forEach((y) => this.addStoreLine(y));
          if (!items.length) {
            this.errorMessage.set(this.language.translate('stockTakings.emptyStoreItems'));
          } else {
            this.infoMessage.set(
              this.language
                .translate('stockTakings.loadItemsSuccess')
                .replace('{count}', String(items.length)),
            );
          }
        } catch (err) {
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('stockTakings.loadItemsError')),
          );
        } finally {
          this.loadingItems.set(false);
        }
      },
      error: (e) => {
        this.loadingItems.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTakings.loadItemsError')),
        );
      },
    });
  }

  addStoreLine(x: StoreItemForTaking): void {
    const row = x as StoreItemForTaking & Record<string, unknown>;
    const itemId = Number(row.itemId ?? row['ItemId']);
    const unitId = Number(row.unitId ?? row['UnitId']);
    const systemQty = Number(row.systemQty ?? row['SystemQty'] ?? 0);
    this.addLine({
      itemId: Number.isFinite(itemId) ? itemId : undefined,
      itemName: String(row.itemName ?? row['ItemName'] ?? ''),
      unitId: Number.isFinite(unitId) && unitId > 0 ? unitId : undefined,
      unitName: String(row.unitName ?? row['UnitName'] ?? ''),
      batchNumber: String(row.batchNumber ?? row['BatchNumber'] ?? ''),
      expiryDate: (row.expiryDate ?? row['ExpiryDate']) as string | null | undefined,
      systemQty,
      countedQty: systemQty,
      averageCost: Number(row.averageCost ?? row['AverageCost'] ?? 0),
    });
  }

  addLine(x?: Partial<StockTakingDetail>): void {
    const line = new FormGroup({
      itemId: new FormControl<number | null>(x?.itemId ?? null, Validators.required),
      itemName: new FormControl(x?.itemName ?? '', { nonNullable: true }),
      unitId: new FormControl<number | null>(x?.unitId ?? null, Validators.required),
      unitName: new FormControl(x?.unitName ?? '', { nonNullable: true }),
      systemQty: new FormControl(Number(x?.systemQty ?? 0), { nonNullable: true }),
      countedQty: new FormControl(Number(x?.countedQty ?? x?.systemQty ?? 0), { nonNullable: true }),
      differenceQty: new FormControl(Number(x?.differenceQty ?? 0), { nonNullable: true }),
      averageCost: new FormControl(Number(x?.averageCost ?? 0), { nonNullable: true }),
      differenceValue: new FormControl(Number(x?.differenceValue ?? 0), { nonNullable: true }),
      batchNumber: new FormControl(x?.batchNumber ?? '', { nonNullable: true }),
      expiryDate: new FormControl(this.date(x?.expiryDate), { nonNullable: true }),
      notes: new FormControl(x?.notes ?? '', { nonNullable: true }),
    });
    this.details.push(line);
    this.lineUnits.update((all) => [...all, []]);
    const index = this.details.length - 1;
    this.bindLine(line, index);
    this.recalc(index);
    if (x?.itemId) {
      // Only fill from store snapshot when the line was not already hydrated (manual item pick).
      if (x.unitId == null && x.systemQty == null) {
        this.applyStockSnapshot(index, x.itemId);
      }
      const selectedUnit = line.controls.unitId.value ?? x.unitId ?? null;
      this.loadUnitsForLine(index, x.itemId, selectedUnit, selectedUnit == null);
    }
  }

  unitsFor(i: number): ProductUnit[] {
    return this.lineUnits()[i] ?? [];
  }

  productLabel(itemId: number | null, fallback: string): string {
    if (itemId == null) {
      return fallback;
    }
    const p = this.products().find((x) => x.productId === itemId);
    return p?.productName || fallback || String(itemId);
  }

  hasProduct(itemId: number | null): boolean {
    return itemId != null && this.products().some((x) => x.productId === itemId);
  }

  recalc(i: number): void {
    const g = this.details.at(i);
    if (!g) {
      return;
    }
    const systemQty = Number(g.controls.systemQty.value) || 0;
    const countedQty = Number(g.controls.countedQty.value) || 0;
    const averageCost = Number(g.controls.averageCost.value) || 0;
    const diff = countedQty - systemQty;
    g.controls.differenceQty.setValue(Number(diff.toFixed(4)), { emitEvent: false });
    g.controls.differenceValue.setValue(Number((diff * averageCost).toFixed(4)), {
      emitEvent: false,
    });
  }

  onCountedInput(i: number, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const counted = Number(raw);
    const g = this.details.at(i);
    if (!g || Number.isNaN(counted)) {
      return;
    }
    g.controls.countedQty.setValue(counted, { emitEvent: false });
    this.recalc(i);
  }

  removeLine(i: number): void {
    this.details.removeAt(i);
    this.lineUnits.update((all) => all.filter((_, idx) => idx !== i));
  }

  save(): void {
    if (this.form.invalid || !this.details.length) {
      this.form.markAllAsTouched();
      this.errorMessage.set(
        this.language.translate(
          !this.details.length ? 'stockTakings.emptyLines' : 'stockTakings.saveError',
        ),
      );
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    const v = this.form.getRawValue();
    const payload: SaveStockTakingRequest = {
      takingId: this.id() ?? undefined,
      storeId: Number(v.storeId),
      takingDate: v.takingDate,
      takingType: v.takingType,
      responsibleUserId: v.responsibleUserId,
      notes: v.notes || null,
      details: this.details.controls.map((ctrl) => ({
        itemId: Number(ctrl.controls.itemId.value),
        unitId: Number(ctrl.controls.unitId.value),
        batchNumber: String(ctrl.controls.batchNumber.value || '') || null,
        expiryDate: String(ctrl.controls.expiryDate.value || '') || null,
        systemQty: Number(ctrl.controls.systemQty.value),
        countedQty: Number(ctrl.controls.countedQty.value),
        differenceQty: Number(ctrl.controls.differenceQty.value),
        averageCost: Number(ctrl.controls.averageCost.value),
        differenceValue: Number(ctrl.controls.differenceValue.value),
        notes: String(ctrl.controls.notes.value || '') || null,
      })),
    };
    this.service.save(payload).subscribe({
      next: () =>
        void this.router.navigate(['/demo1/inventory/stock-takings'], {
          state: { successMessage: this.language.translate('stockTakings.saveSuccess') },
        }),
      error: (e) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockTakings.saveError')),
        );
      },
    });
  }

  private bindLine(line: TakingLine, index: number): void {
    line.controls.itemId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((itemId) => {
      const i = this.details.controls.indexOf(line);
      const rowIndex = i >= 0 ? i : index;
      if (!itemId) {
        this.setUnits(rowIndex, []);
        line.patchValue(
          {
            itemName: '',
            unitId: null,
            unitName: '',
            systemQty: 0,
            countedQty: 0,
            averageCost: 0,
            batchNumber: '',
            expiryDate: '',
          },
          { emitEvent: false },
        );
        this.recalc(rowIndex);
        return;
      }
      const product = this.products().find((p) => p.productId === itemId);
      line.controls.itemName.setValue(product?.productName ?? '', { emitEvent: false });
      this.applyStockSnapshot(rowIndex, itemId);
      const selectedUnit = line.controls.unitId.value;
      this.loadUnitsForLine(rowIndex, itemId, selectedUnit, selectedUnit == null);
      this.productsService
        .getById(itemId)
        .pipe(catchError(() => of(null)))
        .subscribe((full) => {
          if (!full || this.details.at(rowIndex)?.controls.itemId.value !== itemId) {
            return;
          }
          const cost = Number(full.currentCost ?? 0);
          if (cost > 0 && !Number(this.details.at(rowIndex)?.controls.averageCost.value)) {
            this.details.at(rowIndex)?.controls.averageCost.setValue(cost, { emitEvent: false });
            this.recalc(rowIndex);
          }
        });
    });

    line.controls.unitId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((unitId) => {
      const i = this.details.controls.indexOf(line);
      if (i < 0) {
        return;
      }
      const unit = this.unitsFor(i).find((u) => u.unitId === unitId);
      line.controls.unitName.setValue(unit?.unitName ?? '', { emitEvent: false });
    });

    line.controls.countedQty.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const i = this.details.controls.indexOf(line);
        if (i >= 0) {
          this.recalc(i);
        }
      });

    line.controls.averageCost.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const i = this.details.controls.indexOf(line);
        if (i >= 0) {
          this.recalc(i);
        }
      });
  }

  private refreshStoreStock(storeId: number): void {
    this.service
      .getStoreItems(storeId)
      .pipe(catchError(() => of([])))
      .subscribe((raw) => {
        this.storeStock.set(this.normalizeStoreItems(raw));
        this.details.controls.forEach((line, index) => {
          const itemId = line.controls.itemId.value;
          if (itemId) {
            this.applyStockSnapshot(index, itemId, true);
            const selectedUnit = line.controls.unitId.value;
            if (selectedUnit && !this.unitsFor(index).length) {
              this.loadUnitsForLine(index, itemId, selectedUnit, false);
            }
          }
        });
      });
  }

  private applyStockSnapshot(index: number, itemId: number, preserveCounted = false): void {
    const line = this.details.at(index);
    if (!line) {
      return;
    }
    const matches = this.storeStock().filter((row) => {
      const id = Number(
        (row as StoreItemForTaking & Record<string, unknown>).itemId ??
          (row as StoreItemForTaking & Record<string, unknown>)['ItemId'],
      );
      return id === itemId;
    });
    if (!matches.length) {
      // Keep existing hydrated values; only reset when the line is still empty.
      if (
        !preserveCounted &&
        !Number(line.controls.systemQty.value) &&
        !Number(line.controls.averageCost.value)
      ) {
        line.patchValue(
          {
            systemQty: 0,
            countedQty: Number(line.controls.countedQty.value) || 0,
          },
          { emitEvent: false },
        );
      }
      this.recalc(index);
      return;
    }

    // Prefer a row without batch when the line has no batch yet; otherwise first match.
    const preferred =
      matches.find((m) => !String(m.batchNumber ?? '').trim()) ?? matches[0];
    const systemQty = Number(preferred.systemQty ?? 0);
    const averageCost = Number(preferred.averageCost ?? 0);
    const nextCounted = preserveCounted
      ? Number(line.controls.countedQty.value)
      : systemQty;
    line.patchValue(
      {
        systemQty,
        countedQty: nextCounted,
        averageCost: averageCost || Number(line.controls.averageCost.value) || 0,
        batchNumber: preferred.batchNumber ?? line.controls.batchNumber.value,
        expiryDate: this.date(preferred.expiryDate) || line.controls.expiryDate.value,
        unitId: preferred.unitId || line.controls.unitId.value,
        unitName: preferred.unitName ?? line.controls.unitName.value,
      },
      { emitEvent: false },
    );
    this.recalc(index);
  }

  private loadUnitsForLine(
    index: number,
    itemId: number,
    selected: number | null,
    selectPreferred: boolean,
  ): void {
    this.productsService.getUnitsById(itemId).subscribe({
      next: (units) => {
        this.setUnits(index, units ?? []);
        const line = this.details.at(index);
        if (!line || line.controls.itemId.value !== itemId) {
          return;
        }
        if (!selectPreferred && selected != null) {
          const match = (units ?? []).find((u) => u.unitId === selected);
          if (match) {
            line.controls.unitId.setValue(match.unitId, { emitEvent: false });
            line.controls.unitName.setValue(match.unitName ?? '', { emitEvent: false });
            return;
          }
        }
        const preferred =
          (selected != null && (units ?? []).find((u) => u.unitId === selected)) ||
          (units ?? []).find((u) => u.isBaseUnit) ||
          (units ?? [])[0];
        if (preferred) {
          line.controls.unitId.setValue(preferred.unitId, { emitEvent: true });
          line.controls.unitName.setValue(preferred.unitName ?? '', { emitEvent: false });
        }
      },
      error: () => this.setUnits(index, []),
    });
  }

  private setUnits(index: number, units: ProductUnit[]): void {
    this.lineUnits.update((all) => {
      const next = [...all];
      while (next.length <= index) {
        next.push([]);
      }
      next[index] = units;
      return next;
    });
  }

  private normalizeStoreItems(raw: unknown): StoreItemForTaking[] {
    if (Array.isArray(raw)) {
      return raw as StoreItemForTaking[];
    }
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o['$values'])) {
        return o['$values'] as StoreItemForTaking[];
      }
      if (Array.isArray(o['items'])) {
        return o['items'] as StoreItemForTaking[];
      }
      if (Array.isArray(o['data'])) {
        return o['data'] as StoreItemForTaking[];
      }
    }
    return [];
  }

  private date(x?: string | null): string {
    return x ? String(x).slice(0, 10) : '';
  }
}
