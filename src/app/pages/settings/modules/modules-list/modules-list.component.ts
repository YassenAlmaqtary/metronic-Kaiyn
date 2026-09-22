import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AppModule } from '../../../../core/api/models/module.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { AI_ASSISTANT_MODULE_KEY } from '../../../../core/services/access-control.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ModulesService } from '../../../../core/services/modules.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-modules-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './modules-list.component.html',
  styleUrl: './modules-list.component.scss',
})
export class ModulesListComponent implements OnInit {
  private modulesService = inject(ModulesService);
  private language = inject(LanguageService);

  modules = signal<AppModule[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<AppModule | null>(null);
  deleting = signal(false);

  readonly aiAssistantModuleKey = AI_ASSISTANT_MODULE_KEY;

  filteredModules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.modules();
    if (!term) {
      return list;
    }
    return list.filter((module) =>
      [module.moduleKey, module.moduleName, module.moduleId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  hasAiAssistantModule = computed(() =>
    this.modules().some(
      (module) => (module.moduleKey ?? '').toLowerCase() === this.aiAssistantModuleKey.toLowerCase(),
    ),
  );

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadModules();
  }

  loadModules(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.modulesService.getAll().subscribe({
      next: (modules) => {
        this.modules.set(
          [...modules].sort((a, b) =>
            (a.moduleKey ?? '').localeCompare(b.moduleKey ?? '', undefined, { sensitivity: 'base' }),
          ),
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('modules.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  askDelete(module: AppModule): void {
    this.deleteTarget.set(module);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.deleting.set(true);
    this.modulesService.delete(target.moduleId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('modules.deleteSuccess'));
        this.loadModules();
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('modules.deleteError')),
        );
      },
    });
  }

  exportCsv(): void {
    const rows = this.filteredModules().map((module) => [
      module.moduleId,
      module.moduleKey ?? '',
      module.moduleName ?? '',
      module.parentModuleId ?? '',
      module.sortOrder ?? '',
    ]);
    downloadCsv(
      csvExportFilename('modules'),
      [
        this.language.translate('modules.id'),
        this.language.translate('modules.moduleKey'),
        this.language.translate('modules.moduleName'),
        this.language.translate('modules.parentModuleId'),
        this.language.translate('modules.sortOrder'),
      ],
      rows,
    );
  }
}
