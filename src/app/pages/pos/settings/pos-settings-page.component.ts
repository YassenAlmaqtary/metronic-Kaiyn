import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../core/api/models/branch.models';
import { PosDevice } from '../../../core/api/models/pos.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';

interface SettingRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-pos-settings-page',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './pos-settings-page.component.html',
})
export class PosSettingsPageComponent implements OnInit {
  private pos = inject(PosService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  branches = signal<Branch[]>([]);
  devices = signal<PosDevice[]>([]);
  branchId = signal<number | null>(null);
  deviceId = signal<number | null>(null);
  rows = signal<SettingRow[]>([]);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (b) => {
        const active = b.filter((x) => x.isActive !== false);
        this.branches.set(active);
        this.branchId.set(active[0]?.branchId ?? null);
      },
    });
    this.pos.getDevices().subscribe({ next: (d) => this.devices.set(d) });
  }

  load(): void {
    const branchId = this.branchId();
    if (branchId == null) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.pos.getSettings(branchId, this.deviceId() ?? undefined).subscribe({
      next: (map) => {
        const entries = Object.entries(map || {}).map(([key, value]) => ({ key, value: String(value ?? '') }));
        this.rows.set(entries.length ? entries : [{ key: '', value: '' }]);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.settings.loadError')),
        );
      },
    });
  }

  addRow(): void {
    this.rows.update((list) => [...list, { key: '', value: '' }]);
  }

  updateRow(index: number, patch: Partial<SettingRow>): void {
    this.rows.update((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  removeRow(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
  }

  save(): void {
    const branchId = this.branchId();
    if (branchId == null) {
      return;
    }
    const settings: Record<string, string> = {};
    for (const row of this.rows()) {
      const key = row.key.trim();
      if (key) {
        settings[key] = row.value;
      }
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.pos
      .saveSettings({
        branchId,
        deviceId: this.deviceId(),
        settings,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.language.translate('posAdmin.settings.saveSuccess'));
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('posAdmin.settings.saveError')),
          );
        },
      });
  }
}
