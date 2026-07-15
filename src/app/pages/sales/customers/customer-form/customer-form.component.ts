import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CustomerGroup } from '../../../../core/api/models/customer-group.models';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../../../../core/api/models/customer.models';
import { Salesman } from '../../../../core/api/models/salesman.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CustomerGroupsService } from '../../../../core/services/customer-groups.service';
import { CustomersService } from '../../../../core/services/customers.service';
import { LanguageService } from '../../../../core/services/language.service';
import { SalesmenService } from '../../../../core/services/salesmen.service';

@Component({
  selector: 'app-customer-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
})
export class CustomerFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customersService = inject(CustomersService);
  private customerGroupsService = inject(CustomerGroupsService);
  private salesmenService = inject(SalesmenService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  customerId = signal<number | null>(null);
  customerGroups = signal<CustomerGroup[]>([]);
  salesmen = signal<Salesman[]>([]);

  form = new FormGroup({
    customerName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)],
    }),
    customerNameEn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    taxNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    crNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    creditLimit: new FormControl<number | null>(null),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(250)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    groupId: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    salesmanId: new FormControl<number | null>(null),
    accountId: new FormControl<number | null>(null),
    accountCode: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.loadCustomerGroups();
    this.loadSalesmen();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.customerId.set(id);
    this.loadCustomer(id);
  }

  groupLabel(group: CustomerGroup): string {
    if (this.language.locale() === 'ar') {
      return group.groupNameAr || group.groupNameEn || String(group.groupId);
    }
    return group.groupNameEn || group.groupNameAr || String(group.groupId);
  }

  salesmanLabel(salesman: Salesman): string {
    if (this.language.locale() === 'ar') {
      return salesman.salesmanNameAr || salesman.salesmanNameEn || String(salesman.salesmanId);
    }
    return salesman.salesmanNameEn || salesman.salesmanNameAr || String(salesman.salesmanId);
  }

  loadCustomerGroups(): void {
    this.customerGroupsService.getAll().subscribe({
      next: (groups) => this.customerGroups.set(groups),
      error: () => this.customerGroups.set([]),
    });
  }

  loadSalesmen(): void {
    this.salesmenService.getAll().subscribe({
      next: (salesmen) => this.salesmen.set(salesmen),
      error: () => this.salesmen.set([]),
    });
  }

  loadCustomer(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.customersService.getById(id).subscribe({
      next: (customer) => {
        this.form.patchValue({
          customerName: customer.customerName ?? '',
          customerNameEn: customer.customerNameEn ?? '',
          address: customer.address ?? '',
          phone: customer.phone ?? '',
          taxNumber: customer.taxNumber ?? '',
          crNumber: customer.crNumber ?? '',
          creditLimit: customer.creditLimit ?? null,
          notes: customer.notes ?? '',
          isActive: customer.isActive ?? true,
          groupId: customer.groupId ?? null,
          salesmanId: customer.salesmanId ?? null,
          accountId: customer.accountId ?? null,
          accountCode: customer.accountCode ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customers.notFound')),
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
    const groupId = raw.groupId;
    if (groupId === null) {
      this.saving.set(false);
      return;
    }

    const basePayload = {
      customerName: raw.customerName.trim(),
      customerNameEn: raw.customerNameEn.trim() || null,
      address: raw.address.trim() || null,
      phone: raw.phone.trim() || null,
      taxNumber: raw.taxNumber.trim() || null,
      crNumber: raw.crNumber.trim() || null,
      creditLimit: raw.creditLimit,
      notes: raw.notes.trim() || null,
      isActive: raw.isActive,
      groupId,
      salesmanId: raw.salesmanId,
      accountId: raw.accountId,
      accountCode: raw.accountCode,
    };

    if (this.isEditMode()) {
      const id = this.customerId();
      if (!id) {
        return;
      }

      const payload: UpdateCustomerRequest = {
        customerId: id,
        ...basePayload,
      };

      this.customersService.update(id, payload).subscribe({
        next: () => this.navigateBack('customers.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateCustomerRequest = basePayload;
    this.customersService.create(payload).subscribe({
      next: () => this.navigateBack('customers.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/sales/customers'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('customers.saveError')),
    );
  }
}
