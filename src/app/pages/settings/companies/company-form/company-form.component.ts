import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from '../../../../core/api/models/company.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CompaniesService } from '../../../../core/services/companies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-company-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './company-form.component.html',
  styleUrl: './company-form.component.scss',
})
export class CompanyFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private companiesService = inject(CompaniesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  companyId = signal<number | null>(null);

  form = new FormGroup({
    companyArName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    companyEnName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    companyCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    websiteAddress: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    commercialRegister: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    taxNumber: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    baseCurrencyId: new FormControl<number | null>(null),
    chartOfAccountsId: new FormControl<number | null>(null),
    fiscalYearStart: new FormControl('', { nonNullable: true }),
    fiscalYearEnd: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const id = Number(idParam);
      this.isEditMode.set(true);
      this.companyId.set(id);
      this.loadCompany(id);
    }
  }

  loadCompany(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.companiesService.getById(id).subscribe({
      next: (company) => {
        this.form.patchValue({
          companyArName: company.companyArName ?? '',
          companyEnName: company.companyEnName ?? '',
          companyCode: company.companyCode ?? '',
          websiteAddress: company.websiteAddress ?? '',
          commercialRegister: company.commercialRegister ?? '',
          taxNumber: company.taxNumber ?? '',
          baseCurrencyId: company.baseCurrencyId ?? null,
          chartOfAccountsId: company.chartOfAccountsId ?? null,
          fiscalYearStart: this.toDateInput(company.fiscalYearStart),
          fiscalYearEnd: this.toDateInput(company.fiscalYearEnd),
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('companies.notFound')),
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
    const payload = {
      companyArName: raw.companyArName,
      companyEnName: raw.companyEnName,
      companyCode: raw.companyCode || null,
      websiteAddress: raw.websiteAddress || null,
      commercialRegister: raw.commercialRegister || null,
      taxNumber: raw.taxNumber || null,
      baseCurrencyId: raw.baseCurrencyId,
      chartOfAccountsId: raw.chartOfAccountsId,
      fiscalYearStart: this.toApiDateTime(raw.fiscalYearStart),
      fiscalYearEnd: this.toApiDateTime(raw.fiscalYearEnd),
    };

    if (this.isEditMode()) {
      const id = this.companyId();
      if (!id) {
        return;
      }

      const request: UpdateCompanyRequest = {
        companyId: id,
        ...payload,
      };

      this.companiesService.update(id, request).subscribe({
        next: () => this.navigateBack('companies.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const request: CreateCompanyRequest = payload;

    this.companiesService.create(request).subscribe({
      next: () => this.navigateBack('companies.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: 'companies.createSuccess' | 'companies.updateSuccess'): void {
    this.saving.set(false);
    this.router.navigate(['/demo1/settings/companies'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('companies.saveError')),
    );
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }

  private toApiDateTime(value: string): string | null {
    if (!value) {
      return null;
    }
    return new Date(`${value}T00:00:00`).toISOString();
  }
}
