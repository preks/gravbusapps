import React, { useCallback, useRef, useState } from 'react'
import { Button, Input, Spinner, useTranslation } from '@newwork/nw-design-system'
import { DotsThreeIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import translations from '../_i18n'
import { useEmailCrmSuggestions } from '../hooks/useEmailCrmSuggestions'
import { CrmEntityRow } from './CrmEntityRow'
import type { EmailAccount, EmailMessage } from '../types'

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

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-muted-foreground">
        {t('crm-record-activity')}
      </p>

      {counterpartyEmails.length > 0 ? (
        <div>
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
            {t('crm-matches-for')}
            <span className="gba:font-normal gba:ml-1">{counterpartyEmails.join(', ')}</span>
          </p>
          {emailLoading ? (
            <LoadingRow label={t('crm-searching')} />
          ) : emailMatches.length > 0 ? (
            <div className="gba:space-y-1">
              {emailMatches.map(entity => (
                <CrmEntityRow
                  key={entity.id}
                  entity={entity}
                  message={message}
                  accessToken={accessToken}
                  aiSummary={aiSummary}
                  employeeId={employeeId}
                  threadId={threadId}
                  data-testid={`${testId}-email`}
                />
              ))}
            </div>
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground gba:italic">{t('crm-no-records')}</p>
          )}
        </div>
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground gba:italic">{t('crm-no-counterparty')}</p>
      )}

      <div>
        <button
          type="button"
          className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          onClick={handleToggleMore}
          data-testid={`${testId}-more-toggle`}
        >
          <DotsThreeIcon className="gba:w-4 gba:h-4" weight="bold" />
          {showMoreOptions ? t('crm-hide-options') : t('crm-choose-record')}
          {!showMoreOptions && filteredOwned.length > 0 ? (
            <span className="gba:text-muted-foreground gba:font-normal gba:ml-0.5">
              {t('crm-owned-count', { count: filteredOwned.length })}
            </span>
          ) : null}
        </button>

        {showMoreOptions ? (
          <div className="gba:mt-2 gba:space-y-3">
            {(ownedLoading || filteredOwned.length > 0) && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
                  {t('crm-your-records')}
                </p>
                {ownedLoading ? (
                  <LoadingRow label={t('crm-loading-records')} />
                ) : (
                  <div className="gba:space-y-1">
                    {filteredOwned.map(entity => (
                      <CrmEntityRow
                        key={entity.id}
                        entity={entity}
                        message={message}
                        accessToken={accessToken}
                        aiSummary={aiSummary}
                        employeeId={employeeId}
                        threadId={threadId}
                        data-testid={`${testId}-owned`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">{t('crm-search-any')}</p>
              <div className="gba:relative">
                <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  placeholder={t('crm-search-placeholder')}
                  className="gba:pl-8 gba:h-8 gba:text-sm"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                  data-testid={`${testId}-search-input`}
                />
              </div>
              {searchLoading ? <LoadingRow label={t('crm-search-loading')} /> : null}
              {!searchLoading && filteredSearchResults.length > 0 ? (
                <div className="gba:space-y-1 gba:mt-1.5">
                  {filteredSearchResults.map(entity => (
                    <CrmEntityRow
                      key={entity.id}
                      entity={entity}
                      message={message}
                      accessToken={accessToken}
                      aiSummary={aiSummary}
                      employeeId={employeeId}
                      threadId={threadId}
                      data-testid={`${testId}-search`}
                    />
                  ))}
                </div>
              ) : null}
              {!searchLoading && searchTerm.trim() && filteredSearchResults.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-1">
                  {t('crm-no-results', { query: searchTerm })}
                </p>
              ) : null}
            </div>

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
          </div>
        ) : null}
      </div>
    </div>
  )
}

const LoadingRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
    <Spinner size="sm" />
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
  </div>
)
