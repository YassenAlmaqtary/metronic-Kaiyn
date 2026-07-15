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
);
