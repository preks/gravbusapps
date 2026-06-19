import React from 'react'
import { IconAvatar } from '@newwork/nw-design-system'
import type { Icon } from '@phosphor-icons/react'
import {
  BankIcon,
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  FlowArrowIcon,
  HeadsetIcon,
  LightbulbIcon,
  LightningIcon,
  NotePencilIcon,
  ReceiptIcon,
  SparkleIcon,
  UserCircleIcon,
  UserIcon
} from '@phosphor-icons/react'

export type EveryAiEntityCardAvatarVariant = 'default' | 'decorative' | 'success' | 'info' | 'ai'

export interface EveryAiEntityCardIconConfig {
  icon: Icon
  avatarVariant?: EveryAiEntityCardAvatarVariant
}

/** Canonical keys used in EVERY_AI_ENTITY_CARD_ICONS */
const CANONICAL_KEYS = [
  'contact',
  'lead',
  'opportunity',
  'account',
  'content_entry',
  'document',
  'note',
  'expense',
  'absence',
  'employee',
  'service_ticket',
  'service_workflow',
  'blink',
  'reminder',
  'default'
] as const

type CanonicalEntityCardKey = (typeof CANONICAL_KEYS)[number]

const ENTITY_CARD_KEY_ALIASES: Record<string, CanonicalEntityCardKey> = {
  company: 'account',
  investment_account: 'account',
  investment_company: 'account',
  investment_contact: 'contact',
  investment_lead: 'lead',
  investment_opportunity: 'opportunity',
  employee_absence: 'absence',
  content_document: 'content_entry',
  crm_document: 'document',
  irm_document: 'document',
  investment_document: 'document',
  crm_note: 'note',
  irm_note: 'note',
  investment_note: 'note',
  expense_request: 'expense',
  expense_plan: 'expense',
  expense_item: 'expense',
  quick_task: 'blink'
}

export const EVERY_AI_ENTITY_CARD_ICONS: Record<CanonicalEntityCardKey, EveryAiEntityCardIconConfig> = {
  contact: { icon: UserIcon },
  lead: { icon: UserIcon },
  opportunity: { icon: LightbulbIcon },
  account: { icon: BankIcon },
  content_entry: { icon: FileTextIcon },
  document: { icon: FileTextIcon },
  note: { icon: NotePencilIcon },
  expense: { icon: ReceiptIcon },
  absence: { icon: CalendarIcon },
  employee: { icon: UserCircleIcon },
  service_ticket: { icon: HeadsetIcon },
  service_workflow: { icon: FlowArrowIcon },
  blink: { icon: LightningIcon },
  reminder: { icon: BellIcon },
  default: { icon: SparkleIcon }
}

const isCanonicalKey = (key: string): key is CanonicalEntityCardKey =>
  (CANONICAL_KEYS as readonly string[]).includes(key)

/**
 * Normalize backend entity type strings to a canonical card icon key.
 */
export function resolveEveryAiEntityCardKey(entity: string): CanonicalEntityCardKey {
  const normalized = entity.trim().toLowerCase()
  if (isCanonicalKey(normalized)) {
    return normalized
  }
  const alias = ENTITY_CARD_KEY_ALIASES[normalized]
  if (alias) {
    return alias
  }
  return 'default'
}

export function getEveryAiEntityCardIconConfig(entity: string): EveryAiEntityCardIconConfig {
  return EVERY_AI_ENTITY_CARD_ICONS[resolveEveryAiEntityCardKey(entity)]
}

export function renderEveryAiEntityCardIcon(
  entity: string,
  options: { variant: 'default' | 'decorative'; label: string }
): React.ReactNode {
  const config = getEveryAiEntityCardIconConfig(entity)
  const avatarVariant = config.avatarVariant ?? options.variant
  const size = options.variant === 'decorative' ? 'lg' : 'xl'

  return <IconAvatar icon={config.icon} variant={avatarVariant} size={size} decorative label={options.label} />
}
