import type { Icon } from '@phosphor-icons/react'
import {
  ActivityIcon,
  AddressBookTabsIcon,
  BuildingsIcon,
  ChartPieSliceIcon,
  FileTextIcon,
  MegaphoneIcon,
  TargetIcon,
  TrayIcon,
  UsersIcon
} from '@phosphor-icons/react'

/**
 * Phosphor icons aligned with Customer Relations / Investment Relations tabs
 * and Investment Management views — use for export/import selectors and entity pages.
 */
export const RELATION_ENTITY_ICONS = {
  lead: UsersIcon,
  contact: AddressBookTabsIcon,
  account: BuildingsIcon,
  opportunity: TargetIcon,
  campaign: MegaphoneIcon,
  activity: ActivityIcon,
  task: TrayIcon,
  investment: ChartPieSliceIcon,
  investmentReport: FileTextIcon
} as const satisfies Record<string, Icon>

export type RelationEntityIconKey = keyof typeof RELATION_ENTITY_ICONS
