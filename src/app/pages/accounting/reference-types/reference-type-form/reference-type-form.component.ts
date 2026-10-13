import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { ReferenceTypesService } from '../../../../core/services/reference-types.service';

@Component({
  selector: 'app-reference-type-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './reference-type-form.component.html',
  styleUrl: './reference-type-form.component.scss',
})
export class ReferenceTypeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(ReferenceTypesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  referenceId = signal<number | null>(null);

  form = new FormGroup({
    referenceName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }
    const id = Number(idParam);
    this.isEditMode.set(true);
    this.referenceId.set(id);
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({ referenceName: item.referenceName ?? '' });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('referenceTypes.notFound')),
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
    const payload = { referenceName: this.form.getRawValue().referenceName.trim() };

    const id = this.referenceId();
    if (this.isEditMode() && id) {
      this.service.update(id, payload).subscribe({
        next: () => this.navigateBack('referenceTypes.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.service.create(payload).subscribe({
      next: () => this.navigateBack('referenceTypes.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: TranslationKey): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/accounting/reference-types'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('referenceTypes.saveError')),
    );
  }
}
