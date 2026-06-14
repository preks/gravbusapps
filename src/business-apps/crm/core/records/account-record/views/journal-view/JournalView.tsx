import React from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  EmptyState,
  Spinner
} from '@newwork/nw-design-system'
import {
  CalendarBlankIcon,
  ChatCircleTextIcon,
  CheckSquareIcon,
  ClipboardTextIcon,
  NoteIcon,
  UserIcon
} from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { AccountJournalEntry, AccountJournalEntryType } from './types'
import { useAccountJournal } from './useAccountJournal'

interface JournalViewProps extends BusinessAppContextProps {
  accountId: string
}

const ENTRY_TYPE_LABELS: Record<AccountJournalEntryType, string> = {
  activity: 'Activity',
  note: 'Note',
  task: 'Task',
  approval: 'Approval'
}

const ENTRY_TYPE_ICONS: Record<AccountJournalEntryType, React.ElementType> = {
  activity: ChatCircleTextIcon,
  note: NoteIcon,
  task: CheckSquareIcon,
  approval: ClipboardTextIcon
}

function formatCreatedAt(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const JournalEntryCard: React.FC<{ entry: AccountJournalEntry }> = ({ entry }) => {
  const EntryIcon = ENTRY_TYPE_ICONS[entry.type]
  const label = ENTRY_TYPE_LABELS[entry.type]
  const createdAt = formatCreatedAt(entry.createdAt)

  return (
    <Card variant="surface" data-testid={`account-journal-entry-${entry.id}`}>
      <CardContent className="gba:flex gba:gap-4 gba:p-4">
        <span className="gba:flex gba:size-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
          <EntryIcon className="gba:size-5" />
        </span>
        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-2">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Badge variant="secondary" size="sm">
              {label}
            </Badge>
            {createdAt ? (
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                <CalendarBlankIcon className="gba:size-3.5" />
                {createdAt}
              </span>
            ) : null}
            {entry.actorName ? (
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                <UserIcon className="gba:size-3.5" />
                {entry.actorName}
              </span>
            ) : null}
          </div>
          <div className="gba:min-w-0">
            <p className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{entry.title}</p>
            {entry.description ? (
              <p className="gba:mt-1 gba:line-clamp-3 gba:text-sm gba:text-muted-foreground">{entry.description}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const JournalView: React.FC<JournalViewProps> = ({ accountId, ...context }) => {
  const { entries, loading, error } = useAccountJournal(context, accountId)

  if (loading) {
    return (
      <div className="gba:col-span-12 gba:flex gba:items-center gba:justify-center gba:py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:col-span-12">
        <Alert variant="destructive" data-testid="account-journal-error">
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('crm.common.error', 'Something went wrong')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="gba:col-span-12">
        <EmptyState
          type="no-data"
          title={getTranslationFromI18nKeyAndLabel('crm.account.journal.emptyTitle', 'No journal entries yet')}
          description={getTranslationFromI18nKeyAndLabel(
            'crm.account.journal.emptyDescription',
            'Notes, tasks, approvals and activities for this account will appear here.'
          )}
          data-testid="account-journal-empty"
        />
      </div>
    )
  }

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-3" data-testid="account-journal-view">
      {entries.map(entry => (
        <JournalEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

export { JournalView }
export default JournalView
