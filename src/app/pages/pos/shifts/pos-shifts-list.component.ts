import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../core/api/models/branch.models';
import { PosShift } from '../../../core/api/models/pos.models';
import { extractApiErrorMessage } from '../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../core/services/branches.service';
import { LanguageService } from '../../../core/services/language.service';
import { PosService } from '../../../core/services/pos.service';

@Component({
  selector: 'app-pos-shifts-list',
  imports: [FormsModule, TranslatePipe, DatePipe, DecimalPipe],
  templateUrl: './pos-shifts-list.component.html',
})
export class PosShiftsListComponent implements OnInit {
  private pos = inject(PosService);
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  shifts = signal<PosShift[]>([]);
  branches = signal<Branch[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  statusFilter = signal<'all' | 'Open' | 'Closed'>('all');
  branchFilter = signal<number | null>(null);
  closeTarget = signal<PosShift | null>(null);
  closingBalance = signal(0);

  branchName = computed(() => {
    const map = new Map<number, string>();
    for (const b of this.branches()) {
      map.set(b.branchId, b.branchName ?? String(b.branchId));
    }
    return map;
  });

  filtered = computed(() => {
    const status = this.statusFilter();
    const branchId = this.branchFilter();
    return this.shifts().filter((s) => {
      if (status !== 'all') {
        const st = String(s.status || '').toLowerCase();
        if (status === 'Open' && st === 'closed') {
          return false;
        }
        if (status === 'Closed' && st !== 'closed') {
          return false;
        }
      }
      if (branchId != null && s.branchId !== branchId) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.branchesService.getAll().subscribe({
      next: (b) => this.branches.set(b.filter((x) => x.isActive !== false)),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.pos
      .getShifts({
        branchId: this.branchFilter() ?? undefined,
        status: this.statusFilter() === 'all' ? undefined : this.statusFilter(),
      })
      .subscribe({
        next: (list) => {
          this.shifts.set(list);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(err, this.language.translate('posAdmin.shifts.loadError')),
          );
        },
      });
  }

  isOpen(shift: PosShift): boolean {
    return String(shift.status || '').toLowerCase() !== 'closed';
  }

  askClose(shift: PosShift): void {
    this.closeTarget.set(shift);
    this.closingBalance.set(Number(shift.openingBalance) || 0);
  }

  confirmClose(): void {
    const shift = this.closeTarget();
    if (!shift) {
      return;
    }
    this.saving.set(true);
    this.pos.closeShift(shift.shiftId, { closingBalance: this.closingBalance() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeTarget.set(null);
        this.successMessage.set(this.language.translate('posAdmin.shifts.closeSuccess'));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(err, this.language.translate('posAdmin.shifts.closeError')),
        );
      },
    });
  }
}
