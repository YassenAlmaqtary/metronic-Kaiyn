import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Customer } from '../../../../core/api/models/customer.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CustomersService } from '../../../../core/services/customers.service';
import { LanguageService } from '../../../../core/services/language.service';

type CustomerFilter = 'all' | 'active';

@Component({
  selector: 'app-customers-list',
  imports: [RouterLink, FormsModule, TranslatePipe],
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
})
export class CustomersListComponent implements OnInit {
  private customersService = inject(CustomersService);
  private language = inject(LanguageService);

  customers = signal<Customer[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  filter = signal<CustomerFilter>('all');
  deleteTarget = signal<Customer | null>(null);
  deleting = signal(false);

  filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.filter();
    let list = this.customers();

    if (filter === 'active') {
      list = list.filter((customer) => customer.isActive);
    }

    if (!term) {
      return list;
    }

    return list.filter((customer) =>
      [
        customer.customerName,
        customer.customerNameEn,
        customer.phone,
        customer.taxNumber,
        customer.groupName,
        customer.salesmanName,
        customer.customerId,
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
    this.loadCustomers();
  }

  customerLabel(customer: Customer): string {
    if (this.language.locale() === 'ar') {
      return customer.customerName || customer.customerNameEn || String(customer.customerId);
    }
    return customer.customerNameEn || customer.customerName || String(customer.customerId);
  }

  loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.customersService.getAll().subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customers.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(filter: CustomerFilter): void {
    this.filter.set(filter);
  }

  openDeleteDialog(customer: Customer): void {
    this.deleteTarget.set(customer);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const customer = this.deleteTarget();
    if (!customer) {
      return;
    }

    this.deleting.set(true);
    this.customersService.delete(customer.customerId).subscribe({
      next: () => {
        this.customers.update((list) =>
          list.filter((item) => item.customerId !== customer.customerId),
        );
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('customers.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('customers.deleteError')),
        );
      },
    });
  }
}
