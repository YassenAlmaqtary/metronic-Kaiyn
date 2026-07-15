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
import { unitsEn } from './units.en';
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
  unitsEn,
);
