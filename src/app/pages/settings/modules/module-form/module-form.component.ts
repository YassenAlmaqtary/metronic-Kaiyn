import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import {
  AI_ASSISTANT_MODULE_KEY,
} from '../../../../core/services/access-control.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModulesService } from '../../../../core/services/modules.service';

@Component({
  selector: 'app-module-form',
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe],
  templateUrl: './module-form.component.html',
  styleUrl: './module-form.component.scss',
})
export class ModuleFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modulesService = inject(ModulesService);
  private language = inject(LanguageService);

  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  isEditMode = signal(false);
  moduleId = signal<number | null>(null);

  form = new FormGroup({
    moduleKey: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    moduleName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    parentModuleId: new FormControl<number | null>(null),
    sortOrder: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      const preset = this.route.snapshot.queryParamMap.get('preset');
      if (preset === 'aiAssistant') {
        this.form.patchValue({
          moduleKey: AI_ASSISTANT_MODULE_KEY,
          moduleName: this.language.translate('modules.aiAssistantModuleName'),
        });
      }
      return;
    }

    const id = Number(idParam);
    this.isEditMode.set(true);
    this.moduleId.set(id);
    this.loadModule(id);
  }

  loadModule(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.modulesService.getById(id).subscribe({
      next: (item) => {
        this.form.patchValue({
          moduleKey: item.moduleKey ?? '',
          moduleName: item.moduleName ?? '',
          parentModuleId: item.parentModuleId ?? null,
          sortOrder: item.sortOrder ?? null,
        });
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('modules.notFound')),
        );
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      moduleKey: raw.moduleKey.trim(),
      moduleName: raw.moduleName.trim(),
      parentModuleId: raw.parentModuleId,
      sortOrder: raw.sortOrder,
    };

    this.saving.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      const id = this.moduleId();
      if (!id) {
        return;
      }
      this.modulesService.update(id, payload).subscribe({
        next: () => this.navigateBack('modules.updateSuccess'),
        error: (error) => this.handleSaveError(error),
      });
      return;
    }

    this.modulesService.create(payload).subscribe({
      next: () => this.navigateBack('modules.createSuccess'),
      error: (error) => this.handleSaveError(error),
    });
  }

  private navigateBack(messageKey: 'modules.createSuccess' | 'modules.updateSuccess'): void {
    this.saving.set(false);
    void this.router.navigate(['/demo1/settings/modules'], {
      state: { successMessage: this.language.translate(messageKey) },
    });
  }

  private handleSaveError(error: unknown): void {
    this.saving.set(false);
    this.errorMessage.set(
      extractApiErrorMessage(error, this.language.translate('modules.saveError')),
    );
  }
}
