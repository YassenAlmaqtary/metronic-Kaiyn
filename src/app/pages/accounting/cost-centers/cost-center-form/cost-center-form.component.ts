import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Branch } from '../../../../core/api/models/branch.models';
import {
  CostCenter,
  CreateCostCenterRequest,
  UpdateCostCenterRequest,
} from '../../../../core/api/models/cost-center.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { CostCentersService } from '../../../../core/services/cost-centers.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-cost-center-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './cost-center-form.component.html',
  styleUrl: './cost-center-form.component.scss',
})
export class CostCenterFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private costCentersService = inject(CostCentersService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  costCenterId = signal<number | null>(null);
  branches = signal<Branch[]>([]);
  allCostCenters = signal<CostCenter[]>([]);

  parentOptions = computed(() => {
    const currentId = this.costCenterId();
    return this.allCostCenters().filter((item) => item.costCenterId !== currentId);
  });

  form = new FormGroup({
    costCenterCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    costCenterName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    branchId: new FormControl<number | null>(null),
    parentId: new FormControl<number | null>(null),
    level: new FormControl(1, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (branches) => this.branches.set(branches),
    });
    this.costCentersService.getAll().subscribe({
      next: (items) => this.allCostCenters.set(items),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.costCenterId.set(id);
    this.loadCostCenter(id);
  }

  loadCostCenter(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.costCentersService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          costCenterCode: item.costCenterCode ?? '',
          costCenterName: item.costCenterName ?? '',
          branchId: item.branchId ?? null,
          parentId: item.parentId ?? null,
          level: item.level || 1,
          notes: item.notes ?? '',
          isActive: item.isActive ?? true,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('costCenters.notFound')),
        );
      },
    });
  }

  onParentChange(): void {
    const parentId = this.form.controls.parentId.value;
    if (parentId == null) {
      this.form.controls.level.setValue(1);
      return;
    }
    const parent = this.allCostCenters().find((item) => item.costCenterId === parentId);
    const nextLevel = Math.min(3, (parent?.level ?? 1) + 1);
    this.form.controls.level.setValue(nextLevel);
  }

  costCenterLabel(item: CostCenter): string {
    return `${item.costCenterCode || item.costCenterId} — ${item.costCenterName || ''}`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const parent = this.allCostCenters().find((item) => item.costCenterId === raw.parentId);
    const fullPath = parent
      ? `${parent.fullPath || parent.costCenterCode}/${raw.costCenterCode.trim()}`
      : raw.costCenterCode.trim();

    const payload: CreateCostCenterRequest | UpdateCostCenterRequest = {
      costCenterCode: raw.costCenterCode.trim(),
      costCenterName: raw.costCenterName.trim(),
      branchId: raw.branchId,
      parentId: raw.parentId,
      level: Number(raw.level) || 1,
      notes: raw.notes.trim() || null,
      isActive: raw.isActive,
      fullPath,
    };

    if (this.isEditMode()) {
      const id = this.costCenterId();
      if (!id) {
        return;
      }
      this.costCentersService.update(id, payload).subscribe({
        next: () => this.navigateBack('costCenters.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.costCentersService.create(payload).subscribe({
      next: () => this.navigateBack('costCenters.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/cost-centers'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('costCenters.saveError')),
    );
  }
}
