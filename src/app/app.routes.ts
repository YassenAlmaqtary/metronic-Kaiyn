import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/api/guards/auth.guard';
import { Demo1Component } from './layouts/demo1/demo1.component';
import { SignInComponent } from './pages/auth/sign-in/sign-in.component';
import { IndexComponent as Demo1IndexComponent } from './pages/demo1/index/index.component';
import { PermissionsPageComponent } from './pages/settings/permissions/permissions-page/permissions-page.component';
import { RolesListComponent } from './pages/settings/roles/roles-list/roles-list.component';
import { RoleFormComponent } from './pages/settings/roles/role-form/role-form.component';
import { BranchesListComponent } from './pages/settings/branches/branches-list/branches-list.component';
import { BranchFormComponent } from './pages/settings/branches/branch-form/branch-form.component';
import { CompaniesListComponent } from './pages/settings/companies/companies-list/companies-list.component';
import { CompanyFormComponent } from './pages/settings/companies/company-form/company-form.component';
import { UserFormComponent } from './pages/settings/users/user-form/user-form.component';
import { UsersListComponent } from './pages/settings/users/users-list/users-list.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/sign-in' },
  { path: 'auth/sign-in', component: SignInComponent, canActivate: [guestGuard] },
  {
    path: 'demo1',
    component: Demo1Component,
    canActivate: [authGuard],
    children: [
      { path: '', component: Demo1IndexComponent },
      { path: 'settings/users', component: UsersListComponent },
      { path: 'settings/users/new', component: UserFormComponent },
      { path: 'settings/users/:id/edit', component: UserFormComponent },
      { path: 'settings/roles', component: RolesListComponent },
      { path: 'settings/roles/new', component: RoleFormComponent },
      { path: 'settings/roles/:id/edit', component: RoleFormComponent },
      { path: 'settings/permissions', component: PermissionsPageComponent },
      { path: 'settings/companies', component: CompaniesListComponent },
      { path: 'settings/companies/new', component: CompanyFormComponent },
      { path: 'settings/companies/:id/edit', component: CompanyFormComponent },
      { path: 'settings/branches', component: BranchesListComponent },
      { path: 'settings/branches/new', component: BranchFormComponent },
      { path: 'settings/branches/:id/edit', component: BranchFormComponent },
    ],
  },
];
