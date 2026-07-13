import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { CreateUserRequest, UpdateUserRequest } from '../../../../core/api/models/user.models';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { UsersService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-user-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usersService = inject(UsersService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  userId = signal<number | null>(null);

  form = new FormGroup({
    userName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    userPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(100)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
    employeeId: new FormControl<number | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const id = Number(idParam);
      this.isEditMode.set(true);
      this.userId.set(id);
      this.form.controls.userPassword.clearValidators();
      this.form.controls.userPassword.updateValueAndValidity();
      this.loadUser(id);
      return;
    }

    this.form.controls.userPassword.setValidators([Validators.required, Validators.maxLength(150)]);
    this.form.controls.userPassword.updateValueAndValidity();
  }

  loadUser(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.usersService.getById(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          userName: user.userName ?? '',
          userPassword: '',
          fullName: user.fullName ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          employeeId: user.employeeId ?? null,
          isActive: user.isActive,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('users.notFound')),
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

    if (this.isEditMode()) {
      const id = this.userId();
      if (!id) {
        return;
      }

      const request: UpdateUserRequest = {
        userName: raw.userName,
        fullName: raw.fullName || null,
        email: raw.email || null,
        phone: raw.phone || null,
        employeeId: raw.employeeId,
        isActive: raw.isActive,
      };

      if (raw.userPassword) {
        request.userPassword = raw.userPassword;
      }

      this.usersService.update(id, request).subscribe({
        next: () => this.navigateBack('users.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const request: CreateUserRequest = {
      userName: raw.userName,
      userPassword: raw.userPassword,
      fullName: raw.fullName || null,
      email: raw.email || null,
      phone: raw.phone || null,
      employeeId: raw.employeeId,
      isActive: raw.isActive,
    };

    this.usersService.create(request).subscribe({
      next: () => this.navigateBack('users.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: 'users.createSuccess' | 'users.updateSuccess'): void {
    this.saving.set(false);
    this.router.navigate(['/demo1/settings/users'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('users.saveError')),
    );
  }
}
