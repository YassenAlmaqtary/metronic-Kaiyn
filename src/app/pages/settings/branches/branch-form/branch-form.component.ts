import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Company } from '../../../../core/api/models/company.models';
import {
  CreateBranchRequest,
  UpdateBranchRequest,
} from '../../../../core/api/models/branch.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { CompaniesService } from '../../../../core/services/companies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-branch-form',
  imports: [RouterLink, ReactiveFormsModule, FormsModule, TranslatePipe],
  templateUrl: './branch-form.component.html',
  styleUrl: './branch-form.component.scss',
})
export class BranchFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private branchesService = inject(BranchesService);
  private companiesService = inject(CompaniesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  branchRecordId = signal<number | null>(null);
  companies = signal<Company[]>([]);

  form = new FormGroup({
    branchId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    branchName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    branchCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    numberOf: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    series: new FormControl<number | null>(null),
    companyId: new FormControl<number | null>(null),
    brandId: new FormControl<number | null>(null),
    managerId: new FormControl<number | null>(null),
    openingDate: new FormControl('', { nonNullable: true }),
    closingDate: new FormControl('', { nonNullable: true }),
    accountingPeriodId: new FormControl<number | null>(null),
    defaultWarehouseId: new FormControl<number | null>(null),
    defaultCashAccountId: new FormControl<number | null>(null),
    defaultBankAccountId: new FormControl<number | null>(null),
    salesAccountId: new FormControl<number | null>(null),
    purchasesAccountId: new FormControl<number | null>(null),
    inventoryAccountId: new FormControl<number | null>(null),
    costOfSalesAccountId: new FormControl<number | null>(null),
    expensesAccountId: new FormControl<number | null>(null),
    vatAccountId: new FormControl<number | null>(null),
    separateInventory: new FormControl(false, { nonNullable: true }),
    allowNegativeStock: new FormControl(false, { nonNullable: true }),
    useBranchPricing: new FormControl(false, { nonNullable: true }),
    useBranchVAT: new FormControl(false, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCompanies();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.isEditMode.set(true);
      this.branchRecordId.set(id);
      this.form.controls.branchId.disable();
      this.loadBranch(id);
    }
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

  loadBranch(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.branchesService.getById(id).subscribe({
      next: (branch) => {
        this.form.patchValue({
          branchId: branch.branchId,
          branchName: branch.branchName ?? '',
          branchCode: branch.branchCode ?? '',
          location: branch.location ?? '',
          phone: branch.phone ?? '',
          numberOf: branch.numberOf ?? '',
          series: branch.series ?? null,
          companyId: branch.companyId ?? null,
          brandId: branch.brandId ?? null,
          managerId: branch.managerId ?? null,
          openingDate: this.toDateInput(branch.openingDate),
          closingDate: this.toDateInput(branch.closingDate),
          accountingPeriodId: branch.accountingPeriodId ?? null,
          defaultWarehouseId: branch.defaultWarehouseId ?? null,
          defaultCashAccountId: branch.defaultCashAccountId ?? null,
          defaultBankAccountId: branch.defaultBankAccountId ?? null,
          salesAccountId: branch.salesAccountId ?? null,
          purchasesAccountId: branch.purchasesAccountId ?? null,
          inventoryAccountId: branch.inventoryAccountId ?? null,
          costOfSalesAccountId: branch.costOfSalesAccountId ?? null,
          expensesAccountId: branch.expensesAccountId ?? null,
          vatAccountId: branch.vatAccountId ?? null,
          separateInventory: branch.separateInventory,
          allowNegativeStock: branch.allowNegativeStock,
          useBranchPricing: branch.useBranchPricing,
          useBranchVAT: branch.useBranchVAT,
          isActive: branch.isActive,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('branches.notFound')),
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
    const payload: UpdateBranchRequest = {
      branchName: raw.branchName || null,
      branchCode: raw.branchCode || null,
      location: raw.location || null,
      phone: raw.phone || null,
      numberOf: raw.numberOf || null,
      series: raw.series,
      companyId: raw.companyId,
      brandId: raw.brandId,
      managerId: raw.managerId,
      openingDate: this.toApiDateTime(raw.openingDate),
      closingDate: this.toApiDateTime(raw.closingDate),
      accountingPeriodId: raw.accountingPeriodId,
      defaultWarehouseId: raw.defaultWarehouseId,
      defaultCashAccountId: raw.defaultCashAccountId,
      defaultBankAccountId: raw.defaultBankAccountId,
      salesAccountId: raw.salesAccountId,
      purchasesAccountId: raw.purchasesAccountId,
      inventoryAccountId: raw.inventoryAccountId,
      costOfSalesAccountId: raw.costOfSalesAccountId,
      expensesAccountId: raw.expensesAccountId,
      vatAccountId: raw.vatAccountId,
      separateInventory: raw.separateInventory,
      allowNegativeStock: raw.allowNegativeStock,
      useBranchPricing: raw.useBranchPricing,
      useBranchVAT: raw.useBranchVAT,
      isActive: raw.isActive,
    };

    if (this.isEditMode()) {
      const id = this.branchRecordId();
      if (!id) {
        return;
      }

      this.branchesService.update(id, payload).subscribe({
        next: () => this.navigateBack('branches.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    if (raw.branchId == null) {
      this.saving.set(false);
      return;
    }

    const request: CreateBranchRequest = {
      branchId: raw.branchId,
      ...payload,
    };

    this.branchesService.create(request).subscribe({
      next: () => this.navigateBack('branches.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: 'branches.createSuccess' | 'branches.updateSuccess'): void {
    this.saving.set(false);
    this.router.navigate(['/demo1/settings/branches'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('branches.saveError')),
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
