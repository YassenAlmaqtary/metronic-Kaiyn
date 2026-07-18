import { TranslationKey } from '../i18n';

export type SidebarMenuSectionId =
  | 'sales'
  | 'products'
  | 'inventory'
  | 'accounting'
  | 'banks'
  | 'settings';

export interface SidebarMenuLink {
  id: string;
  labelKey: TranslationKey;
  /** When empty, the item is a visual placeholder until the page exists. */
  route?: string;
  permission?: string;
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
