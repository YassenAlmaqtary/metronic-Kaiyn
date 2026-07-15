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
import { CurrenciesListComponent } from './pages/settings/currencies/currencies-list/currencies-list.component';
import { CurrencyFormComponent } from './pages/settings/currencies/currency-form/currency-form.component';
import { SystemLogFormComponent } from './pages/settings/system-logs/system-log-form/system-log-form.component';
import { SystemLogsListComponent } from './pages/settings/system-logs/system-logs-list/system-logs-list.component';
import { UserFormComponent } from './pages/settings/users/user-form/user-form.component';
import { UsersListComponent } from './pages/settings/users/users-list/users-list.component';
import { CustomerGroupFormComponent } from './pages/sales/customer-groups/customer-group-form/customer-group-form.component';
import { CustomerGroupsListComponent } from './pages/sales/customer-groups/customer-groups-list/customer-groups-list.component';
import { CustomerFormComponent } from './pages/sales/customers/customer-form/customer-form.component';
import { CustomersListComponent } from './pages/sales/customers/customers-list/customers-list.component';
import { SalesmanFormComponent } from './pages/sales/salesmen/salesman-form/salesman-form.component';
import { SalesmenListComponent } from './pages/sales/salesmen/salesmen-list/salesmen-list.component';
import { SalesInvoiceFormComponent } from './pages/sales/sales-invoices/sales-invoice-form/sales-invoice-form.component';
import { SalesInvoicesListComponent } from './pages/sales/sales-invoices/sales-invoices-list/sales-invoices-list.component';
import { ProductGroupFormComponent } from './pages/products/product-groups/product-group-form/product-group-form.component';
import { ProductGroupsListComponent } from './pages/products/product-groups/product-groups-list/product-groups-list.component';
import { ProductFormComponent } from './pages/products/items/product-form/product-form.component';
import { ProductsListComponent } from './pages/products/items/products-list/products-list.component';
import { UnitFormComponent } from './pages/products/units/unit-form/unit-form.component';
import { UnitsListComponent } from './pages/products/units/units-list/units-list.component';

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
      { path: 'settings/currencies', component: CurrenciesListComponent },
      { path: 'settings/currencies/new', component: CurrencyFormComponent },
      { path: 'settings/currencies/:id/edit', component: CurrencyFormComponent },
      { path: 'settings/system-logs', component: SystemLogsListComponent },
      { path: 'settings/system-logs/new', component: SystemLogFormComponent },
      { path: 'sales/customer-groups', component: CustomerGroupsListComponent },
      { path: 'sales/customer-groups/new', component: CustomerGroupFormComponent },
      { path: 'sales/customer-groups/:id/edit', component: CustomerGroupFormComponent },
      { path: 'sales/customers', component: CustomersListComponent },
      { path: 'sales/customers/new', component: CustomerFormComponent },
      { path: 'sales/customers/:id/edit', component: CustomerFormComponent },
      { path: 'sales/salesmen', component: SalesmenListComponent },
      { path: 'sales/salesmen/new', component: SalesmanFormComponent },
      { path: 'sales/salesmen/:id/edit', component: SalesmanFormComponent },
      { path: 'sales/sales-invoices', component: SalesInvoicesListComponent },
      { path: 'sales/sales-invoices/new', component: SalesInvoiceFormComponent },
      { path: 'sales/sales-invoices/:id', component: SalesInvoiceFormComponent },
      { path: 'products/groups', component: ProductGroupsListComponent },
      { path: 'products/groups/new', component: ProductGroupFormComponent },
      { path: 'products/groups/:id/edit', component: ProductGroupFormComponent },
      { path: 'products/items', component: ProductsListComponent },
      { path: 'products/items/new', component: ProductFormComponent },
      { path: 'products/items/:id/edit', component: ProductFormComponent },
      { path: 'products/units', component: UnitsListComponent },
      { path: 'products/units/new', component: UnitFormComponent },
      { path: 'products/units/:id/edit', component: UnitFormComponent },
    ],
  },
];
