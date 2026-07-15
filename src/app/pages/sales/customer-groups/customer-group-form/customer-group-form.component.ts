import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateCustomerGroupRequest,
  UpdateCustomerGroupRequest,
} from '../../../../core/api/models/customer-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CustomerGroupsService } from '../../../../core/services/customer-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-customer-group-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './customer-group-form.component.html',
  styleUrl: './customer-group-form.component.scss',
})
export class CustomerGroupFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerGroupsService = inject(CustomerGroupsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  groupId = signal<number | null>(null);

  form = new FormGroup({
    groupNameAr: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    groupNameEn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
    accountId: new FormControl<number | null>(null),
    accountCode: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.groupId.set(id);
    this.loadCustomerGroup(id);
  }

  loadCustomerGroup(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.customerGroupsService.getById(id).subscribe({
      next: (group) => {
        this.form.patchValue({
          groupNameAr: group.groupNameAr ?? '',
          groupNameEn: group.groupNameEn ?? '',
          isActive: group.isActive ?? true,
          accountId: group.accountId ?? null,
          accountCode: group.accountCode ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customerGroups.notFound')),
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
    const basePayload = {
      groupNameAr: raw.groupNameAr.trim(),
      groupNameEn: raw.groupNameEn.trim() || null,
      isActive: raw.isActive,
      accountId: raw.accountId,
      accountCode: raw.accountCode,
    };

    if (this.isEditMode()) {
      const id = this.groupId();
      if (!id) {
        return;
      }

      const payload: UpdateCustomerGroupRequest = {
        groupId: id,
        ...basePayload,
      };

      this.customerGroupsService.update(id, payload).subscribe({
        next: () => this.navigateBack('customerGroups.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateCustomerGroupRequest = basePayload;
    this.customerGroupsService.create(payload).subscribe({
      next: () => this.navigateBack('customerGroups.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/sales/customer-groups'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('customerGroups.saveError')),
    );
  }
}
