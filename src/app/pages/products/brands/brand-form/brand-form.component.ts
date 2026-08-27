import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Company } from '../../../../core/api/models/company.models';
import { CreateBrandRequest, UpdateBrandRequest } from '../../../../core/api/models/brand.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BrandsService } from '../../../../core/services/brands.service';
import { CompaniesService } from '../../../../core/services/companies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-brand-form',
  imports: [RouterLink, ReactiveFormsModule, FormsModule, TranslatePipe],
  templateUrl: './brand-form.component.html',
  styleUrl: './brand-form.component.scss',
})
export class BrandFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private brandsService = inject(BrandsService);
  private companiesService = inject(CompaniesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  brandId = signal<number | null>(null);
  companies = signal<Company[]>([]);

  form = new FormGroup({
    brandArName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    brandEnName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    details: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(500)],
    }),
    companyId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    status: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCompanies();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.brandId.set(id);
    this.loadBrand(id);
  }

  companyLabel(company: Company): string {
    if (this.language.locale() === 'ar') {
      return company.companyArName || company.companyEnName || String(company.companyId);
    }
    return company.companyEnName || company.companyArName || String(company.companyId);
  }

  loadCompanies(): void {
    this.companiesService.getAll().subscribe({
      next: (companies) => this.companies.set(companies),
      error: () => this.companies.set([]),
    });
  }

  loadBrand(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.brandsService.getById(id).subscribe({
      next: (brand) => {
        this.form.patchValue({
          brandArName: brand.brandArName ?? '',
          brandEnName: brand.brandEnName ?? '',
          details: brand.details ?? '',
          companyId: brand.companyId ?? null,
          status: brand.status ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('brands.notFound')),
        );
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const companyId = raw.companyId;
    if (companyId == null) {
      this.saving.set(false);
      return;
    }

    const basePayload = {
      brandArName: raw.brandArName.trim(),
      brandEnName: raw.brandEnName.trim(),
      details: raw.details.trim(),
      companyId,
      status: raw.status,
    };

    if (this.isEditMode()) {
      const id = this.brandId();
      if (!id) {
        return;
      }

      const payload: UpdateBrandRequest = {
        brandId: id,
        ...basePayload,
      };

      this.brandsService.update(id, payload).subscribe({
        next: () => this.navigateBack('brands.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateBrandRequest = basePayload;
    this.brandsService.create(payload).subscribe({
      next: () => this.navigateBack('brands.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/products/brands'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('brands.saveError')),
    );
  }
}
