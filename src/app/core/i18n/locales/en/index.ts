import { dashboardEn } from './dashboard.en';
import { mergeLocale } from '../../utils/merge-locale';
import { authEn } from './auth.en';
import { commonEn } from './common.en';
import { currenciesEn } from './currencies.en';
import { customerGroupsEn } from './customer-groups.en';
import { customersEn } from './customers.en';
import { salesmenEn } from './salesmen.en';
import { salesInvoicesEn } from './sales-invoices.en';
import { productGroupsEn } from './product-groups.en';
import { productsEn } from './products.en';
import { pricingEn } from './pricing.en';
import { unitsEn } from './units.en';
import { accountGroupsEn } from './account-groups.en';
import { accountingPeriodsEn } from './accounting-periods.en';
import { fiscalYearsEn } from './fiscal-years.en';
import { accountsEn } from './accounts.en';
import { costCentersEn } from './cost-centers.en';
import { taxSetupsEn } from './tax-setups.en';
import { openingBalancesEn } from './opening-balances.en';
import { journalEntriesEn } from './journal-entries.en';
import { paymentVouchersEn } from './payment-vouchers.en';
import { receiptVouchersEn } from './receipt-vouchers.en';
import { generalLedgerEn } from './general-ledger.en';
import { banksEn } from './banks.en';
import { bankAccountsEn } from './bank-accounts.en';
import { checkBooksEn } from './check-books.en';
import { issuedChecksEn } from './issued-checks.en';
import { warehousesEn } from './warehouses.en';
import { stockIssuesEn } from './stock-issues.en';
import { stockTransfersEn } from './stock-transfers.en';
import { stockReceivingsEn } from './stock-receivings.en';
import { stockTakingsEn } from './stock-takings.en';
import { stockAdjustmentsEn } from './stock-adjustments.en';
import { menuEn } from './menu.en';
import { navEn } from './nav.en';
import { permissionsEn } from './permissions.en';
import { rolesEn } from './roles.en';
import { branchesEn } from './branches.en';
import { companiesEn } from './companies.en';
import { systemLogsEn } from './system-logs.en';
import { usersEn } from './users.en';

export const en = mergeLocale(
  commonEn,
  navEn,
  menuEn,
  authEn,
  usersEn,
  companiesEn,
  branchesEn,
  rolesEn,
  permissionsEn,
  dashboardEn,
  systemLogsEn,
  currenciesEn,
  customerGroupsEn,
  customersEn,
  salesmenEn,
  salesInvoicesEn,
  productGroupsEn,
  productsEn,
  pricingEn,
  unitsEn,
  accountGroupsEn,
  accountingPeriodsEn,
  fiscalYearsEn,
  accountsEn,
  costCentersEn,
  taxSetupsEn,
  openingBalancesEn,
  journalEntriesEn,
  paymentVouchersEn,
  receiptVouchersEn,
  generalLedgerEn,
  banksEn,
  bankAccountsEn,
  checkBooksEn,
  issuedChecksEn,
  warehousesEn,
  stockIssuesEn,
  stockTransfersEn,
  stockReceivingsEn,
  stockTakingsEn,
  stockAdjustmentsEn,
);
