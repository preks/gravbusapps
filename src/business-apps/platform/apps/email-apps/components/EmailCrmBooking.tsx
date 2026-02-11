/**
 * EmailCrmBooking - Panel for recording an email as a CRM Activity.
 *
 * Priority order:
 *   1. "Email matches" – entities whose email matches the counterparty (shown first)
 *   2. "Your records" / "Search any record" – collapsed behind "More options"
 * Plus a "Record manually" fallback that opens the activity form.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button, Badge, Spinner, Input } from '@newwork/nw-design-system'
import {
  LinkSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  DotsThreeIcon,
  SparkleIcon
} from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useEmailCrmSuggestions } from '../hooks/useEmailCrmSuggestions'
import { CrmEntityRow } from './CrmEntityRow'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessage, EmailAccount } from '../types'

interface EmailCrmBookingProps {
  message: EmailMessage
  accessToken: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  'data-testid'?: string
}

/** Build contextData for manual record (no entity pre-selected) */
const buildManualContextData = (
  message: EmailMessage,
  aiSummary?: string | null,
  employeeId?: string
): Record<string, any> => ({
  title: message.subject || '(No subject)',
  description: aiSummary || message.textBody || message.snippet || '',
  occurredAt: message.date,
  emailActivityTypeHint: 'EMAIL',
  source: 'email',
  emailMessageId: message.id,
  ...(employeeId ? { ownerEmployeeId: employeeId } : {})
})

export const EmailCrmBooking: React.FC<EmailCrmBookingProps> = ({
  message,
  accessToken,
  activeAccount,
  employeeId,
  'data-testid': testId = 'email-crm-booking'
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  /* ---- AI Summary pre-fetch ---- */
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const summaryFetchedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isExpanded || !message?.id || !accessToken) return
    // Already fetched for this message
    if (summaryFetchedForRef.current === message.id) return
    summaryFetchedForRef.current = message.id
    setSummaryLoading(true)
    setAiSummary(null)

    EmailApiService.setAccessToken(accessToken)
    EmailApiService.summarizeMessage(message.id)
      .then(summary => setAiSummary(summary))
      .catch(err => {
        console.error('AI summary failed, will fallback to text:', err)
        setAiSummary(null)
      })
      .finally(() => setSummaryLoading(false))
  }, [isExpanded, message?.id, accessToken])

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
    isExpanded
  })

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleToggleMore = useCallback(() => {
    setShowMoreOptions(prev => !prev)
  }, [])

  // De-dup: email matches shown first, then owned (minus already shown), then search (minus both)
  const emailMatchIds = new Set(emailMatches.map(e => e.id))
  const filteredOwned = ownedEntities.filter(e => !emailMatchIds.has(e.id))
  const allShownIds = new Set([...emailMatchIds, ...filteredOwned.map(e => e.id)])
  const filteredSearchResults = searchResults.filter(e => !allShownIds.has(e.id))

  const emailMatchCount = emailMatches.length
  const hasMoreOptions = filteredOwned.length > 0 || true // always show search

  return (
    <div
      className="gba:border-t gba:bg-muted/20 gba:flex gba:flex-col gba:min-h-0 gba:max-h-72 gba:overflow-hidden"
      data-testid={testId}
    >
      {/* Toggle bar — subtle, low-contrast design */}
      <button
        className="gba:flex gba:items-center gba:gap-2.5 gba:w-full gba:px-4 gba:py-2.5 gba:text-sm gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-accent/50 gba:transition-colors"
        onClick={handleToggle}
        data-testid={`${testId}-toggle`}
      >
        <LinkSimpleIcon className="gba:w-4 gba:h-4" weight="bold" />
        <span className="gba:flex-1 gba:text-left gba:font-medium">Record as Activity</span>
        {!isExpanded && emailMatchCount > 0 && (
          <Badge variant="info" className="gba:text-xs">
            {emailMatchCount} match{emailMatchCount !== 1 ? 'es' : ''}
          </Badge>
        )}
        {isExpanded ? (
          <CaretUpIcon className="gba:w-3.5 gba:h-3.5" />
        ) : (
          <CaretDownIcon className="gba:w-3.5 gba:h-3.5" />
        )}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="gba:flex-1 gba:px-4 gba:pb-3 gba:space-y-3 gba:overflow-y-auto gba:min-h-0"
          data-testid={`${testId}-panel`}
        >
          {/* AI Summary indicator */}
          {summaryLoading && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
              <SparkleIcon className="gba:w-3 gba:h-3 gba:animate-pulse" weight="fill" />
              Summarizing email with AI...
            </div>
          )}

          {/* Section 1: Email matches (primary – shown first) */}
          {counterpartyEmails.length > 0 && (
            <div>
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
                Matches for
                <span className="gba:font-normal gba:ml-1">{counterpartyEmails.join(', ')}</span>
              </p>
              {emailLoading ? (
                <LoadingRow label="Searching CRM..." />
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
                      data-testid={`${testId}-email`}
                    />
                  ))}
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                  No CRM records found for this email address
                </p>
              )}
            </div>
          )}

          {/* No counterparty emails at all (e.g. sent-to-self, newsletters) */}
          {counterpartyEmails.length === 0 && !emailLoading && (
            <p className="gba:text-xs gba:text-muted-foreground gba:italic">No counterparty email to match</p>
          )}

          {/* "More options" toggle for owned records + search */}
          {hasMoreOptions && (
            <div>
              <button
                className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                onClick={handleToggleMore}
                data-testid={`${testId}-more-toggle`}
              >
                <DotsThreeIcon className="gba:w-4 gba:h-4" weight="bold" />
                {showMoreOptions ? 'Hide options' : 'Choose a different record'}
                {!showMoreOptions && filteredOwned.length > 0 && (
                  <span className="gba:text-muted-foreground gba:font-normal gba:ml-0.5">
                    ({filteredOwned.length} owned)
                  </span>
                )}
              </button>

              {showMoreOptions && (
                <div className="gba:mt-2 gba:space-y-3">
                  {/* Owned entities */}
                  {(ownedLoading || filteredOwned.length > 0) && (
                    <div>
                      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">Your records</p>
                      {ownedLoading ? (
                        <LoadingRow label="Loading your records..." />
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
                              data-testid={`${testId}-owned`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Search any record */}
                  <div>
                    <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
                      Search any record
                    </p>
                    <div className="gba:relative">
                      <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:pointer-events-none" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search by name..."
                        className="gba:pl-8 gba:h-8 gba:text-sm"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                        data-testid={`${testId}-search-input`}
                      />
                    </div>
                    {searchLoading && <LoadingRow label="Searching..." />}
                    {!searchLoading && filteredSearchResults.length > 0 && (
                      <div className="gba:space-y-1 gba:mt-1.5">
                        {filteredSearchResults.map(entity => (
                          <CrmEntityRow
                            key={entity.id}
                            entity={entity}
                            message={message}
                            accessToken={accessToken}
                            aiSummary={aiSummary}
                            employeeId={employeeId}
                            data-testid={`${testId}-search`}
                          />
                        ))}
                      </div>
                    )}
                    {!searchLoading && searchTerm.trim() && filteredSearchResults.length === 0 && (
                      <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-1">
                        No results for &quot;{searchTerm}&quot;
                      </p>
                    )}
                  </div>

                  {/* Manual record fallback */}
                  <div className="gba:pt-1 gba:border-t">
                    <AppAction
                      contexts={[
                        {
                          context: FlowContextName.customerActivityCreate,
                          contextData: buildManualContextData(message, aiSummary, employeeId)
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
                        Record manually (choose entity in form)
                      </Button>
                    </AppAction>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- Small helper component ---------- */

const LoadingRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
    <Spinner size="sm" />
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
  </div>
)

export default EmailCrmBooking
