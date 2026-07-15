import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateProductGroupRequest,
  UpdateProductGroupRequest,
} from '../../../../core/api/models/product-group.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { ProductGroupsService } from '../../../../core/services/product-groups.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-product-group-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './product-group-form.component.html',
  styleUrl: './product-group-form.component.scss',
})
export class ProductGroupFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productGroupsService = inject(ProductGroupsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  groupId = signal<number | null>(null);

  form = new FormGroup({
    groupName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(250)],
    }),
    status: new FormControl(true, { nonNullable: true }),
    arrayShow: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.groupId.set(id);
    this.loadProductGroup(id);
  }

  loadProductGroup(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.productGroupsService.getById(id).subscribe({
      next: (group) => {
        this.form.patchValue({
          groupName: group.groupName ?? '',
          status: group.status ?? true,
          arrayShow: group.arrayShow ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('productGroups.notFound')),
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
      groupName: raw.groupName.trim(),
      status: raw.status,
      arrayShow: raw.arrayShow,
    };

    if (this.isEditMode()) {
      const id = this.groupId();
      if (!id) {
        return;
      }

      const payload: UpdateProductGroupRequest = {
        groupId: id,
        ...basePayload,
      };

      this.productGroupsService.update(id, payload).subscribe({
        next: () => this.navigateBack('productGroups.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateProductGroupRequest = basePayload;
    this.productGroupsService.create(payload).subscribe({
      next: () => this.navigateBack('productGroups.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/products/groups'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('productGroups.saveError')),
    );
  }
}
