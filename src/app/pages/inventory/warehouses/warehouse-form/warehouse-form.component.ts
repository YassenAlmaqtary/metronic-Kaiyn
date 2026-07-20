import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/api/auth.service';
import { Branch } from '../../../../core/api/models/branch.models';
import { CreateStoreRequest, UpdateStoreRequest } from '../../../../core/api/models/store.models';
import { User } from '../../../../core/api/models/user.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { StoresService } from '../../../../core/services/stores.service';
import { UsersService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-warehouse-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './warehouse-form.component.html',
  styleUrl: './warehouse-form.component.scss',
})
export class WarehouseFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storesService = inject(StoresService);
  private branchesService = inject(BranchesService);
  private usersService = inject(UsersService);
  private auth = inject(AuthService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  storeId = signal<number | null>(null);
  branches = signal<Branch[]>([]);
  users = signal<User[]>([]);

  form = new FormGroup({
    storeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    status: new FormControl(true, { nonNullable: true }),
    locationStore: new FormControl('', { nonNullable: true }),
    branchId: new FormControl<number | null>(null),
    userId: new FormControl<number | null>(null),
    orderNumber: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.loadLookups();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      const userId = this.auth.user()?.userId;
      if (userId) {
        this.form.controls.userId.setValue(userId);
      }
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.storeId.set(id);
    this.loadStore(id);
  }

  loadLookups(): void {
    this.branchesService.getAll().subscribe({
      next: (items) => this.branches.set(items),
    });

    this.usersService.getAll().subscribe({
      next: (items) => this.users.set(items),
    });
  }

  loadStore(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.storesService.getById(id).subscribe({
      next: (store) => {
        this.form.patchValue({
          storeName: store.storeName ?? '',
          status: store.status ?? true,
          locationStore: store.locationStore ?? '',
          branchId: store.branchId ?? null,
          userId: store.userId ?? null,
          orderNumber: store.orderNumber ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('warehouses.notFound')),
        );
      },
    });
  }

  userLabel(user: User): string {
    return user.fullName || user.userName || String(user.userId);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const common = {
      storeName: raw.storeName.trim(),
      status: raw.status,
      locationStore: raw.locationStore.trim() || null,
      branchId: raw.branchId,
      userId: raw.userId,
      orderNumber: raw.orderNumber,
    };

    if (this.isEditMode()) {
      const id = this.storeId();
      if (!id) {
        return;
      }

      const payload: UpdateStoreRequest = { storeId: id, ...common };
      this.storesService.update(id, payload).subscribe({
        next: () => this.navigateBack('warehouses.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateStoreRequest = common;
    this.storesService.create(payload).subscribe({
      next: () => this.navigateBack('warehouses.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/inventory/warehouses'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('warehouses.saveError')),
    );
  }
}
