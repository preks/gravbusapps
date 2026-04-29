import React from 'react'
import { Input, Spinner } from '@newwork/nw-design-system'
import { DotsThreeIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'

export const EmailCrmLoadingRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
    <Spinner size="sm" />
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
  </div>
)

interface EmailCrmCounterpartySectionProps {
  counterpartyEmails: string[]
  emailLoading: boolean
  emailMatches: CrmEntityMatch[]
  renderRow: (entity: CrmEntityMatch, rowTestIdPrefix: string) => React.ReactNode
  labels: {
    matchesFor: string
    searching: string
    empty: string
    noCounterparty: string
  }
  testId: string
}

export const EmailCrmCounterpartySection: React.FC<EmailCrmCounterpartySectionProps> = ({
  counterpartyEmails,
  emailLoading,
  emailMatches,
  renderRow,
  labels,
  testId
}) => {
  if (counterpartyEmails.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground gba:italic">{labels.noCounterparty}</p>
  }

  let content: React.ReactNode = <p className="gba:text-xs gba:text-muted-foreground gba:italic">{labels.empty}</p>

  if (emailLoading) {
    content = <EmailCrmLoadingRow label={labels.searching} />
  } else if (emailMatches.length > 0) {
    content = <div className="gba:space-y-1">{emailMatches.map(entity => renderRow(entity, `${testId}-email`))}</div>
  }

  return (
    <div>
      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
        {labels.matchesFor}
        <span className="gba:font-normal gba:ml-1">{counterpartyEmails.join(', ')}</span>
      </p>
      {content}
    </div>
  )
}

interface EmailCrmMoreOptionsContentProps {
  showMoreOptions: boolean
  ownedLoading: boolean
  filteredOwned: CrmEntityMatch[]
  searchLoading: boolean
  searchTerm: string
  filteredSearchResults: CrmEntityMatch[]
  searchInputRef: React.RefObject<HTMLInputElement>
  handleSearch: (value: string) => void
  renderRow: (entity: CrmEntityMatch, rowTestIdPrefix: string) => React.ReactNode
  labels: {
    yourRecords: string
    loadingRecords: string
    searchTitle: string
    searchPlaceholder: string
    searchLoading: string
    noResults: (query: string) => string
  }
  manualRecordAction?: React.ReactNode
  testId: string
}

export const EmailCrmMoreOptionsContent: React.FC<EmailCrmMoreOptionsContentProps> = ({
  showMoreOptions,
  ownedLoading,
  filteredOwned,
  searchLoading,
  searchTerm,
  filteredSearchResults,
  searchInputRef,
  handleSearch,
  renderRow,
  labels,
  manualRecordAction,
  testId
}) => {
  if (!showMoreOptions) {
    return null
  }

  const hasOwnedSection = ownedLoading || filteredOwned.length > 0
  const hasSearchResults = !searchLoading && filteredSearchResults.length > 0
  const hasNoSearchResults = !searchLoading && Boolean(searchTerm.trim()) && filteredSearchResults.length === 0

  return (
    <div className="gba:mt-2 gba:space-y-3">
      {hasOwnedSection ? (
        <div>
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">{labels.yourRecords}</p>
          {ownedLoading ? (
            <EmailCrmLoadingRow label={labels.loadingRecords} />
          ) : (
            <div className="gba:space-y-1">{filteredOwned.map(entity => renderRow(entity, `${testId}-owned`))}</div>
          )}
        </div>
      ) : null}

      <div>
        <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">{labels.searchTitle}</p>
        <div className="gba:relative">
          <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:w-3.5 gba:h-3.5 gba:text-muted-foreground gba:pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder={labels.searchPlaceholder}
            className="gba:pl-8 gba:h-8 gba:text-sm"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            data-testid={`${testId}-search-input`}
          />
        </div>
        {searchLoading ? <EmailCrmLoadingRow label={labels.searchLoading} /> : null}
        {hasSearchResults ? (
          <div className="gba:space-y-1 gba:mt-1.5">
            {filteredSearchResults.map(entity => renderRow(entity, `${testId}-search`))}
          </div>
        ) : null}
        {hasNoSearchResults ? (
          <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-1">{labels.noResults(searchTerm)}</p>
        ) : null}
      </div>

      {manualRecordAction}
    </div>
  )
}

interface EmailCrmSuggestionPanelProps {
  counterpartyEmails: string[]
  emailLoading: boolean
  emailMatches: CrmEntityMatch[]
  showMoreOptions: boolean
  ownedLoading: boolean
  filteredOwned: CrmEntityMatch[]
  searchLoading: boolean
  searchTerm: string
  filteredSearchResults: CrmEntityMatch[]
  searchInputRef: React.RefObject<HTMLInputElement>
  onToggleMore: () => void
  handleSearch: (value: string) => void
  renderRow: (entity: CrmEntityMatch, rowTestIdPrefix: string) => React.ReactNode
  labels: {
    matchesFor: string
    searching: string
    empty: string
    noCounterparty: string
    hideOptions: string
    showOptions: string
    ownedCount: string | null
    yourRecords: string
    loadingRecords: string
    searchTitle: string
    searchPlaceholder: string
    searchLoading: string
    noResults: (query: string) => string
  }
  manualRecordAction?: React.ReactNode
  testId: string
}

export const EmailCrmSuggestionPanel: React.FC<EmailCrmSuggestionPanelProps> = ({
  counterpartyEmails,
  emailLoading,
  emailMatches,
  showMoreOptions,
  ownedLoading,
  filteredOwned,
  searchLoading,
  searchTerm,
  filteredSearchResults,
  searchInputRef,
  onToggleMore,
  handleSearch,
  renderRow,
  labels,
  manualRecordAction,
  testId
}) => (
  <>
    <EmailCrmCounterpartySection
      counterpartyEmails={counterpartyEmails}
      emailLoading={emailLoading}
      emailMatches={emailMatches}
      renderRow={renderRow}
      labels={labels}
      testId={testId}
    />

    <div>
      <button
        type="button"
        className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
        onClick={onToggleMore}
        data-testid={`${testId}-more-toggle`}
      >
        <DotsThreeIcon className="gba:w-4 gba:h-4" weight="bold" />
        {showMoreOptions ? labels.hideOptions : labels.showOptions}
        {!showMoreOptions && labels.ownedCount ? (
          <span className="gba:text-muted-foreground gba:font-normal gba:ml-0.5">{labels.ownedCount}</span>
        ) : null}
      </button>

      <EmailCrmMoreOptionsContent
        showMoreOptions={showMoreOptions}
        ownedLoading={ownedLoading}
        filteredOwned={filteredOwned}
        searchLoading={searchLoading}
        searchTerm={searchTerm}
        filteredSearchResults={filteredSearchResults}
        searchInputRef={searchInputRef}
        handleSearch={handleSearch}
        renderRow={renderRow}
        labels={labels}
        manualRecordAction={manualRecordAction}
        testId={testId}
      />
    </div>
  </>
)
