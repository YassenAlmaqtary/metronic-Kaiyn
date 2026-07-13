import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { User } from '../../../../core/api/models/user.models';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageService } from '../../../../core/services/language.service';
import { UsersService } from '../../../../core/services/users.service';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, FormsModule, DatePipe, TranslatePipe],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private usersService = inject(UsersService);
  private language = inject(LanguageService);

  users = signal<User[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  deleteTarget = signal<User | null>(null);
  deleting = signal(false);

  filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.users();

    if (!term) {
      return list;
    }

    return list.filter((user) =>
      [user.userName, user.fullName, user.email, user.phone]
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
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('users.loadError')),
        );
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  openDeleteDialog(user: User): void {
    this.deleteTarget.set(user);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const user = this.deleteTarget();
    if (!user) {
      return;
    }

    this.deleting.set(true);
    this.usersService.delete(user.userId).subscribe({
      next: () => {
        this.users.update((list) => list.filter((item) => item.userId !== user.userId));
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.language.translate('users.deleteSuccess'));
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.language.translate('users.deleteError')),
        );
      },
    });
  }
}
