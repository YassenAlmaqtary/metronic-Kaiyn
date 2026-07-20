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
      {
        id: 'inventory-warehouses',
        labelKey: 'menu.inventory.warehouses',
        route: '/demo1/inventory/warehouses',
        permission: 'stores.view',
      },
      { id: 'inventory-movements', labelKey: 'menu.inventory.movements' },
    ],
  },
  {
    id: 'accounting',
    labelKey: 'menu.accounting',
    icon: 'ki-book',
    matchPaths: ['/accounting', '/reports'],
    children: [
      {
        id: 'accounting-journal',
        labelKey: 'menu.accounting.journal',
        route: '/demo1/accounting/journal-entries',
        permission: 'journalEntries.view',
      },
      {
        id: 'accounting-account-groups',
        labelKey: 'menu.accounting.accountGroups',
        route: '/demo1/accounting/account-groups',
        permission: 'accountGroups.view',
      },
      {
        id: 'accounting-periods',
        labelKey: 'menu.accounting.periods',
        route: '/demo1/accounting/periods',
        permission: 'accountingPeriods.view',
      },
      {
        id: 'accounting-fiscal-years',
        labelKey: 'menu.accounting.fiscalYears',
        route: '/demo1/accounting/fiscal-years',
        permission: 'fiscalYears.view',
      },
      {
        id: 'accounting-accounts',
        labelKey: 'menu.accounting.accounts',
        route: '/demo1/accounting/accounts',
        permission: 'accounts.view',
      },
      {
        id: 'accounting-cost-centers',
        labelKey: 'menu.accounting.costCenters',
        route: '/demo1/accounting/cost-centers',
        permission: 'costCenters.view',
      },
      {
        id: 'accounting-tax-setups',
        labelKey: 'menu.accounting.taxSetups',
        route: '/demo1/accounting/tax-setups',
        permission: 'taxSetups.view',
      },
      {
        id: 'accounting-opening-balances',
        labelKey: 'menu.accounting.openingBalances',
        route: '/demo1/accounting/opening-balances',
        permission: 'openingBalances.view',
      },
      {
        id: 'accounting-payment-vouchers',
        labelKey: 'menu.accounting.paymentVouchers',
        route: '/demo1/accounting/payment-vouchers',
        permission: 'paymentVouchers.view',
      },
      {
        id: 'accounting-receipt-vouchers',
        labelKey: 'menu.accounting.receiptVouchers',
        route: '/demo1/accounting/receipt-vouchers',
        permission: 'receiptVouchers.view',
      },
      {
        id: 'accounting-check-books',
        labelKey: 'menu.accounting.checkBooks',
        route: '/demo1/accounting/check-books',
        permission: 'checkBooks.view',
      },
      {
        id: 'accounting-issued-checks',
        labelKey: 'menu.accounting.issuedChecks',
        route: '/demo1/accounting/issued-checks',
        permission: 'issuedChecks.view',
      },
      {
        id: 'accounting-general-ledger',
        labelKey: 'menu.accounting.generalLedger',
        route: '/demo1/accounting/reports/general-ledger',
        permission: 'generalLedger.view',
      },
      {
        id: 'accounting-trial-balance',
        labelKey: 'menu.accounting.trialBalance',
        route: '/demo1/accounting/reports/trial-balance',
        permission: 'trialBalance.view',
      },
    ],
  },
  {
    id: 'banks',
    labelKey: 'menu.banks',
    icon: 'ki-wallet',
    matchPaths: ['/banks'],
    children: [
      {
        id: 'banks-list',
        labelKey: 'menu.banks.banks',
        route: '/demo1/banks/banks',
        permission: 'banks.view',
      },
      {
        id: 'banks-accounts',
        labelKey: 'menu.banks.accounts',
        route: '/demo1/banks/accounts',
        permission: 'bankAccounts.view',
      },
      {
        id: 'banks-check-books',
        labelKey: 'menu.banks.checkBooks',
        route: '/demo1/banks/check-books',
        permission: 'checkBooks.view',
      },
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
