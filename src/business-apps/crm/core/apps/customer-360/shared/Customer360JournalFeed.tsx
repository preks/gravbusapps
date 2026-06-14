import React, { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation as useFluentTranslation
} from '@newwork/nw-design-system'
import {
  ChatCircleTextIcon,
  CheckSquareIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  FoldersIcon,
  LifebuoyIcon,
  NoteIcon,
  type Icon
} from '@phosphor-icons/react'
import customer360I18n from '../_i18n'
import type { CustomerJournalEntry } from '../data/types'
import { formatDateTime } from '../utils/format'
import Customer360List, { type Customer360RowData } from './Customer360List'
import Customer360Section from './Customer360Section'

const ENTRY_ICONS: Record<string, Icon> = {
  activity: ChatCircleTextIcon,
  note: NoteIcon,
  task: CheckSquareIcon,
  document: FileTextIcon,
  ticket: LifebuoyIcon,
  case: FoldersIcon
}

const ENTRY_LABEL_KEYS: Record<string, string> = {
  activity: 'journal-type-activity',
  note: 'journal-type-note',
  task: 'journal-type-task',
  document: 'journal-type-document',
  ticket: 'journal-type-ticket',
  case: 'journal-type-case'
}

const ENTRY_ICON_COLORS: Record<string, string> = {
  activity: 'gba:text-info',
  note: 'gba:text-primary',
  task: 'gba:text-success',
  document: 'gba:text-warning',
  ticket: 'gba:text-destructive',
  case: 'gba:text-foreground'
}

function entryLabelKey(type: string | undefined): string {
  if (!type) return 'journal-type-entry'
  return ENTRY_LABEL_KEYS[type] ?? 'journal-type-entry'
}

function renderEntryIcon(type: string | undefined, label: string) {
  const EntryIcon = ENTRY_ICONS[type ?? ''] ?? ClockCounterClockwiseIcon
  const iconColor = ENTRY_ICON_COLORS[type ?? ''] ?? 'gba:text-muted-foreground'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={label}
            className="gba:mt-0.5 gba:flex gba:size-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground"
          >
            <EntryIcon className={`gba:size-4 ${iconColor}`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface Customer360JournalFeedProps {
  entries: CustomerJournalEntry[]
  loading?: boolean
  error?: string | null
  limit?: number
  titleKey?: string
  testId: string
  className?: string
}

const Customer360JournalFeed: React.FC<Customer360JournalFeedProps> = ({
  entries,
  loading = false,
  error = null,
  limit,
  titleKey = 'journal-title',
  testId,
  className
}) => {
  const { t } = useFluentTranslation(customer360I18n)

  const rows = useMemo<Customer360RowData[]>(() => {
    const visible = typeof limit === 'number' ? entries.slice(0, limit) : entries
    return visible.map(entry => {
      const label = t(entryLabelKey(entry.type))
      return {
        id: entry.id,
        iconNode: renderEntryIcon(entry.type, label),
        primary: entry.title || t('journal-untitled'),
        secondary: entry.summary,
        trailing: entry.timestamp ? (
          <span className="gba:text-xs gba:text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
        ) : undefined,
        testId: `customer-360-journal-entry-${entry.id}`
      }
    })
  }, [entries, limit, t])

  return (
    <Customer360Section
      title={t(titleKey)}
      icon={ClockCounterClockwiseIcon}
      count={loading || error ? undefined : entries.length}
      loading={loading}
      error={error}
      errorTitle={t('error-title')}
      isEmpty={rows.length === 0}
      emptyTitle={t('journal-empty-title')}
      emptyDescription={t('journal-empty-description')}
      testId={testId}
      className={className}
    >
      <Customer360List rows={rows} testId={`${testId}-list`} />
    </Customer360Section>
  )
}

export default Customer360JournalFeed
export { Customer360JournalFeed }
