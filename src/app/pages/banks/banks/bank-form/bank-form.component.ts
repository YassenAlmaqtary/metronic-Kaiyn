import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/api/auth.service';
import { CreateBankRequest, UpdateBankRequest } from '../../../../core/api/models/bank.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BanksService } from '../../../../core/services/banks.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-bank-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './bank-form.component.html',
  styleUrl: './bank-form.component.scss',
})
export class BankFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private banksService = inject(BanksService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  bankId = signal<number | null>(null);

  form = new FormGroup({
    bankName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    bankCode: new FormControl('', { nonNullable: true }),
    swiftCode: new FormControl('', { nonNullable: true }),
    contactPerson: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    website: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.bankId.set(id);
    this.loadBank(id);
  }

  loadBank(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.banksService.getById(id).subscribe({
      next: (bank) => {
        this.form.patchValue({
          bankName: bank.bankName ?? '',
          bankCode: bank.bankCode ?? '',
          swiftCode: bank.swiftCode ?? '',
          contactPerson: bank.contactPerson ?? '',
          phone: bank.phone ?? '',
          email: bank.email ?? '',
          website: bank.website ?? '',
          isActive: bank.isActive ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('banks.notFound')),
        );
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.user()?.userId;
    if (!this.isEditMode() && !userId) {
      this.errorMessage.set(this.language.translate('banks.saveError'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const common = {
      bankName: raw.bankName.trim(),
      bankCode: raw.bankCode.trim() || null,
      swiftCode: raw.swiftCode.trim() || null,
      contactPerson: raw.contactPerson.trim() || null,
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      website: raw.website.trim() || null,
      isActive: raw.isActive,
    };

    if (this.isEditMode()) {
      const id = this.bankId();
      if (!id) {
        return;
      }

      const payload: UpdateBankRequest = { bankID: id, ...common };
      this.banksService.update(id, payload).subscribe({
        next: () => this.navigateBack('banks.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateBankRequest = { ...common, createdBy: userId! };
    this.banksService.create(payload).subscribe({
      next: () => this.navigateBack('banks.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/banks/banks'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('banks.saveError')),
    );
  }
}
