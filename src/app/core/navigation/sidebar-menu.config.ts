import { SidebarMenuRootLink, SidebarMenuSection } from './sidebar-menu.models';

export const SIDEBAR_ROOT_LINKS: readonly SidebarMenuRootLink[] = [
  {
    id: 'dashboard',
    labelKey: 'menu.dashboard',
    icon: 'ki-element-11',
    route: '/demo1',
    exact: true,
  },
];

export const SIDEBAR_MENU_SECTIONS: readonly SidebarMenuSection[] = [
  {
    id: 'sales',
    labelKey: 'menu.sales',
    icon: 'ki-shop',
    matchPaths: ['/sales'],
    children: [
      {
        id: 'sales-customer-groups',
        labelKey: 'menu.sales.customerGroups',
        route: '/demo1/sales/customer-groups',
        permission: 'customerGroups.view',
      },
      {
        id: 'sales-customers',
        labelKey: 'menu.sales.customers',
        route: '/demo1/sales/customers',
        permission: 'customers.view',
      },
      {
        id: 'sales-salesmen',
        labelKey: 'menu.sales.salesmen',
        route: '/demo1/sales/salesmen',
        permission: 'salesmen.view',
      },
      {
        id: 'sales-invoices',
        labelKey: 'menu.sales.invoices',
        route: '/demo1/sales/sales-invoices',
        permission: 'salesInvoices.view',
      },
      { id: 'sales-quotes', labelKey: 'menu.sales.quotes' },
    ],
  },
  {
    id: 'products',
    labelKey: 'menu.products',
    icon: 'ki-capsule',
    matchPaths: ['/products'],
    children: [
      {
        id: 'products-groups',
        labelKey: 'menu.products.groups',
        route: '/demo1/products/groups',
        permission: 'productGroups.view',
      },
      {
        id: 'products-items',
        labelKey: 'menu.products.items',
        route: '/demo1/products/items',
        permission: 'products.view',
      },
      {
        id: 'products-units',
        labelKey: 'menu.products.units',
        route: '/demo1/products/units',
        permission: 'units.view',
      },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'menu.inventory',
    icon: 'ki-package',
    matchPaths: ['/inventory'],
    children: [
      { id: 'inventory-warehouses', labelKey: 'menu.inventory.warehouses' },
      { id: 'inventory-movements', labelKey: 'menu.inventory.movements' },
    ],
  },
  {
    id: 'accounting',
    labelKey: 'menu.accounting',
    icon: 'ki-book',
    matchPaths: ['/accounting', '/reports'],
    children: [
      { id: 'accounting-journal', labelKey: 'menu.accounting.journal' },
      { id: 'accounting-accounts', labelKey: 'menu.accounting.accounts' },
      { id: 'accounting-reports', labelKey: 'menu.reports' },
    ],
  },
  {
    id: 'settings',
    labelKey: 'menu.settings',
    icon: 'ki-setting-2',
    matchPaths: ['/settings'],
    children: [
      {
        id: 'settings-users',
        labelKey: 'menu.settings.users',
        route: '/demo1/settings/users',
        permission: 'users.view',
      },
      {
        id: 'settings-roles',
        labelKey: 'menu.settings.roles',
        route: '/demo1/settings/roles',
        permission: 'roles.view',
      },
      {
        id: 'settings-permissions',
        labelKey: 'menu.settings.permissions',
        route: '/demo1/settings/permissions',
        permission: 'permissions.view',
      },
      {
        id: 'settings-companies',
        labelKey: 'menu.settings.company',
        route: '/demo1/settings/companies',
        permission: 'companies.view',
      },
      {
        id: 'settings-branches',
        labelKey: 'menu.settings.branches',
        route: '/demo1/settings/branches',
        permission: 'branches.view',
      },
      {
        id: 'settings-currencies',
        labelKey: 'menu.settings.currencies',
        route: '/demo1/settings/currencies',
        permission: 'currencies.view',
      },
      {
        id: 'settings-system-logs',
        labelKey: 'menu.settings.systemLogs',
        route: '/demo1/settings/system-logs',
        permission: 'systemLogs.view',
      },
    ],
  },
];
