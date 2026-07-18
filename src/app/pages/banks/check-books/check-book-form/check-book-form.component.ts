import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { BankAccount } from '../../../../core/api/models/bank-account.models';
import {
  CheckBookStatus,
  CreateCheckBookRequest,
  UpdateCheckBookRequest,
} from '../../../../core/api/models/check-book.models';
import { AuthService } from '../../../../core/api/auth.service';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BankAccountsService } from '../../../../core/services/bank-accounts.service';
import { CheckBooksService } from '../../../../core/services/check-books.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-check-book-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './check-book-form.component.html',
  styleUrl: './check-book-form.component.scss',
})
export class CheckBookFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkBooksService = inject(CheckBooksService);
  private bankAccountsService = inject(BankAccountsService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  readonly CheckBookStatus = CheckBookStatus;

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  checkBookId = signal<number | null>(null);
  bankAccounts = signal<BankAccount[]>([]);

  form = new FormGroup({
    bankAccountID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    checkBookNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    checkBookName: new FormControl('', { nonNullable: true }),
    startCheckNumber: new FormControl<number | null>(null, { validators: [Validators.required] }),
    endCheckNumber: new FormControl<number | null>(null, { validators: [Validators.required] }),
    issueDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<number>(CheckBookStatus.Active, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    alertBeforeEnd: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.bankAccountsService.getAll().subscribe({
      next: (items) => this.bankAccounts.set(items),
      error: () => this.bankAccounts.set([]),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.form.controls.issueDate.setValue(new Date().toISOString().slice(0, 10));
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.checkBookId.set(id);
    this.loadCheckBook(id);
  }

  loadCheckBook(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.checkBooksService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          bankAccountID: item.bankAccountID,
          checkBookNumber: item.checkBookNumber ?? '',
          checkBookName: item.checkBookName ?? '',
          startCheckNumber: item.startCheckNumber ?? null,
          endCheckNumber: item.endCheckNumber ?? null,
          issueDate: item.issueDate ? item.issueDate.slice(0, 10) : '',
          status: item.status ?? CheckBookStatus.Active,
          alertBeforeEnd: item.alertBeforeEnd ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('checkBooks.notFound')),
        );
      },
    });
  }

  bankAccountLabel(account: BankAccount): string {
    return `${account.accountName || account.accountNumber || account.bankAccountID} — ${account.bankName || ''}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.user()?.userId;
    if (!this.isEditMode() && !userId) {
      this.errorMessage.set(this.language.translate('checkBooks.saveError'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const common = {
      bankAccountID: Number(raw.bankAccountID),
      checkBookNumber: raw.checkBookNumber.trim(),
      checkBookName: raw.checkBookName.trim() || null,
      startCheckNumber: Number(raw.startCheckNumber),
      endCheckNumber: Number(raw.endCheckNumber),
      issueDate: new Date(`${raw.issueDate}T00:00:00`).toISOString(),
      status: Number(raw.status),
      alertBeforeEnd: raw.alertBeforeEnd != null ? Number(raw.alertBeforeEnd) : null,
    };

    if (this.isEditMode()) {
      const id = this.checkBookId();
      if (!id) {
        return;
      }

      const payload: UpdateCheckBookRequest = { checkBookID: id, ...common };
      this.checkBooksService.update(id, payload).subscribe({
        next: () => this.navigateBack('checkBooks.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateCheckBookRequest = { ...common, createdBy: userId! };
    this.checkBooksService.create(payload).subscribe({
      next: () => this.navigateBack('checkBooks.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/banks/check-books'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('checkBooks.saveError')),
    );
  }
}
