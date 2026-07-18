import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateAccountGroupRequest,
  UpdateAccountGroupRequest,
} from '../../../../core/api/models/account-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AccountGroupsService } from '../../../../core/services/account-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-account-group-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './account-group-form.component.html',
  styleUrl: './account-group-form.component.scss',
})
export class AccountGroupFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountGroupsService = inject(AccountGroupsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  groupId = signal<number | null>(null);

  form = new FormGroup({
    groupName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    description: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.groupId.set(id);
    this.loadAccountGroup(id);
  }

  loadAccountGroup(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.accountGroupsService.getById(id).subscribe({
      next: (group) => {
        this.form.patchValue({
          groupName: group.groupName ?? '',
          description: group.description ?? '',
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('accountGroups.notFound')),
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
    const payload: CreateAccountGroupRequest | UpdateAccountGroupRequest = {
      groupName: raw.groupName.trim(),
      description: raw.description.trim() || null,
    };

    if (this.isEditMode()) {
      const id = this.groupId();
      if (!id) {
        return;
      }

      this.accountGroupsService.update(id, payload).subscribe({
        next: () => this.navigateBack('accountGroups.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.accountGroupsService.create(payload).subscribe({
      next: () => this.navigateBack('accountGroups.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/account-groups'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('accountGroups.saveError')),
    );
  }
}
