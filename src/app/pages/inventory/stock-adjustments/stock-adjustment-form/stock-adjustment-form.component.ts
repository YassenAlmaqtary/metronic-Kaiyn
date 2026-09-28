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
import { catchError, finalize } from 'rxjs/operators';

import { Product, ProductLookup, ProductUnit } from '../../../../core/api/models/product.models';
import {
  SaveStockAdjustmentRequest,
  StockAdjustmentDetail,
  StockAdjustmentStatus,
} from '../../../../core/api/models/stock-adjustment.models';
import { TakingAvailableForAdjustment, StoreItemForTaking } from '../../../../core/api/models/stock-taking.models';
import { Store } from '../../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductsService } from '../../../../core/services/products.service';
import { StockAdjustmentsService } from '../../../../core/services/stock-adjustments.service';
import { StockIssuesService } from '../../../../core/services/stock-issues.service';
import { StockTakingsService } from '../../../../core/services/stock-takings.service';
import { StoresService } from '../../../../core/services/stores.service';

type AdjLine = FormGroup<{
  itemId: FormControl<number | null>;
  itemName: FormControl<string>;
  unitId: FormControl<number | null>;
  unitName: FormControl<string>;
  oldQty: FormControl<number>;
  adjQty: FormControl<number>;
  newQty: FormControl<number>;
  averageCost: FormControl<number>;
  totalValue: FormControl<number>;
  batchNumber: FormControl<string>;
  expiryDate: FormControl<string>;
}>;

@Component({
  selector: 'app-stock-adjustment-form',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, DecimalPipe],
  templateUrl: './stock-adjustment-form.component.html',
  styleUrl: './stock-adjustment-form.component.scss',
})
export class StockAdjustmentFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(StockAdjustmentsService);
  private takings = inject(StockTakingsService);
  private issues = inject(StockIssuesService);
  private storesService = inject(StoresService);
  private productsService = inject(ProductsService);
  private language = inject(LanguageService);
  private destroyRef = inject(DestroyRef);

  id = signal<number | null>(null);
  adjNo = signal('');
  loading = signal(false);
  loadingItems = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');
  readOnly = signal(false);
  stores = signal<Store[]>([]);
  products = signal<ProductLookup[]>([]);
  availableTakings = signal<TakingAvailableForAdjustment[]>([]);
  lineUnits = signal<ProductUnit[][]>([]);
  private storeStock = signal<StoreItemForTaking[]>([]);

  form = new FormGroup({
    takingId: new FormControl<number | null>(null),
    storeId: new FormControl<number | null>(null, Validators.required),
    adjDate: new FormControl(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: Validators.required,
    }),
    notes: new FormControl('', { nonNullable: true }),
    details: new FormArray<AdjLine>([]),
  });

  get details(): FormArray<AdjLine> {
    return this.form.controls.details;
  }

  totalValueSum(): number {
    return this.details.controls.reduce(
      (sum, line) => sum + (Number(line.controls.totalValue.value) || 0),
      0,
    );
  }

  ngOnInit(): void {
    this.storesService.getAll().subscribe({ next: (x) => this.stores.set(x ?? []) });
    this.productsService.getAll().subscribe({ next: (x) => this.products.set(x ?? []) });
    this.takings.getAvailableForAdjustment().subscribe({
      next: (x) => this.availableTakings.set(this.normalizeTakings(x)),
      error: () => this.availableTakings.set([]),
    });

    this.form.controls.takingId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((takingId) => this.onTakingSelected(takingId));

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
        this.adjNo.set(x.adjNo ?? '');
        this.form.patchValue({
          takingId: x.takingId ?? null,
          storeId: x.storeId,
          adjDate: this.date(x.adjDate),
          notes: x.notes ?? '',
        });
        this.details.clear();
        this.lineUnits.set([]);
        (x.details ?? []).forEach((d) => this.addLine(d));
        this.readOnly.set(x.statusId === StockAdjustmentStatus.Posted);
        if (this.readOnly()) {
          this.form.disable({ emitEvent: false });
        } else if (x.takingId) {
          // قفل الجرد/المخزن فقط للتسوية المرتبطة بجرد — الأسطر قابلة للتعديل
          this.form.controls.takingId.disable({ emitEvent: false });
          this.form.controls.storeId.disable({ emitEvent: false });
        }
        if (x.storeId) {
          this.refreshStoreStock(x.storeId);
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockAdjustments.notFound')),
        );
      },
    });
  }

  loadFromTaking(): void {
    const takingId = this.form.controls.takingId.value;
    if (!takingId) {
      this.errorMessage.set(this.language.translate('stockAdjustments.selectTakingFirst'));
      return;
    }

    this.errorMessage.set('');
    this.infoMessage.set('');
    this.loadingItems.set(true);
    this.onTakingSelected(takingId);

    this.service
      .getItemsFromTaking(takingId)
      .pipe(
        catchError((e) => {
          this.errorMessage.set(
            extractApiErrorMessage(e, this.language.translate('stockAdjustments.loadItemsError')),
          );
          return of([] as StockAdjustmentDetail[]);
        }),
      )
      .subscribe((items) => {
        if (this.errorMessage()) {
          this.loadingItems.set(false);
          return;
        }
        const normalized = (items ?? [])
          .map((row) => this.normalizeDetail(row))
          .filter((row) => row.itemId > 0 && (Number(row.adjQty) || 0) !== 0);

        if (normalized.length) {
          this.loadingItems.set(false);
          this.details.clear();
          this.lineUnits.set([]);
          normalized.forEach((d) => this.addLine(d));
          this.infoMessage.set(
            this.language
              .translate('stockAdjustments.loadItemsSuccess')
              .replace('{count}', String(normalized.length)),
          );
          return;
        }

        this.loadTakingFallback(takingId);
      });
  }

  addLine(x?: Partial<StockAdjustmentDetail>): void {
    const oldQty = Number(x?.oldQty ?? 0);
    let adjQty = Number(x?.adjQty ?? 0);
    let newQty = Number(x?.newQty ?? oldQty + adjQty);
    // إصلاح بيانات محفوظة بـ Adj=0 بينما New ≠ Old
    if (adjQty === 0 && newQty !== oldQty) {
      adjQty = Number((newQty - oldQty).toFixed(4));
    } else {
      newQty = Number((oldQty + adjQty).toFixed(4));
    }
    const averageCost = Number(x?.averageCost ?? 0);
    const totalValue = Number(x?.totalValue ?? Math.abs(adjQty) * averageCost);

    const line = new FormGroup({
      itemId: new FormControl<number | null>(x?.itemId ?? null, Validators.required),
      itemName: new FormControl(x?.itemName ?? '', { nonNullable: true }),
      unitId: new FormControl<number | null>(x?.unitId ?? null, Validators.required),
      unitName: new FormControl(x?.unitName ?? '', { nonNullable: true }),
      oldQty: new FormControl(oldQty, { nonNullable: true }),
      adjQty: new FormControl(adjQty, { nonNullable: true }),
      newQty: new FormControl(newQty, { nonNullable: true }),
      averageCost: new FormControl(averageCost, { nonNullable: true }),
      totalValue: new FormControl(totalValue, { nonNullable: true }),
      batchNumber: new FormControl(x?.batchNumber ?? '', { nonNullable: true }),
      expiryDate: new FormControl(this.date(x?.expiryDate), { nonNullable: true }),
    });

    this.details.push(line);
    this.lineUnits.update((all) => [...all, []]);
    const index = this.details.length - 1;
    this.bindLine(line, index);
    this.recalc(index);

    if (x?.itemId) {
      this.loadUnitsForLine(index, x.itemId, x.unitId ?? null);
    }
  }

  unitsFor(i: number): ProductUnit[] {
    return this.lineUnits()[i] ?? [];
  }

  hasProduct(itemId: number | null): boolean {
    return itemId != null && this.products().some((p) => p.productId === itemId);
  }

  productLabel(itemId: number | null, fallback: string): string {
    if (itemId == null) {
      return fallback;
    }
    return this.products().find((p) => p.productId === itemId)?.productName || fallback || String(itemId);
  }

  recalc(i: number): void {
    const g = this.details.at(i);
    if (!g) {
      return;
    }
    const oldQty = Number(g.controls.oldQty.value) || 0;
    const adjQty = Number(g.controls.adjQty.value) || 0;
    const averageCost = Number(g.controls.averageCost.value) || 0;
    g.controls.newQty.setValue(Number((oldQty + adjQty).toFixed(4)), { emitEvent: false });
    g.controls.totalValue.setValue(Number((Math.abs(adjQty) * averageCost).toFixed(4)), {
      emitEvent: false,
    });
  }

  onAdjInput(i: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const g = this.details.at(i);
    if (!g || Number.isNaN(value)) {
      return;
    }
    g.controls.adjQty.setValue(value, { emitEvent: false });
    this.recalc(i);
  }

  removeLine(i: number): void {
    this.details.removeAt(i);
    this.lineUnits.update((all) => all.filter((_, idx) => idx !== i));
  }

  save(): void {
    if (this.readOnly()) {
      return;
    }
    if (this.form.invalid || !this.details.length) {
      this.form.markAllAsTouched();
      this.errorMessage.set(
        this.language.translate(
          !this.details.length ? 'stockAdjustments.emptyLines' : 'stockAdjustments.saveError',
        ),
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const v = this.form.getRawValue(); // يشمل الحقول المعطّلة (جرد/مخزن)
    const details = this.details.controls.map((ctrl) => {
      const oldQty = Number(ctrl.controls.oldQty.value) || 0;
      let adjQty = Number(ctrl.controls.adjQty.value) || 0;
      let newQty = Number(ctrl.controls.newQty.value) || 0;
      if (adjQty === 0 && newQty !== oldQty) {
        adjQty = Number((newQty - oldQty).toFixed(4));
      }
      newQty = Number((oldQty + adjQty).toFixed(4));
      const averageCost = Number(ctrl.controls.averageCost.value) || 0;
      return {
        itemId: Number(ctrl.controls.itemId.value),
        unitId: Number(ctrl.controls.unitId.value),
        oldQty,
        adjQty,
        newQty,
        averageCost,
        totalValue: Number((Math.abs(adjQty) * averageCost).toFixed(4)),
        batchNumber: String(ctrl.controls.batchNumber.value || '') || null,
        expiryDate: String(ctrl.controls.expiryDate.value || '') || null,
      };
    });

    if (details.every((d) => d.adjQty === 0)) {
      this.saving.set(false);
      this.errorMessage.set(this.language.translate('stockAdjustments.emptyAdjQty'));
      return;
    }

    const payload: SaveStockAdjustmentRequest = {
      adjId: this.id() ?? undefined,
      takingId: v.takingId,
      storeId: Number(v.storeId),
      adjDate: v.adjDate,
      notes: v.notes || null,
      details,
    };

    this.service.save(payload).subscribe({
      next: () =>
        void this.router.navigate(['/demo1/inventory/stock-adjustments'], {
          state: { successMessage: this.language.translate('stockAdjustments.saveSuccess') },
        }),
      error: (e) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(e, this.language.translate('stockAdjustments.saveError')),
        );
      },
    });
  }

  private onTakingSelected(takingId: number | null): void {
    if (!takingId) {
      return;
    }
    const taking = this.availableTakings().find((t) => t.takingId === takingId);
    if (taking?.storeId) {
      this.form.controls.storeId.setValue(taking.storeId, { emitEvent: false });
      this.refreshStoreStock(taking.storeId);
    }
  }

  private loadTakingFallback(takingId: number): void {
    this.loadingItems.set(true);
    this.takings
      .getById(takingId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingItems.set(false)),
      )
      .subscribe((taking) => {
        if (!taking?.details?.length) {
          this.details.clear();
          this.lineUnits.set([]);
          this.errorMessage.set(this.language.translate('stockAdjustments.emptyTakingItems'));
          return;
        }
        if (taking.storeId) {
          this.form.controls.storeId.setValue(taking.storeId, { emitEvent: false });
        }
        const mapped: StockAdjustmentDetail[] = taking.details
          .map((d) => {
            const oldQty = Number(d.systemQty ?? 0);
            const newQty = Number(d.countedQty ?? oldQty);
            const adjQty = Number(
              d.differenceQty != null && Number(d.differenceQty) !== 0
                ? d.differenceQty
                : newQty - oldQty,
            );
            return {
              itemId: d.itemId,
              itemName: d.itemName,
              unitId: d.unitId,
              unitName: d.unitName,
              batchNumber: d.batchNumber,
              expiryDate: d.expiryDate,
              oldQty,
              adjQty,
              newQty,
              averageCost: Number(d.averageCost ?? 0),
              totalValue: Math.abs(adjQty) * Number(d.averageCost ?? 0),
            } satisfies StockAdjustmentDetail;
          })
          .filter((d) => d.adjQty !== 0);

        if (!mapped.length) {
          this.details.clear();
          this.lineUnits.set([]);
          this.errorMessage.set(this.language.translate('stockAdjustments.emptyTakingItems'));
          return;
        }

        this.errorMessage.set('');
        this.details.clear();
        this.lineUnits.set([]);
        mapped.forEach((d) => this.addLine(d));
        this.infoMessage.set(
          this.language
            .translate('stockAdjustments.loadItemsSuccess')
            .replace('{count}', String(mapped.length)),
        );
      });
  }

  private bindLine(line: AdjLine, index: number): void {
    line.controls.itemId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rawId) => {
      const itemId = rawId == null || rawId === ('' as never) ? null : Number(rawId);
      const i = this.details.controls.indexOf(line);
      const rowIndex = i >= 0 ? i : index;

      if (!itemId || Number.isNaN(itemId)) {
        this.setUnits(rowIndex, []);
        line.patchValue(
          {
            itemName: '',
            unitId: null,
            unitName: '',
            oldQty: 0,
            adjQty: 0,
            newQty: 0,
            averageCost: 0,
            totalValue: 0,
            batchNumber: '',
            expiryDate: '',
          },
          { emitEvent: false },
        );
        this.recalc(rowIndex);
        return;
      }

      this.hydrateLineFromItem(rowIndex, itemId);
    });

    line.controls.unitId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rawUnitId) => {
      const i = this.details.controls.indexOf(line);
      if (i < 0) {
        return;
      }
      const unitId = rawUnitId == null ? null : Number(rawUnitId);
      const unit = this.unitsFor(i).find((u) => u.unitId === unitId);
      line.controls.unitName.setValue(unit?.unitName ?? '', { emitEvent: false });
      const itemId = Number(line.controls.itemId.value);
      if (itemId && unitId) {
        this.refreshAvailableQty(i, itemId, unitId);
      }
    });

    line.controls.adjQty.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const i = this.details.controls.indexOf(line);
      if (i >= 0) {
        this.recalc(i);
      }
    });

    line.controls.averageCost.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const i = this.details.controls.indexOf(line);
      if (i >= 0) {
        this.recalc(i);
      }
    });
  }

  /** Loads unit / system qty / avg cost / batch when an item is picked. */
  private hydrateLineFromItem(index: number, itemId: number): void {
    const line = this.details.at(index);
    if (!line) {
      return;
    }

    const storeId = this.form.controls.storeId.value;
    if (!storeId) {
      this.errorMessage.set(this.language.translate('stockAdjustments.selectStoreFirst'));
    } else {
      this.errorMessage.set('');
    }

    const product = this.products().find((p) => Number(p.productId) === itemId);
    line.controls.itemName.setValue(product?.productName ?? '', { emitEvent: false });

    // 1) Units — always, even without store
    this.productsService
      .getUnitsById(itemId)
      .pipe(catchError(() => of([] as ProductUnit[])))
      .subscribe((rawUnits) => {
        if (this.details.at(index)?.controls.itemId.value !== itemId) {
          return;
        }
        const units = this.normalizeUnits(rawUnits);
        this.setUnits(index, units);
        const preferred = units.find((u) => u.isBaseUnit) || units[0];
        if (preferred) {
          line.controls.unitId.setValue(preferred.unitId, { emitEvent: false });
          line.controls.unitName.setValue(preferred.unitName ?? '', { emitEvent: false });
          if (storeId) {
            this.refreshAvailableQty(index, itemId, preferred.unitId);
          }
        }
      });

    // 2) Product cost
    this.productsService
      .getById(itemId)
      .pipe(catchError(() => of(null)))
      .subscribe((full) => {
        if (!full || Number(this.details.at(index)?.controls.itemId.value) !== itemId) {
          return;
        }
        const product = full as Product & Record<string, unknown>;
        const cost = Number(product.currentCost ?? product['CurrentCost'] ?? 0);
        if (cost > 0) {
          line.controls.averageCost.setValue(cost, { emitEvent: false });
          this.recalc(index);
        }
      });

    // 3) Store balance / batch / avg cost from Products_Qty snapshot
    if (!storeId) {
      return;
    }

    const applyFromCache = (): void => {
      if (this.details.at(index)?.controls.itemId.value !== itemId) {
        return;
      }
      this.applyStockSnapshot(index, itemId);
      const unitId = Number(line.controls.unitId.value);
      if (unitId) {
        this.refreshAvailableQty(index, itemId, unitId);
      }
    };

    if (this.storeStock().length) {
      applyFromCache();
      return;
    }

    this.takings
      .getStoreItems(storeId)
      .pipe(catchError(() => of([] as StoreItemForTaking[])))
      .subscribe((raw) => {
        this.storeStock.set(this.normalizeStoreItems(raw));
        applyFromCache();
      });
  }

  private refreshStoreStock(storeId: number): void {
    this.takings
      .getStoreItems(storeId)
      .pipe(catchError(() => of([] as StoreItemForTaking[])))
      .subscribe((raw) => {
        this.storeStock.set(this.normalizeStoreItems(raw));
        this.details.controls.forEach((line, index) => {
          const itemId = Number(line.controls.itemId.value);
          if (itemId && !Number(line.controls.oldQty.value)) {
            this.applyStockSnapshot(index, itemId, true);
          }
        });
      });
  }

  private applyStockSnapshot(index: number, itemId: number, preserveAdj = false): void {
    const line = this.details.at(index);
    if (!line) {
      return;
    }
    const matches = this.storeStock().filter((row) => this.rowItemId(row) === itemId);
    if (!matches.length) {
      return;
    }

    const preferred =
      matches.find((m) => !String(this.rowField(m, 'batchNumber', 'BatchNumber') ?? '').trim()) ??
      matches[0];
    const oldQty = matches.reduce(
      (sum, m) => sum + Number(this.rowField(m, 'systemQty', 'SystemQty') ?? 0),
      0,
    );
    const averageCost = Number(this.rowField(preferred, 'averageCost', 'AverageCost') ?? 0);
    const unitId = Number(this.rowField(preferred, 'unitId', 'UnitId') ?? line.controls.unitId.value ?? 0) || null;
    const unitName = String(
      this.rowField(preferred, 'unitName', 'UnitName') ?? line.controls.unitName.value ?? '',
    );

    const patch: {
      oldQty: number;
      averageCost: number;
      batchNumber: string;
      expiryDate: string;
      unitId: number | null;
      unitName: string;
      adjQty?: number;
    } = {
      oldQty,
      averageCost: averageCost || Number(line.controls.averageCost.value) || 0,
      batchNumber: String(
        this.rowField(preferred, 'batchNumber', 'BatchNumber') ?? line.controls.batchNumber.value ?? '',
      ),
      expiryDate:
        this.date(this.rowField(preferred, 'expiryDate', 'ExpiryDate') as string | null) ||
        line.controls.expiryDate.value,
      unitId: unitId ?? line.controls.unitId.value,
      unitName: unitName || line.controls.unitName.value,
    };
    // لا تمسح كمية التسوية إن كانت مُدخلة مسبقاً (مثلاً من تحميل الجرد)
    if (!preserveAdj && !Number(line.controls.adjQty.value)) {
      patch.adjQty = 0;
    }
    line.patchValue(patch, { emitEvent: false });
    this.recalc(index);
  }

  private rowItemId(row: StoreItemForTaking): number {
    return Number(this.rowField(row, 'itemId', 'ItemId') ?? 0);
  }

  private rowField(row: StoreItemForTaking, camel: string, pascal: string): unknown {
    const r = row as unknown as Record<string, unknown>;
    return r[camel] ?? r[pascal];
  }

  private refreshAvailableQty(index: number, itemId: number, unitId: number): void {
    const line = this.details.at(index);
    const storeId = this.form.controls.storeId.value;
    if (!line || !storeId) {
      return;
    }

    const store = this.stores().find((s) => s.storeId === storeId);
    const branchId = Number(store?.branchId ?? 0);
    // Without branch we still keep snapshot qty; available-qty API needs branchId.
    if (!branchId) {
      return;
    }

    this.issues
      .getAvailableQty({
        itemId,
        unitId,
        storeId,
        branchId,
        batchNo: line.controls.batchNumber.value || undefined,
        expiryDate: line.controls.expiryDate.value || undefined,
      })
      .pipe(catchError(() => of(null)))
      .subscribe((qty) => {
        if (!qty || Number(this.details.at(index)?.controls.itemId.value) !== itemId) {
          return;
        }
        const oldQty = Number(qty.qtyInUnit ?? qty.baseQty ?? 0);
        line.controls.oldQty.setValue(oldQty, { emitEvent: false });
        this.recalc(index);
      });
  }

  private loadUnitsForLine(index: number, itemId: number, selected: number | null): void {
    this.productsService
      .getUnitsById(itemId)
      .pipe(catchError(() => of([] as ProductUnit[])))
      .subscribe((raw) => {
        const units = this.normalizeUnits(raw);
        this.setUnits(index, units);
        const line = this.details.at(index);
        if (!line || Number(line.controls.itemId.value) !== itemId) {
          return;
        }
        const preferred =
          (selected != null && units.find((u) => Number(u.unitId) === selected)) ||
          units.find((u) => u.isBaseUnit) ||
          units[0];
        if (preferred) {
          line.controls.unitId.setValue(Number(preferred.unitId), { emitEvent: false });
          line.controls.unitName.setValue(preferred.unitName ?? '', { emitEvent: false });
          this.refreshAvailableQty(index, itemId, Number(preferred.unitId));
        }
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

  private normalizeUnits(raw: unknown): ProductUnit[] {
    const list = this.asArray<ProductUnit>(raw);
    return list.map((u) => {
      const r = u as ProductUnit & Record<string, unknown>;
      return {
        unitId: Number(r.unitId ?? r['UnitId'] ?? 0),
        unitName: String(r.unitName ?? r['UnitName'] ?? ''),
        conversionFactor: Number(r.conversionFactor ?? r['ConversionFactor'] ?? 1) || 1,
        isBaseUnit: Boolean(r.isBaseUnit ?? r['IsBaseUnit'] ?? false),
        isPurchasingUnit: Boolean(r.isPurchasingUnit ?? r['IsPurchasingUnit'] ?? false),
        isSalesUnit: Boolean(r.isSalesUnit ?? r['IsSalesUnit'] ?? false),
        barcode: (r.barcode ?? r['Barcode'] ?? null) as string | null,
      };
    }).filter((u) => u.unitId > 0);
  }

  private normalizeStoreItems(raw: unknown): StoreItemForTaking[] {
    return this.asArray<StoreItemForTaking>(raw);
  }

  private asArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o['$values'])) {
        return o['$values'] as T[];
      }
      if (Array.isArray(o['items'])) {
        return o['items'] as T[];
      }
      if (Array.isArray(o['data'])) {
        return o['data'] as T[];
      }
    }
    return [];
  }

  private normalizeDetail(row: StockAdjustmentDetail | Record<string, unknown>): StockAdjustmentDetail {
    const r = row as Record<string, unknown>;
    const itemId = Number(r['itemId'] ?? r['ItemId'] ?? 0);
    const unitId = Number(r['unitId'] ?? r['UnitId'] ?? 0);
    const oldQty = Number(r['oldQty'] ?? r['OldQty'] ?? 0);
    const newQty = Number(r['newQty'] ?? r['NewQty'] ?? oldQty);
    const adjQty = Number(r['adjQty'] ?? r['AdjQty'] ?? newQty - oldQty);
    const averageCost = Number(r['averageCost'] ?? r['AverageCost'] ?? 0);
    return {
      itemId,
      itemName: String(r['itemName'] ?? r['ItemName'] ?? ''),
      unitId,
      unitName: String(r['unitName'] ?? r['UnitName'] ?? ''),
      batchNumber: (r['batchNumber'] ?? r['BatchNumber'] ?? '') as string,
      expiryDate: (r['expiryDate'] ?? r['ExpiryDate']) as string | null,
      oldQty,
      adjQty,
      newQty,
      averageCost,
      totalValue: Number(r['totalValue'] ?? r['TotalValue'] ?? Math.abs(adjQty) * averageCost),
    };
  }

  private normalizeTakings(raw: unknown): TakingAvailableForAdjustment[] {
    return this.asArray<TakingAvailableForAdjustment>(raw);
  }

  private date(x?: string | null): string {
    return x ? String(x).slice(0, 10) : '';
  }
}
