import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../core/api/models/branch.models';
import { PosDevice } from '../../../core/api/models/pos.models';
import { Store } from '../../../core/api/models/store.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';
import { StoresService } from '../../../core/services/stores.service';
import { csvExportFilename } from '../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../core/utils/download-csv';

@Component({
  selector: 'app-pos-devices-list',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './pos-devices-list.component.html',
})
export class PosDevicesListComponent implements OnInit {
  private pos = inject(PosService);
  private branchesService = inject(BranchesService);
  private storesService = inject(StoresService);
  private language = inject(LanguageService);

  devices = signal<PosDevice[]>([]);
  branches = signal<Branch[]>([]);
  stores = signal<Store[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  showForm = signal(false);

  formName = signal('');
  formBranchId = signal<number | null>(null);
  formStoreId = signal<number | null>(null);

  branchName = computed(() => {
    const map = new Map<number, string>();
    for (const b of this.branches()) {
      map.set(b.branchId, b.branchName ?? String(b.branchId));
    }
    return map;
  });

  storeName = computed(() => {
    const map = new Map<number, string>();
    for (const s of this.stores()) {
      map.set(s.storeId, s.storeName ?? String(s.storeId));
    }
    return map;
  });

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const branches = this.branchName();
    const stores = this.storeName();
    let list = this.devices();
    if (!term) {
      return list;
    }
    return list.filter((d) =>
      [d.deviceName, d.deviceId, branches.get(d.branchId), stores.get(d.storeId)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.branchesService.getAll().subscribe({
      next: (b) => this.branches.set(b.filter((x) => x.isActive !== false)),
    });
    this.storesService.getAll().subscribe({
      next: (s) => this.stores.set(s),
    });
    this.pos.getDevices().subscribe({
      next: (list) => {
        this.devices.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.devices.loadError')),
        );
      },
    });
  }

  openForm(): void {
    this.formName.set('');
    this.formBranchId.set(this.branches()[0]?.branchId ?? null);
    this.formStoreId.set(this.stores()[0]?.storeId ?? null);
    this.showForm.set(true);
    this.successMessage.set('');
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('pos-devices'),
      [
        '#',
        this.language.translate('posAdmin.devices.name'),
        this.language.translate('posAdmin.common.branch'),
        this.language.translate('posAdmin.common.store'),
        this.language.translate('posAdmin.common.status'),
      ],
      this.filtered().map((device) => [
        device.deviceId,
        device.deviceName ?? '',
        this.branchName().get(device.branchId) ?? device.branchId,
        this.storeName().get(device.storeId) ?? device.storeId,
        device.isActive !== false
          ? this.language.translate('posAdmin.common.active')
          : this.language.translate('posAdmin.common.inactive'),
      ]),
    );
  }

  create(): void {
    const name = this.formName().trim();
    const branchId = this.formBranchId();
    const storeId = this.formStoreId();
    if (!name) {
      this.errorMessage.set(this.language.translate('posAdmin.devices.nameRequired'));
      return;
    }
    if (branchId == null || storeId == null) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.pos.createDevice({ deviceName: name, branchId, storeId }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.successMessage.set(this.language.translate('posAdmin.devices.saveSuccess'));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.devices.saveError')),
        );
      },
    });
  }

  toggle(device: PosDevice): void {
    this.saving.set(true);
    this.pos
      .updateDevice(device.deviceId, { isActive: device.isActive === false })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.language.translate('posAdmin.devices.saveSuccess'));
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('posAdmin.devices.saveError')),
          );
        },
      });
  }
}
