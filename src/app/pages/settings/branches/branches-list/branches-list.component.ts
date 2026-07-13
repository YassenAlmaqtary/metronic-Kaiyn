import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../../core/api/models/branch.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-branches-list',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './branches-list.component.html',
  styleUrl: './branches-list.component.scss',
})
export class BranchesListComponent implements OnInit {
  private branchesService = inject(BranchesService);
  private language = inject(LanguageService);

  branches = signal<Branch[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<Branch | null>(null);
  deleting = signal(false);

  filteredBranches = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.branches();

    if (!term) {
      return list;
    }

    return list.filter((branch) =>
      [
        branch.branchName,
        branch.branchCode,
        branch.location,
        branch.phone,
        branch.branchId,
        branch.companyId,
      ]
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
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.branchesService.getAll().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('branches.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openDeleteDialog(branch: Branch): void {
    this.deleteTarget.set(branch);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const branch = this.deleteTarget();
    if (!branch) {
      return;
    }

    this.deleting.set(true);
    this.branchesService.delete(branch.id).subscribe({
      next: () => {
        this.branches.update((list) => list.filter((item) => item.id !== branch.id));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('branches.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('branches.deleteError')),
        );
      },
    });
  }
}
