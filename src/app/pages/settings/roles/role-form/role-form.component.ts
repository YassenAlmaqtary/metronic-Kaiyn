import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateRoleRequest,
  UpdateRoleRequest,
} from '../../../../core/api/models/role.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { RolesService } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-role-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './role-form.component.html',
  styleUrl: './role-form.component.scss',
})
export class RoleFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  isSystemRole = signal(false);
  roleId = signal<number | null>(null);

  form = new FormGroup({
    roleName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const id = Number(idParam);
      this.isEditMode.set(true);
      this.roleId.set(id);
      this.loadRole(id);
    }
  }

  loadRole(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.rolesService.getById(id).subscribe({
      next: (role) => {
        this.isSystemRole.set(role.isSystem);
        this.form.patchValue({
          roleName: role.roleName ?? '',
          description: role.description ?? '',
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('roles.notFound')),
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
      roleName: raw.roleName.trim(),
      description: raw.description.trim() || null,
    };

    if (this.isEditMode()) {
      const id = this.roleId();
      if (!id) {
        return;
      }

      const request: UpdateRoleRequest = payload;
      this.rolesService.update(id, request).subscribe({
        next: () => this.navigateBack('roles.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const request: CreateRoleRequest = payload;
    this.rolesService.create(request).subscribe({
      next: () => this.navigateBack('roles.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: 'roles.createSuccess' | 'roles.updateSuccess'): void {
    this.saving.set(false);
    this.router.navigate(['/demo1/settings/roles'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('roles.saveError')),
    );
  }
}
