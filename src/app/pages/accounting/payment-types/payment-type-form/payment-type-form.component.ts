import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Account, AccountStructureType } from '../../../../core/api/models/account.models';
import {
  CreatePaymentTypeRequest,
  UpdatePaymentTypeRequest,
} from '../../../../core/api/models/payment-type.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LanguageService } from '../../../../core/services/language.service';
import { PaymentTypesService } from '../../../../core/services/payment-types.service';

@Component({
  selector: 'app-payment-type-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './payment-type-form.component.html',
  styleUrl: './payment-type-form.component.scss',
})
export class PaymentTypeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PaymentTypesService);
  private accountsService = inject(AccountsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  paymentTypeId = signal<number | null>(null);
  accounts = signal<Account[]>([]);

  postingAccounts = computed(() => {
    const active = this.accounts().filter((account) => !account.accStopped);
    const leaves = active.filter((account) => account.accType === AccountStructureType.Sub);
    return leaves.length > 0 ? leaves : active;
  });

  form = new FormGroup({
    paymentTypeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    defaultAccountId: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.accountsService.getAll().subscribe({
      next: (items) => this.accounts.set(items),
      error: () => this.accounts.set([]),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }
    const id = Number(idParam);
    this.isEditMode.set(true);
    this.paymentTypeId.set(id);
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          paymentTypeName: item.paymentTypeName ?? '',
          defaultAccountId: item.defaultAccountId ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('paymentTypes.notFound')),
        );
      },
    });
  }

  accountLabel(account: Account): string {
    return `${account.accCode} — ${account.accName || account.accId}`;
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
      paymentTypeName: raw.paymentTypeName.trim(),
      defaultAccountId: raw.defaultAccountId != null ? Number(raw.defaultAccountId) : null,
    };

    const id = this.paymentTypeId();
    if (this.isEditMode() && id) {
      const payload: UpdatePaymentTypeRequest = basePayload;
      this.service.update(id, payload).subscribe({
        next: () => this.navigateBack('paymentTypes.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreatePaymentTypeRequest = basePayload;
    this.service.create(payload).subscribe({
      next: () => this.navigateBack('paymentTypes.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/payment-types'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('paymentTypes.saveError')),
    );
  }
}
