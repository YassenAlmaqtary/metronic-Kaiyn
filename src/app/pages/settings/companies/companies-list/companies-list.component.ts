import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Company } from '../../../../core/api/models/company.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CompaniesService } from '../../../../core/services/companies.service';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-companies-list',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './companies-list.component.html',
  styleUrl: './companies-list.component.scss',
})
export class CompaniesListComponent implements OnInit {
  private companiesService = inject(CompaniesService);
  private language = inject(LanguageService);

  companies = signal<Company[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<Company | null>(null);
  deleting = signal(false);

  filteredCompanies = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.companies();

    if (!term) {
      return list;
    }

    return list.filter((company) =>
      [
        company.companyArName,
        company.companyEnName,
        company.companyCode,
        company.commercialRegister,
        company.taxNumber,
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
    this.loadCompanies();
  }

  companyName(company: Company): string {
    if (this.language.locale() === 'ar') {
      return company.companyArName || company.companyEnName || '—';
    }
    return company.companyEnName || company.companyArName || '—';
  }

  loadCompanies(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.companiesService.getAll().subscribe({
      next: (companies) => {
        this.companies.set(companies);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('companies.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openDeleteDialog(company: Company): void {
    this.deleteTarget.set(company);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const company = this.deleteTarget();
    if (!company) {
      return;
    }

    this.deleting.set(true);
    this.companiesService.delete(company.companyId).subscribe({
      next: () => {
        this.companies.update((list) => list.filter((item) => item.companyId !== company.companyId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('companies.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('companies.deleteError')),
        );
      },
    });
  }
}
