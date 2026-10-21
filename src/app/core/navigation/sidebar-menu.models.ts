import { TranslationKey } from '../i18n';

export type SidebarMenuSectionId =
  | 'accounting'
  | 'inventory'
  | 'purchasing'
  | 'sales'
  | 'pos'
  | 'hr'
  | 'settings'
  | 'fixedAssets';

export interface SidebarMenuLink {
  id: string;
  labelKey: TranslationKey;
  /** When empty, the item is a visual placeholder until the page exists. */
  route?: string;
  permission?: string;
  /**
   * `group` = visual subgroup header (e.g. العمليات) — not navigable.
   * Default / omitted = normal link.
   */
  kind?: 'link' | 'group' | 'comingSoon';
}

export interface SidebarMenuSection {
  id: SidebarMenuSectionId;
  labelKey: TranslationKey;
  icon: string;
  /** URL fragments used to auto-expand this section. */
  matchPaths: readonly string[];
  permission?: string;
  children: readonly SidebarMenuLink[];
}

export interface SidebarMenuRootLink {
  id: string;
  labelKey: TranslationKey;
  icon: string;
  route: string;
  exact?: boolean;
  permission?: string;
}
