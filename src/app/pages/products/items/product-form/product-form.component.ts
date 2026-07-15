import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ProductGroup } from '../../../../core/api/models/product-group.models';
import {
  CreateProductRequest,
  CreateProductUnitRequest,
  ProductUnit,
  UpdateProductRequest,
} from '../../../../core/api/models/product.models';
import { Unit } from '../../../../core/api/models/unit.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ProductGroupsService } from '../../../../core/services/product-groups.service';
import { ProductsService } from '../../../../core/services/products.service';
import { UnitsService } from '../../../../core/services/units.service';

type ProductUnitGroup = FormGroup<{
  unitId: FormControl<number | null>;
  conversionFactor: FormControl<number>;
  isBaseUnit: FormControl<boolean>;
  isSalesUnit: FormControl<boolean>;
  isPurchasingUnit: FormControl<boolean>;
  barcode: FormControl<string>;
}>;

@Component({
  selector: 'app-product-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private productGroupsService = inject(ProductGroupsService);
  private unitsService = inject(UnitsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  productId = signal<number | null>(null);
  groups = signal<ProductGroup[]>([]);
  catalogUnits = signal<Unit[]>([]);

  form = new FormGroup({
    productName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    }),
    productNameScientific: new FormControl('', { nonNullable: true }),
    proCode: new FormControl('', { nonNullable: true }),
    groupId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    shelfsName: new FormControl('', { nonNullable: true }),
    defaultSalesPrice: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    minSalesPrice: new FormControl<number | null>(null),
    currentCost: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    minQty: new FormControl<number | null>(null),
    maxDiscount: new FormControl<number | null>(null),
    isTax: new FormControl(false, { nonNullable: true }),
    priceTaxInclusive: new FormControl(false, { nonNullable: true }),
    hasExpiry: new FormControl(false, { nonNullable: true }),
    isBatchManaged: new FormControl(false, { nonNullable: true }),
    isBundle: new FormControl(false, { nonNullable: true }),
    status: new FormControl(true, { nonNullable: true }),
    units: new FormArray<ProductUnitGroup>([]),
  });

  get units(): FormArray<ProductUnitGroup> {
    return this.form.controls.units;
  }

  ngOnInit(): void {
    this.loadLookups();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.addUnitRow(true);
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.productId.set(id);
    this.loadProduct(id);
  }

  loadLookups(): void {
    this.productGroupsService.getAll().subscribe({
      next: (groups) => this.groups.set(groups.filter((g) => g.status !== false)),
    });
    this.unitsService.getAll().subscribe({
      next: (units) => this.catalogUnits.set(units.filter((u) => u.statusUnit !== false)),
    });
  }

  loadProduct(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      product: this.productsService.getById(id),
      units: this.productsService.getUnitsById(id),
    }).subscribe({
      next: ({ product, units }) => {
        this.form.patchValue({
          productName: product.productName ?? '',
          productNameScientific: product.productNameScientific ?? '',
          proCode: product.proCode ?? '',
          groupId: product.groupId ?? null,
          shelfsName: product.shelfsName ?? '',
          defaultSalesPrice: product.defaultSalesPrice ?? null,
          minSalesPrice: product.minSalesPrice ?? null,
          currentCost: product.currentCost ?? null,
          minQty: product.minQty ?? null,
          maxDiscount: product.maxDiscount ?? null,
          isTax: product.isTax ?? false,
          priceTaxInclusive: product.priceTaxInclusive ?? false,
          hasExpiry: product.hasExpiry ?? false,
          isBatchManaged: product.isBatchManaged ?? false,
          isBundle: product.isBundle ?? false,
          status: product.status ?? true,
        });

        const productUnits = product.units?.length ? product.units : units;
        this.units.clear();
        if (productUnits.length) {
          productUnits.forEach((unit, index) => this.addUnitRow(index === 0, unit));
        } else {
          this.addUnitRow(true);
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('products.notFound')),
        );
      },
    });
  }

  createUnitGroup(isFirst = false, unit?: ProductUnit): ProductUnitGroup {
    return new FormGroup({
      unitId: new FormControl<number | null>(unit?.unitId ?? null, {
        validators: [Validators.required],
      }),
      conversionFactor: new FormControl(unit?.conversionFactor ?? 1, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0.0001)],
      }),
      isBaseUnit: new FormControl(unit?.isBaseUnit ?? isFirst, { nonNullable: true }),
      isSalesUnit: new FormControl(unit?.isSalesUnit ?? isFirst, { nonNullable: true }),
      isPurchasingUnit: new FormControl(unit?.isPurchasingUnit ?? false, { nonNullable: true }),
      barcode: new FormControl(unit?.barcode ?? '', { nonNullable: true }),
    });
  }

  addUnitRow(isFirst = false, unit?: ProductUnit): void {
    this.units.push(this.createUnitGroup(isFirst, unit));
  }

  removeUnitRow(index: number): void {
    if (this.units.length <= 1) {
      return;
    }
    this.units.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid || this.units.length === 0) {
      this.form.markAllAsTouched();
      this.units.controls.forEach((control) => control.markAllAsTouched());
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const unitPayload: CreateProductUnitRequest[] = raw.units.map((row) => {
      const catalog = this.catalogUnits().find((u) => u.unitId === row.unitId);
      return {
        unitId: row.unitId!,
        unitName: catalog?.unitName ?? null,
        conversionFactor: Number(row.conversionFactor),
        isBaseUnit: row.isBaseUnit,
        isSalesUnit: row.isSalesUnit,
        isPurchasingUnit: row.isPurchasingUnit,
        barcode: row.barcode.trim() || null,
      };
    });

    const payload: CreateProductRequest | UpdateProductRequest = {
      productName: raw.productName.trim(),
      productNameScientific: raw.productNameScientific.trim() || null,
      proCode: raw.proCode.trim() || null,
      groupId: raw.groupId!,
      shelfsName: raw.shelfsName.trim() || null,
      defaultSalesPrice: Number(raw.defaultSalesPrice),
      minSalesPrice: raw.minSalesPrice != null ? Number(raw.minSalesPrice) : null,
      currentCost: Number(raw.currentCost),
      minQty: raw.minQty != null ? Number(raw.minQty) : null,
      maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : null,
      isTax: raw.isTax,
      priceTaxInclusive: raw.priceTaxInclusive,
      hasExpiry: raw.hasExpiry,
      isBatchManaged: raw.isBatchManaged,
      isBundle: raw.isBundle,
      status: raw.status,
      units: unitPayload,
    };

    if (this.isEditMode()) {
      const id = this.productId();
      if (!id) {
        return;
      }

      this.productsService.update(id, payload).subscribe({
        next: () => this.navigateBack('products.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.productsService.create(payload).subscribe({
      next: () => this.navigateBack('products.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/products/items'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('products.saveError')),
    );
  }
}
