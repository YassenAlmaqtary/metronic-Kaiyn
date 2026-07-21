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
  CreateProductAlternativeRequest,
  CreateProductImageRequest,
  CreateProductRequest,
  CreateProductUnitRequest,
  PRODUCT_ALTERNATIVE_TYPES,
  ProductAlternative,
  ProductImage,
  ProductLookup,
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
  unitName: FormControl<string>;
  conversionFactor: FormControl<number>;
  isBaseUnit: FormControl<boolean>;
  isSalesUnit: FormControl<boolean>;
  isPurchasingUnit: FormControl<boolean>;
  barcode: FormControl<string>;
}>;

type ProductAlternativeGroup = FormGroup<{
  alternativeProductId: FormControl<number | null>;
  alternativeProductName: FormControl<string>;
  alternativeType: FormControl<number>;
  priority: FormControl<number>;
  isActive: FormControl<boolean>;
  notes: FormControl<string>;
}>;

type ProductImageGroup = FormGroup<{
  imagePath: FormControl<string>;
  isMainImage: FormControl<boolean>;
  sortOrder: FormControl<number>;
  imageType: FormControl<string>;
}>;

type DetailTab = 'units' | 'alternatives' | 'images';

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
  uploadingImage = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  productId = signal<number | null>(null);
  groups = signal<ProductGroup[]>([]);
  catalogUnits = signal<Unit[]>([]);
  catalogProducts = signal<ProductLookup[]>([]);
  activeTab = signal<DetailTab>('units');
  unitDraftError = signal('');
  alternativeDraftError = signal('');
  imageDraftError = signal('');

  readonly alternativeTypes = PRODUCT_ALTERNATIVE_TYPES;

  form = new FormGroup({
    productName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(150)],
    }),
    productNameScientific: new FormControl('', { nonNullable: true }),
    proCode: new FormControl('', { nonNullable: true }),
    primaryBarcode: new FormControl('', { nonNullable: true }),
    groupId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    typeId: new FormControl<number | null>(null),
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
    warningExpiry: new FormControl<number | null>(null),
    isTax: new FormControl(false, { nonNullable: true }),
    priceTaxInclusive: new FormControl(false, { nonNullable: true }),
    hasExpiry: new FormControl(false, { nonNullable: true }),
    isBatchManaged: new FormControl(false, { nonNullable: true }),
    isBundle: new FormControl(false, { nonNullable: true }),
    status: new FormControl(true, { nonNullable: true }),
    units: new FormArray<ProductUnitGroup>([]),
    alternatives: new FormArray<ProductAlternativeGroup>([]),
    images: new FormArray<ProductImageGroup>([]),
  });

  unitDraft = new FormGroup({
    unitId: new FormControl<number | null>(null),
    conversionFactor: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.0001)],
    }),
    barcode: new FormControl('', { nonNullable: true }),
  });

  alternativeDraft = new FormGroup({
    alternativeProductId: new FormControl<number | null>(null),
    alternativeType: new FormControl(0, { nonNullable: true }),
    priority: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    notes: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  get units(): FormArray<ProductUnitGroup> {
    return this.form.controls.units;
  }

  get alternatives(): FormArray<ProductAlternativeGroup> {
    return this.form.controls.alternatives;
  }

  get images(): FormArray<ProductImageGroup> {
    return this.form.controls.images;
  }

  availableUnitsForDraft(): Unit[] {
    const selectedIds = new Set(
      this.units.controls
        .map((row) => row.controls.unitId.value)
        .filter((id): id is number => id != null),
    );
    return this.catalogUnits().filter((unit) => !selectedIds.has(unit.unitId));
  }

  availableProductsForDraft(): ProductLookup[] {
    const currentId = this.productId();
    const selectedIds = new Set(
      this.alternatives.controls
        .map((row) => row.controls.alternativeProductId.value)
        .filter((id): id is number => id != null),
    );
    return this.catalogProducts().filter(
      (product) => product.productId !== currentId && !selectedIds.has(product.productId),
    );
  }

  ngOnInit(): void {
    this.loadLookups();

    this.form.controls.warningExpiry.disable({ emitEvent: false });
    this.form.controls.hasExpiry.valueChanges.subscribe((hasExpiry) => {
      if (hasExpiry) {
        this.form.controls.warningExpiry.enable({ emitEvent: false });
      } else {
        this.form.controls.warningExpiry.setValue(null);
        this.form.controls.warningExpiry.disable({ emitEvent: false });
      }
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.productId.set(id);
    this.loadProduct(id);
  }

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  loadLookups(): void {
    this.productGroupsService.getAll().subscribe({
      next: (groups) => this.groups.set(groups.filter((g) => g.status !== false)),
    });
    this.unitsService.getAll().subscribe({
      next: (units) => this.catalogUnits.set(units.filter((u) => u.statusUnit !== false)),
    });
    this.productsService.getAll().subscribe({
      next: (products) => this.catalogProducts.set(products),
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
        const productUnits = product.units?.length ? product.units : units;
        const primaryBarcode =
          productUnits.find((u) => u.isBaseUnit)?.barcode ?? productUnits[0]?.barcode ?? '';

        this.form.patchValue({
          productName: product.productName ?? '',
          productNameScientific: product.productNameScientific ?? '',
          proCode: product.proCode ?? '',
          primaryBarcode: primaryBarcode ?? '',
          groupId: product.groupId ?? null,
          typeId: product.typeId ?? null,
          shelfsName: product.shelfsName ?? '',
          defaultSalesPrice: product.defaultSalesPrice ?? null,
          minSalesPrice: product.minSalesPrice ?? null,
          currentCost: product.currentCost ?? null,
          minQty: product.minQty ?? null,
          maxDiscount: product.maxDiscount ?? null,
          warningExpiry: product.warningExpiry ?? null,
          isTax: product.isTax ?? false,
          priceTaxInclusive: product.priceTaxInclusive ?? false,
          hasExpiry: product.hasExpiry ?? false,
          isBatchManaged: product.isBatchManaged ?? false,
          isBundle: product.isBundle ?? false,
          status: product.status ?? true,
        });

        if (product.hasExpiry) {
          this.form.controls.warningExpiry.enable({ emitEvent: false });
        } else {
          this.form.controls.warningExpiry.disable({ emitEvent: false });
        }

        this.units.clear();
        productUnits.forEach((unit, index) => this.pushUnitRow(unit, index === 0));

        this.alternatives.clear();
        (product.alternatives ?? []).forEach((alt) => this.pushAlternativeRow(alt));

        this.images.clear();
        (product.images ?? []).forEach((image) => this.pushImageRow(image));

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

  insertUnitFromDraft(): void {
    this.unitDraftError.set('');
    const draft = this.unitDraft.getRawValue();

    if (draft.unitId == null) {
      this.unitDraft.controls.unitId.markAsTouched();
      this.unitDraftError.set(this.language.translate('products.required.unitId'));
      return;
    }

    if (this.unitDraft.controls.conversionFactor.invalid) {
      this.unitDraft.controls.conversionFactor.markAsTouched();
      this.unitDraftError.set(this.language.translate('products.units.invalidFactor'));
      return;
    }

    if (this.units.controls.some((row) => row.controls.unitId.value === draft.unitId)) {
      this.unitDraftError.set(this.language.translate('products.units.duplicate'));
      return;
    }

    const catalog = this.catalogUnits().find((u) => u.unitId === draft.unitId);
    const isFirst = this.units.length === 0;
    const barcode =
      draft.barcode.trim() ||
      (isFirst ? this.form.controls.primaryBarcode.value.trim() : '') ||
      null;

    this.pushUnitRow(
      {
        unitId: draft.unitId,
        unitName: catalog?.unitName ?? null,
        conversionFactor: Number(draft.conversionFactor),
        isBaseUnit: isFirst,
        isSalesUnit: isFirst,
        isPurchasingUnit: false,
        barcode,
      },
      isFirst,
    );

    if (isFirst && barcode) {
      this.form.controls.primaryBarcode.setValue(barcode);
    }

    this.unitDraft.reset({
      unitId: null,
      conversionFactor: 1,
      barcode: '',
    });
  }

  removeUnitRow(index: number): void {
    this.units.removeAt(index);
    if (this.units.length === 1) {
      this.units.at(0).patchValue({ isBaseUnit: true, isSalesUnit: true });
    }
    this.syncPrimaryBarcodeFromUnits();
  }

  setBaseUnit(index: number): void {
    this.units.controls.forEach((row, i) => {
      row.controls.isBaseUnit.setValue(i === index);
    });
    this.syncPrimaryBarcodeFromUnits();
  }

  insertAlternativeFromDraft(): void {
    this.alternativeDraftError.set('');
    const draft = this.alternativeDraft.getRawValue();

    if (draft.alternativeProductId == null) {
      this.alternativeDraft.controls.alternativeProductId.markAsTouched();
      this.alternativeDraftError.set(this.language.translate('products.alternatives.requiredProduct'));
      return;
    }

    if (
      this.alternatives.controls.some(
        (row) => row.controls.alternativeProductId.value === draft.alternativeProductId,
      )
    ) {
      this.alternativeDraftError.set(this.language.translate('products.alternatives.duplicate'));
      return;
    }

    const catalog = this.catalogProducts().find((p) => p.productId === draft.alternativeProductId);

    this.pushAlternativeRow({
      alternativeProductId: draft.alternativeProductId,
      alternativeProductName: catalog?.productName ?? null,
      alternativeType: draft.alternativeType,
      priority: Number(draft.priority) || 1,
      isActive: draft.isActive,
      notes: draft.notes.trim() || null,
    });

    this.alternativeDraft.reset({
      alternativeProductId: null,
      alternativeType: 0,
      priority: this.alternatives.length + 1,
      notes: '',
      isActive: true,
    });
  }

  removeAlternativeRow(index: number): void {
    this.alternatives.removeAt(index);
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.imageDraftError.set('');
    this.uploadingImage.set(true);

    this.productsService.uploadImage(file).subscribe({
      next: (path) => {
        this.pushImageRow({
          imagePath: path,
          isMainImage: this.images.length === 0,
          sortOrder: this.images.length + 1,
          imageType: file.type || 'image',
        });
        this.uploadingImage.set(false);
        input.value = '';
      },
      error: (error) => {
        this.uploadingImage.set(false);
        this.imageDraftError.set(
          extractApiErrorMessage(error, this.language.translate('products.images.uploadError')),
        );
        input.value = '';
      },
    });
  }

  setMainImage(index: number): void {
    this.images.controls.forEach((row, i) => {
      row.controls.isMainImage.setValue(i === index);
    });
  }

  removeImageRow(index: number): void {
    this.images.removeAt(index);
    if (this.images.length === 1) {
      this.images.at(0).controls.isMainImage.setValue(true);
    }
  }

  productLabel(product: ProductLookup): string {
    const code = product.proCode ? ` (${product.proCode})` : '';
    return `${product.productName || product.productId}${code}`;
  }

  onSubmit(): void {
    if (this.form.invalid || this.units.length === 0) {
      this.form.markAllAsTouched();
      if (this.units.length === 0) {
        this.activeTab.set('units');
        this.errorMessage.set(this.language.translate('products.required.units'));
      }
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const ownerProductId = this.productId() ?? 0;

    // Keep primary barcode on the base unit when provided in the top card.
    const unitPayload: CreateProductUnitRequest[] = raw.units.map((row, index) => {
      const isBase = row.isBaseUnit || (index === 0 && !raw.units.some((u) => u.isBaseUnit));
      const barcode =
        isBase && raw.primaryBarcode.trim()
          ? raw.primaryBarcode.trim()
          : row.barcode.trim() || null;

      return {
        unitId: row.unitId!,
        unitName: row.unitName || null,
        conversionFactor: Number(row.conversionFactor),
        isBaseUnit: isBase,
        isSalesUnit: row.isSalesUnit,
        isPurchasingUnit: row.isPurchasingUnit,
        barcode,
      };
    });

    const alternativesPayload: CreateProductAlternativeRequest[] = raw.alternatives
      .filter((row) => row.alternativeProductId != null)
      .map((row) => {
        const item: CreateProductAlternativeRequest = {
          alternativeProductId: row.alternativeProductId!,
          alternativeType: row.alternativeType,
          priority: Number(row.priority) || 1,
          isActive: row.isActive,
          notes: row.notes.trim() || null,
        };
        // Only include productId when editing (API requires >= 1).
        if (ownerProductId > 0) {
          item.productId = ownerProductId;
        }
        return item;
      });

    const imagesPayload: CreateProductImageRequest[] = raw.images
      .filter((row) => row.imagePath.trim())
      .map((row, index) => ({
        imagePath: row.imagePath.trim(),
        isMainImage: row.isMainImage,
        sortOrder: Number(row.sortOrder) || index + 1,
        imageType: row.imageType.trim() || null,
      }));

    const payload: CreateProductRequest | UpdateProductRequest = {
      productName: raw.productName.trim(),
      productNameScientific: raw.productNameScientific.trim() || null,
      proCode: raw.proCode.trim() || null,
      groupId: raw.groupId!,
      typeId: raw.typeId != null && Number(raw.typeId) >= 1 ? Number(raw.typeId) : null,
      shelfsName: raw.shelfsName.trim() || null,
      defaultSalesPrice: Number(raw.defaultSalesPrice),
      minSalesPrice: raw.minSalesPrice != null ? Number(raw.minSalesPrice) : null,
      currentCost: Number(raw.currentCost),
      minQty: raw.minQty != null ? Number(raw.minQty) : null,
      maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : null,
      warningExpiry: raw.hasExpiry && raw.warningExpiry != null ? Number(raw.warningExpiry) : null,
      isTax: raw.isTax,
      priceTaxInclusive: raw.priceTaxInclusive,
      hasExpiry: raw.hasExpiry,
      isBatchManaged: raw.isBatchManaged,
      isBundle: raw.isBundle,
      status: raw.status,
      units: unitPayload,
      alternatives: alternativesPayload.length ? alternativesPayload : null,
      images: imagesPayload.length ? imagesPayload : null,
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

  private syncPrimaryBarcodeFromUnits(): void {
    const base =
      this.units.controls.find((row) => row.controls.isBaseUnit.value) ?? this.units.at(0);
    if (base) {
      this.form.controls.primaryBarcode.setValue(base.controls.barcode.value ?? '');
    }
  }

  private pushUnitRow(unit: ProductUnit, forceBase = false): void {
    this.units.push(
      new FormGroup({
        unitId: new FormControl<number | null>(unit.unitId, {
          validators: [Validators.required],
        }),
        unitName: new FormControl(unit.unitName ?? '', { nonNullable: true }),
        conversionFactor: new FormControl(unit.conversionFactor ?? 1, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0.0001)],
        }),
        isBaseUnit: new FormControl(forceBase || unit.isBaseUnit, { nonNullable: true }),
        isSalesUnit: new FormControl(unit.isSalesUnit ?? false, { nonNullable: true }),
        isPurchasingUnit: new FormControl(unit.isPurchasingUnit ?? false, { nonNullable: true }),
        barcode: new FormControl(unit.barcode ?? '', { nonNullable: true }),
      }),
    );
  }

  private pushAlternativeRow(alt: ProductAlternative): void {
    this.alternatives.push(
      new FormGroup({
        alternativeProductId: new FormControl<number | null>(alt.alternativeProductId, {
          validators: [Validators.required],
        }),
        alternativeProductName: new FormControl(alt.alternativeProductName ?? '', {
          nonNullable: true,
        }),
        alternativeType: new FormControl(alt.alternativeType ?? 0, { nonNullable: true }),
        priority: new FormControl(alt.priority ?? 1, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(1)],
        }),
        isActive: new FormControl(alt.isActive ?? true, { nonNullable: true }),
        notes: new FormControl(alt.notes ?? '', { nonNullable: true }),
      }),
    );
  }

  private pushImageRow(image: ProductImage): void {
    this.images.push(
      new FormGroup({
        imagePath: new FormControl(image.imagePath ?? '', {
          nonNullable: true,
          validators: [Validators.required],
        }),
        isMainImage: new FormControl(image.isMainImage ?? false, { nonNullable: true }),
        sortOrder: new FormControl(image.sortOrder ?? this.images.length + 1, {
          nonNullable: true,
        }),
        imageType: new FormControl(image.imageType ?? '', { nonNullable: true }),
      }),
    );
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
