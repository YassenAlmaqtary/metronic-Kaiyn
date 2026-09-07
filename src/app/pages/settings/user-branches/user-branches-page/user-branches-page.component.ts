import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Branch } from '../../../../core/api/models/branch.models';
import { Role } from '../../../../core/api/models/role.models';
import { User } from '../../../../core/api/models/user.models';
import { UserBranchDto } from '../../../../core/api/models/user-branch.models';
import { extractApiErrorMessage } from '../../../../core/api/utils/api-response.util';
import { TranslationKey } from '../../../../core/i18n';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { BranchesService } from '../../../../core/services/branches.service';
import { LanguageService } from '../../../../core/services/language.service';
import { RolesService } from '../../../../core/services/roles.service';
import { UserBranchesService } from '../../../../core/services/user-branches.service';
import { UsersService } from '../../../../core/services/users.service';
import { csvExportFilename } from '../../../../core/utils/csv-export-filename';
import { downloadCsv } from '../../../../core/utils/download-csv';

@Component({
  selector: 'app-user-branches-page',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './user-branches-page.component.html',
})
export class UserBranchesPageComponent implements OnInit {
  private userBranchesService = inject(UserBranchesService);
  private usersService = inject(UsersService);
  private branchesService = inject(BranchesService);
  private rolesService = inject(RolesService);
  private language = inject(LanguageService);

  users = signal<User[]>([]);
  branches = signal<Branch[]>([]);
  roles = signal<Role[]>([]);
  assignments = signal<UserBranchDto[]>([]);

  selectedUserId = signal<number | null>(null);
  newBranchId = signal<number | null>(null);
  newRoleId = signal<number | null>(null);
  newIsDefault = signal(false);

  loadingUsers = signal(true);
  loadingAssignments = signal(false);
  saving = signal(false);
  settingDefaultId = signal<number | null>(null);
  deleting = signal(false);
  deleteTarget = signal<UserBranchDto | null>(null);

  errorMessage = signal('');
  successMessage = signal('');

  availableBranches = computed(() => {
    const assignedIds = new Set(this.assignments().map((item) => item.branchId));
    return this.branches().filter((branch) => !assignedIds.has(branch.branchId));
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadBranches();
    this.loadRoles();
  }

  private t(key: string): string {
    return this.language.translate(key as TranslationKey);
  }

  userLabel(user: User): string {
    return user.fullName || user.userName || String(user.userId);
  }

  branchLabel(branch: Branch): string {
    return branch.branchName || String(branch.branchId);
  }

  roleLabel(role: Role): string {
    return role.roleName || String(role.roleId);
  }

  assignmentLabel(item: UserBranchDto): string {
    return item.branchName || String(item.branchId);
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.errorMessage.set('');

    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: (error) => {
        this.loadingUsers.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('userBranches.usersLoadError')),
        );
      },
    });
  }

  loadBranches(): void {
    this.branchesService.getAll().subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
  }

  loadRoles(): void {
    this.rolesService.getAll().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([]),
    });
  }

  onUserChange(userId: number | null): void {
    this.selectedUserId.set(userId);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.resetAddForm();

    if (userId) {
      this.loadAssignments(userId);
    } else {
      this.assignments.set([]);
    }
  }

  loadAssignments(userId: number = this.selectedUserId()!): void {
    if (!userId) {
      return;
    }

    this.loadingAssignments.set(true);
    this.errorMessage.set('');

    this.userBranchesService.getByUserId(userId).subscribe({
      next: (items) => {
        this.assignments.set(items);
        this.loadingAssignments.set(false);
      },
      error: (error) => {
        this.loadingAssignments.set(false);
        this.assignments.set([]);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('userBranches.loadError')),
        );
      },
    });
  }

  addAssignment(): void {
    const userId = this.selectedUserId();
    const branchId = this.newBranchId();
    const roleId = this.newRoleId();

    if (!userId) {
      this.errorMessage.set(this.t('userBranches.required.userId'));
      return;
    }
    if (!branchId) {
      this.errorMessage.set(this.t('userBranches.required.branchId'));
      return;
    }
    if (!roleId) {
      this.errorMessage.set(this.t('userBranches.required.roleId'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.userBranchesService
      .create({
        userId,
        branchId,
        roleId,
        isDefault: this.newIsDefault() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(this.t('userBranches.createSuccess'));
          this.resetAddForm();
          this.loadAssignments(userId);
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            extractApiErrorMessage(error, this.t('userBranches.createError')),
          );
        },
      });
  }

  setDefault(item: UserBranchDto): void {
    const userId = this.selectedUserId();
    if (!userId || item.isDefault) {
      return;
    }

    this.settingDefaultId.set(item.userBranchId);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.userBranchesService.setDefault(userId, item.branchId).subscribe({
      next: () => {
        this.settingDefaultId.set(null);
        this.successMessage.set(this.t('userBranches.setDefaultSuccess'));
        this.loadAssignments(userId);
      },
      error: (error) => {
        this.settingDefaultId.set(null);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('userBranches.setDefaultError')),
        );
      },
    });
  }

  openDeleteDialog(item: UserBranchDto): void {
    this.deleteTarget.set(item);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeDeleteDialog(): void {
    if (!this.deleting()) {
      this.deleteTarget.set(null);
    }
  }

  confirmDelete(): void {
    const item = this.deleteTarget();
    const userId = this.selectedUserId();
    if (!item || !userId) {
      return;
    }

    this.deleting.set(true);
    this.userBranchesService.delete(item.userBranchId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.successMessage.set(this.t('userBranches.deleteSuccess'));
        this.loadAssignments(userId);
      },
      error: (error) => {
        this.deleting.set(false);
        this.errorMessage.set(
          extractApiErrorMessage(error, this.t('userBranches.deleteError')),
        );
      },
    });
  }

  exportCsv(): void {
    downloadCsv(
      csvExportFilename('user-branches'),
      [
        this.t('userBranches.branch'),
        this.t('userBranches.role'),
        this.t('userBranches.isDefault'),
      ],
      this.assignments().map((item) => [
        item.branchName ?? String(item.branchId),
        item.roleName ?? String(item.roleId),
        item.isDefault ? this.t('userBranches.default') : '',
      ]),
    );
  }

  private resetAddForm(): void {
    this.newBranchId.set(null);
    this.newRoleId.set(null);
    this.newIsDefault.set(false);
  }
}
