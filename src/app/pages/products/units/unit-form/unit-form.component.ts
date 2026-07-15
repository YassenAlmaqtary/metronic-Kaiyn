import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CreateUnitRequest, UpdateUnitRequest } from '../../../../core/api/models/unit.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { UnitsService } from '../../../../core/services/units.service';

@Component({
  selector: 'app-unit-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './unit-form.component.html',
  styleUrl: './unit-form.component.scss',
})
export class UnitFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private unitsService = inject(UnitsService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  unitId = signal<number | null>(null);

  form = new FormGroup({
    unitName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    statusUnit: new FormControl(true, { nonNullable: true }),
    arrayShow: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.unitId.set(id);
    this.loadUnit(id);
  }

  loadUnit(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.unitsService.getById(id).subscribe({
      next: (unit) => {
        this.form.patchValue({
          unitName: unit.unitName ?? '',
          statusUnit: unit.statusUnit ?? true,
          arrayShow: unit.arrayShow ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('units.notFound')),
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
      unitName: raw.unitName.trim(),
      statusUnit: raw.statusUnit,
      arrayShow: raw.arrayShow,
    };

    if (this.isEditMode()) {
      const id = this.unitId();
      if (!id) {
        return;
      }

      const payload: UpdateUnitRequest = {
        unitId: id,
        ...basePayload,
      };

      this.unitsService.update(id, payload).subscribe({
        next: () => this.navigateBack('units.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    const payload: CreateUnitRequest = basePayload;
    this.unitsService.create(payload).subscribe({
      next: () => this.navigateBack('units.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/products/units'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('units.saveError')),
    );
  }
}
