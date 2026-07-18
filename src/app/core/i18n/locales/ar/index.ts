import { dashboardAr } from './dashboard.ar';
import { mergeLocale } from '../../utils/merge-locale';
import { authAr } from './auth.ar';
import { commonAr } from './common.ar';
import { currenciesAr } from './currencies.ar';
import { customerGroupsAr } from './customer-groups.ar';
import { customersAr } from './customers.ar';
import { salesmenAr } from './salesmen.ar';
import { salesInvoicesAr } from './sales-invoices.ar';
import { productGroupsAr } from './product-groups.ar';
import { productsAr } from './products.ar';
import { unitsAr } from './units.ar';
import { accountGroupsAr } from './account-groups.ar';
import { accountingPeriodsAr } from './accounting-periods.ar';
import { fiscalYearsAr } from './fiscal-years.ar';
import { accountsAr } from './accounts.ar';
import { costCentersAr } from './cost-centers.ar';
import { taxSetupsAr } from './tax-setups.ar';
import { openingBalancesAr } from './opening-balances.ar';
import { journalEntriesAr } from './journal-entries.ar';
import { paymentVouchersAr } from './payment-vouchers.ar';
import { receiptVouchersAr } from './receipt-vouchers.ar';
import { generalLedgerAr } from './general-ledger.ar';
import { banksAr } from './banks.ar';
import { bankAccountsAr } from './bank-accounts.ar';
import { checkBooksAr } from './check-books.ar';
import { menuAr } from './menu.ar';
import { navAr } from './nav.ar';
import { permissionsAr } from './permissions.ar';
import { rolesAr } from './roles.ar';
import { branchesAr } from './branches.ar';
import { companiesAr } from './companies.ar';
import { systemLogsAr } from './system-logs.ar';
import { usersAr } from './users.ar';

export const ar = mergeLocale(
  commonAr,
  navAr,
  menuAr,
  authAr,
  usersAr,
  companiesAr,
  branchesAr,
  rolesAr,
  permissionsAr,
  dashboardAr,
  systemLogsAr,
  currenciesAr,
  customerGroupsAr,
  customersAr,
  salesmenAr,
  salesInvoicesAr,
  productGroupsAr,
  productsAr,
  unitsAr,
  accountGroupsAr,
  accountingPeriodsAr,
  fiscalYearsAr,
  accountsAr,
  costCentersAr,
  taxSetupsAr,
  openingBalancesAr,
  journalEntriesAr,
  paymentVouchersAr,
  receiptVouchersAr,
  generalLedgerAr,
  banksAr,
  bankAccountsAr,
  checkBooksAr,
);
