import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ClockIcon, FileTextIcon, PushPinIcon, StarIcon, TrashIcon, UsersIcon } from '@phosphor-icons/react'
import translations from '../_i18n'

export type QuickAccessSection = 'all-notes' | 'favorites' | 'pinned' | 'shared' | 'recent' | 'trash'

interface QuickAccessItem {
  id: QuickAccessSection
  labelKey: string
  icon: React.ElementType
}

const ITEMS: QuickAccessItem[] = [
  { id: 'all-notes', labelKey: 'qa-all-notes', icon: FileTextIcon },
  { id: 'favorites', labelKey: 'qa-favorites', icon: StarIcon },
  { id: 'pinned', labelKey: 'qa-pinned', icon: PushPinIcon },
  { id: 'shared', labelKey: 'qa-shared', icon: UsersIcon },
  { id: 'recent', labelKey: 'qa-recent', icon: ClockIcon },
  { id: 'trash', labelKey: 'qa-trash', icon: TrashIcon }
]

export interface NoteTreeQuickAccessProps {
  activeSection: QuickAccessSection | null
  onSectionChange: (section: QuickAccessSection) => void
  counts?: Partial<Record<QuickAccessSection, number>>
}

export const NoteTreeQuickAccess: React.FC<NoteTreeQuickAccessProps> = ({
  activeSection,
  onSectionChange,
  counts = {}
}) => {
  const { t } = useTranslation(translations)

  return (
    <nav className="gba:px-2 gba:py-1 gba:flex-shrink-0" aria-label="Quick access" data-testid="note-quick-access">
      {ITEMS.map(item => {
        const isActive = activeSection === item.id
        const Icon = item.icon
        const count = counts[item.id]

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`gba:flex gba:items-center gba:gap-2.5 gba:w-full gba:py-1.5 gba:px-2.5 gba:rounded-lg gba:text-left gba:transition-colors gba:duration-150 gba:text-[13px] ${
              isActive
                ? 'gba:bg-white/15 gba:text-white gba:font-medium'
                : 'gba:text-white/60 hover:gba:bg-white/10 hover:gba:text-white'
            }`}
            data-testid={`qa-${item.id}`}
          >
            <Icon
              className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${
                item.id === 'pinned' && isActive ? 'gba:fill-current' : ''
              }`}
            />
            <span className="gba:flex-1 gba:truncate">{t(item.labelKey)}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`gba:text-[11px] gba:tabular-nums gba:flex-shrink-0 ${
                  isActive ? 'gba:opacity-70' : 'gba:opacity-50'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
