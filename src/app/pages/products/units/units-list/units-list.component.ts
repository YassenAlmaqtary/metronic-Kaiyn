import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Unit } from '../../../../core/api/models/unit.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { UnitsService } from '../../../../core/services/units.service';

type UnitFilter = 'all' | 'active';

@Component({
  selector: 'app-units-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './units-list.component.html',
  styleUrl: './units-list.component.scss',
})
export class UnitsListComponent implements OnInit {
  private unitsService = inject(UnitsService);
  private language = inject(LanguageService);

  units = signal<Unit[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<UnitFilter>('all');
  deleteTarget = signal<Unit | null>(null);
  deleting = signal(false);

  filteredUnits = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.units();

    if (filter === 'active') {
      list = list.filter((unit) => unit.statusUnit !== false);
    }

    if (!term) {
      return list;
    }

    return list.filter((unit) =>
      [unit.unitName, unit.unitId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    const navState = history.state as { successMessage?: string };
    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      history.replaceState({}, '');
    }
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.unitsService.getAll().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('units.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: UnitFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(unit: Unit): void {
    this.deleteTarget.set(unit);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const unit = this.deleteTarget();
    if (!unit) {
      return;
    }

    this.deleting.set(true);
    this.unitsService.delete(unit.unitId).subscribe({
      next: () => {
        this.units.update((list) => list.filter((item) => item.unitId !== unit.unitId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('units.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('units.deleteError')),
        );
      },
    });
  }
}
