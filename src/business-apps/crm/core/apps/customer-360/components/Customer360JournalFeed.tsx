import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import {
  ChatCircleTextIcon,
  NoteIcon,
  CheckSquareIcon,
  FileTextIcon,
  LifebuoyIcon,
  FoldersIcon,
  ClockCounterClockwiseIcon,
  type Icon
} from '@phosphor-icons/react'
import customer360I18n from '../_i18n'
import type { CustomerJournalEntry } from '../data/types'
import { formatDateTime } from '../utils/format'
import Customer360Section from './Customer360Section'
import Customer360List, { type Customer360RowData } from './Customer360List'

const ENTRY_ICONS: Record<string, Icon> = {
  activity: ChatCircleTextIcon,
  note: NoteIcon,
  task: CheckSquareIcon,
  document: FileTextIcon,
  ticket: LifebuoyIcon,
  case: FoldersIcon
}

interface Customer360JournalFeedProps {
  entries: CustomerJournalEntry[]
  loading?: boolean
  error?: string | null
  /** When set, only the first N entries are shown (condensed mode). */
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
    return visible.map(entry => ({
      id: entry.id,
      icon: ENTRY_ICONS[entry.type ?? ''] ?? ClockCounterClockwiseIcon,
      primary: entry.title || t('journal-untitled'),
      secondary: entry.summary,
      trailing: entry.timestamp ? (
        <span className="gba:text-xs gba:text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
      ) : undefined,
      testId: `customer-360-journal-entry-${entry.id}`
    }))
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
