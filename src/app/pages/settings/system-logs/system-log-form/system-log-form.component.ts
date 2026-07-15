import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CreateSystemLogRequest } from '../../../../core/api/models/system-log.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { SystemLogService } from '../../../../core/services/system-log.service';

@Component({
  selector: 'app-system-log-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './system-log-form.component.html',
  styleUrl: './system-log-form.component.scss',
})
export class SystemLogFormComponent {
  private router = inject(Router);
  private systemLogService = inject(SystemLogService);
  private language = inject(LanguageService);

  saving = signal(false);
  errorMessage = signal('');

  form = new FormGroup({
    userName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    actionType: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    tableName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    recordID: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    description: new FormControl('', { nonNullable: true }),
    actionDate: new FormControl('', { nonNullable: true }),
    machineName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    ipAddress: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const request: CreateSystemLogRequest = {
      userName: value.userName.trim() || null,
      actionType: value.actionType.trim() || null,
      tableName: value.tableName.trim() || null,
      recordID: value.recordID.trim() || null,
      description: value.description.trim() || null,
      actionDate: value.actionDate ? new Date(value.actionDate).toISOString() : null,
      machineName: value.machineName.trim() || null,
      ipAddress: value.ipAddress.trim() || null,
    };

    this.systemLogService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/demo1/settings/system-logs'], {
          state: { successMessage: this.language.translate('systemLogs.createSuccess') },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('systemLogs.saveError')),
        );
      },
    });
  }
}
