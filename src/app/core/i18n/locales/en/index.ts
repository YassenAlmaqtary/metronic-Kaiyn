import { dashboardEn } from './dashboard.en';
import { mergeLocale } from '../../utils/merge-locale';
import { authEn } from './auth.en';
import { commonEn } from './common.en';
import { menuEn } from './menu.en';
import { navEn } from './nav.en';
import { permissionsEn } from './permissions.en';
import { rolesEn } from './roles.en';
import { branchesEn } from './branches.en';
import { companiesEn } from './companies.en';
import { usersEn } from './users.en';

export const en = mergeLocale(commonEn, navEn, menuEn, authEn, usersEn, companiesEn, branchesEn, rolesEn, permissionsEn, dashboardEn);
