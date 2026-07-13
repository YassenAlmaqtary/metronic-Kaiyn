import { TranslationKey } from '../../../core/i18n';

export type DashboardTeamMember =
  | { type: 'avatar'; src: string }
  | { type: 'badge'; label: string; badgeClass: string };

export type DashboardTeamRow = {
  id: number;
  nameKey: TranslationKey;
  descKey: TranslationKey;
  rating: number;
  modifiedKey: TranslationKey;
  members: DashboardTeamMember[];
};

export const DASHBOARD_TEAMS: DashboardTeamRow[] = [
  {
    id: 1,
    nameKey: 'dashboard.teams.productManagement.name',
    descKey: 'dashboard.teams.productManagement.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.oct21',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-4.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-1.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-2.png' },
      { type: 'badge', label: '+10', badgeClass: 'bg-green-500' },
    ],
  },
  {
    id: 2,
    nameKey: 'dashboard.teams.marketing.name',
    descKey: 'dashboard.teams.marketing.desc',
    rating: 3.5,
    modifiedKey: 'dashboard.teams.date.oct15',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-4.png' },
      { type: 'badge', label: 'g', badgeClass: 'bg-yellow-500 uppercase' },
    ],
  },
  {
    id: 3,
    nameKey: 'dashboard.teams.hr.name',
    descKey: 'dashboard.teams.hr.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.oct10',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-4.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-1.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-2.png' },
      { type: 'badge', label: '+A', badgeClass: 'bg-violet-500' },
    ],
  },
  {
    id: 4,
    nameKey: 'dashboard.teams.sales.name',
    descKey: 'dashboard.teams.sales.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.oct5',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-24.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-7.png' },
    ],
  },
  {
    id: 5,
    nameKey: 'dashboard.teams.development.name',
    descKey: 'dashboard.teams.development.desc',
    rating: 4.5,
    modifiedKey: 'dashboard.teams.date.oct1',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-3.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-8.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-9.png' },
      { type: 'badge', label: '+5', badgeClass: 'bg-destructive' },
    ],
  },
  {
    id: 6,
    nameKey: 'dashboard.teams.qa.name',
    descKey: 'dashboard.teams.qa.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.sep25',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-6.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-5.png' },
    ],
  },
  {
    id: 7,
    nameKey: 'dashboard.teams.finance.name',
    descKey: 'dashboard.teams.finance.desc',
    rating: 4,
    modifiedKey: 'dashboard.teams.date.sep20',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-10.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-11.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-12.png' },
      { type: 'badge', label: '+8', badgeClass: 'bg-primary text-primary-foreground' },
    ],
  },
  {
    id: 8,
    nameKey: 'dashboard.teams.support.name',
    descKey: 'dashboard.teams.support.desc',
    rating: 3.5,
    modifiedKey: 'dashboard.teams.date.sep15',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-13.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-14.png' },
    ],
  },
  {
    id: 9,
    nameKey: 'dashboard.teams.rd.name',
    descKey: 'dashboard.teams.rd.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.sep10',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-15.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-16.png' },
    ],
  },
  {
    id: 10,
    nameKey: 'dashboard.teams.operations.name',
    descKey: 'dashboard.teams.operations.desc',
    rating: 4,
    modifiedKey: 'dashboard.teams.date.sep5',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-17.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-18.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-19.png' },
    ],
  },
  {
    id: 11,
    nameKey: 'dashboard.teams.it.name',
    descKey: 'dashboard.teams.it.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.sep1',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-20.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-21.png' },
    ],
  },
  {
    id: 12,
    nameKey: 'dashboard.teams.legal.name',
    descKey: 'dashboard.teams.legal.desc',
    rating: 4,
    modifiedKey: 'dashboard.teams.date.aug25',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-22.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-23.png' },
    ],
  },
  {
    id: 13,
    nameKey: 'dashboard.teams.logistics.name',
    descKey: 'dashboard.teams.logistics.desc',
    rating: 3.5,
    modifiedKey: 'dashboard.teams.date.aug20',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-24.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-25.png' },
    ],
  },
  {
    id: 14,
    nameKey: 'dashboard.teams.procurement.name',
    descKey: 'dashboard.teams.procurement.desc',
    rating: 5,
    modifiedKey: 'dashboard.teams.date.aug15',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-26.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-27.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-28.png' },
      { type: 'badge', label: '+3', badgeClass: 'bg-violet-500' },
    ],
  },
  {
    id: 15,
    nameKey: 'dashboard.teams.training.name',
    descKey: 'dashboard.teams.training.desc',
    rating: 4,
    modifiedKey: 'dashboard.teams.date.aug10',
    members: [
      { type: 'avatar', src: 'assets/media/avatars/300-29.png' },
      { type: 'avatar', src: 'assets/media/avatars/300-30.png' },
    ],
  },
];

export const DASHBOARD_RATING_STARS = [1, 2, 3, 4, 5] as const;

export const DASHBOARD_MONTH_KEYS = [
  'dashboard.month.jan',
  'dashboard.month.feb',
  'dashboard.month.mar',
  'dashboard.month.apr',
  'dashboard.month.may',
  'dashboard.month.jun',
  'dashboard.month.jul',
  'dashboard.month.aug',
  'dashboard.month.sep',
  'dashboard.month.oct',
  'dashboard.month.nov',
  'dashboard.month.dec',
] as const;
