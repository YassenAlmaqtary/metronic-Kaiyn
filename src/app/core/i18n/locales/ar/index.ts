import { dashboardAr } from './dashboard.ar';
import { mergeLocale } from '../../utils/merge-locale';
import { authAr } from './auth.ar';
import { commonAr } from './common.ar';
import { menuAr } from './menu.ar';
import { navAr } from './nav.ar';
import { permissionsAr } from './permissions.ar';
import { rolesAr } from './roles.ar';
import { branchesAr } from './branches.ar';
import { companiesAr } from './companies.ar';
import { usersAr } from './users.ar';

export const ar = mergeLocale(commonAr, navAr, menuAr, authAr, usersAr, companiesAr, branchesAr, rolesAr, permissionsAr, dashboardAr);
