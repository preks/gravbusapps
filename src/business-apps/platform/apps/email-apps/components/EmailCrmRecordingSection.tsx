import React, { useCallback, useRef, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import translations from '../_i18n'
import { useEmailCrmSuggestions, type CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'
import { CrmEntityRow } from './CrmEntityRow'
import type { EmailAccount, EmailMessage } from '../types'
import { EmailCrmSuggestionPanel } from './EmailCrmSuggestionSections'

interface EmailCrmRecordingSectionProps {
  message: EmailMessage
  accessToken: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  aiSummary?: string | null
  threadId?: string
  'data-testid'?: string
}

export function buildManualContextData(
  message: EmailMessage,
  noSubjectLabel: string,
  aiSummary?: string | null,
  threadId?: string
): Record<string, any> {
  return {
    title: message.subject || noSubjectLabel,
    description: aiSummary || message.textBody || message.snippet || '',
    occurredAt: message.date,
    emailActivityTypeHint: 'EMAIL',
    source: 'email',
    emailMessageId: message.id,
    ...(threadId ? { emailThreadId: threadId } : {})
  }
}

export const EmailCrmRecordingSection: React.FC<EmailCrmRecordingSectionProps> = ({
  message,
  accessToken,
  activeAccount,
  employeeId,
  aiSummary,
  threadId,
  'data-testid': testId = 'email-crm-recording'
}) => {
  const { t } = useTranslation(translations)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const {
    ownedEntities,
    emailMatches,
    searchResults,
    counterpartyEmails,
    ownedLoading,
    emailLoading,
    searchLoading,
    searchTerm,
    handleSearch
  } = useEmailCrmSuggestions({
    message,
    accessToken,
    activeAccount,
    employeeId,
    isExpanded: true,
    t
  })

  const handleToggleMore = useCallback(() => {
    setShowMoreOptions(prev => !prev)
  }, [])

  const emailMatchIds = new Set(emailMatches.map(e => e.id))
  const filteredOwned = ownedEntities.filter(e => !emailMatchIds.has(e.id))
  const allShownIds = new Set([...emailMatchIds, ...filteredOwned.map(e => e.id)])
  const filteredSearchResults = searchResults.filter(e => !allShownIds.has(e.id))

  const renderRow = (entity: CrmEntityMatch, rowTestIdPrefix: string) => (
    <CrmEntityRow
      key={entity.id}
      entity={entity}
      message={message}
      accessToken={accessToken}
      aiSummary={aiSummary}
      employeeId={employeeId}
      threadId={threadId}
      data-testid={rowTestIdPrefix}
    />
  )

  const manualRecordAction = (
    <div className="gba:pt-1 gba:border-t">
      <AppAction
        contexts={[
          {
            context: FlowContextName.customerActivityCreate,
            contextData: buildManualContextData(message, t('reader-no-subject'), aiSummary, threadId)
          }
        ]}
        accessToken={accessToken}
        mode="trigger"
        autoExecute
        emptyState="enable"
        data-testid={`${testId}-manual-record`}
      >
        <Button variant="outline" size="sm" className="gba:w-full">
          <PlusIcon className="gba:w-3.5 gba:h-3.5 gba:mr-1.5" />
          {t('crm-record-manually')}
        </Button>
      </AppAction>
    </div>
  )

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-muted-foreground">
        {t('crm-record-activity')}
      </p>

      <EmailCrmSuggestionPanel
        counterpartyEmails={counterpartyEmails}
        emailLoading={emailLoading}
        emailMatches={emailMatches}
        showMoreOptions={showMoreOptions}
        ownedLoading={ownedLoading}
        filteredOwned={filteredOwned}
        searchLoading={searchLoading}
        searchTerm={searchTerm}
        filteredSearchResults={filteredSearchResults}
        searchInputRef={searchInputRef}
        onToggleMore={handleToggleMore}
        handleSearch={handleSearch}
        labels={{
          matchesFor: t('crm-matches-for'),
          searching: t('crm-searching'),
          empty: t('crm-no-records'),
          noCounterparty: t('crm-no-counterparty'),
          hideOptions: t('crm-hide-options'),
          showOptions: t('crm-choose-record'),
          ownedCount: filteredOwned.length > 0 ? t('crm-owned-count', { count: filteredOwned.length }) : null,
          yourRecords: t('crm-your-records'),
          loadingRecords: t('crm-loading-records'),
          searchTitle: t('crm-search-any'),
          searchPlaceholder: t('crm-search-placeholder'),
          searchLoading: t('crm-search-loading'),
          noResults: query => t('crm-no-results', { query })
        }}
        renderRow={renderRow}
        manualRecordAction={manualRecordAction}
        testId={testId}
      />
    </div>
  )
}
