/**
 * EmailCrmEntityPicker – Selection-mode counterpart of EmailCrmRecordingSection.
 * Reuses useEmailCrmSuggestions to show counterparty matches, owned records, and search,
 * but rows act as toggleable "Select / Selected" affordances rather than one-click recorders.
 */

import React, { useCallback, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, useTranslation } from '@newwork/nw-design-system'
import { BriefcaseIcon, BuildingsIcon, CheckIcon, TargetIcon, UserIcon, XCircleIcon } from '@phosphor-icons/react'
import translations from '../_i18n'
import { useEmailCrmSuggestions, type CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'
import type { EmailAccount, EmailMessage } from '../types'
import { EmailCrmSuggestionPanel } from './EmailCrmSuggestionSections'

interface EmailCrmEntityPickerProps {
  message: EmailMessage
  accessToken: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  selectedEntity: CrmEntityMatch | null
  onSelectEntity: (entity: CrmEntityMatch | null) => void
  'data-testid'?: string
}

const ENTITY_ICONS: Record<CrmEntityMatch['type'], React.FC<any>> = {
  account: BuildingsIcon,
  contact: UserIcon,
  opportunity: BriefcaseIcon,
  lead: TargetIcon
}

const ENTITY_LABEL_KEYS: Record<CrmEntityMatch['type'], string> = {
  account: 'crm-entity-account',
  contact: 'crm-entity-contact',
  opportunity: 'crm-entity-opportunity',
  lead: 'crm-entity-lead'
}

const getInitials = (name: string): string =>
  (name || '?')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

interface PickerRowProps {
  entity: CrmEntityMatch
  isSelected: boolean
  onToggle: (entity: CrmEntityMatch) => void
  selectLabel: string
  selectedLabel: string
  entityTypeLabel: string
  testId: string
}

const PickerRow: React.FC<PickerRowProps> = ({
  entity,
  isSelected,
  onToggle,
  selectLabel,
  selectedLabel,
  entityTypeLabel,
  testId
}) => {
  const Icon = ENTITY_ICONS[entity.type] || UserIcon
  const initials = getInitials(entity.name)

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2.5 gba:px-2 gba:py-1.5 gba:rounded gba:bg-muted/30${
        isSelected ? ' gba:ring-1 gba:ring-primary' : ''
      }`}
      data-testid={`${testId}-${entity.id}`}
    >
      <Avatar className="gba:h-7 gba:w-7 gba:flex-shrink-0">
        {entity.pictureThumbnail ? (
          <AvatarImage src={`data:image/jpeg;base64,${entity.pictureThumbnail}`} alt={entity.name} />
        ) : (
          <AvatarFallback className="gba:text-xs">
            {entity.type === 'account' || entity.type === 'opportunity' ? (
              <Icon className="gba:w-3.5 gba:h-3.5" />
            ) : (
              initials
            )}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{entity.name}</p>
          <Badge className="gba:text-[10px] gba:flex-shrink-0">{entityTypeLabel}</Badge>
        </div>
        {entity.email && <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{entity.email}</p>}
      </div>

      <Button
        type="button"
        variant={isSelected ? 'default' : 'outline'}
        size="sm"
        onClick={() => onToggle(entity)}
        data-testid={`${testId}-toggle-${entity.id}`}
        aria-pressed={isSelected}
      >
        {isSelected ? (
          <>
            <CheckIcon className="gba:w-3.5 gba:h-3.5 gba:mr-1" weight="bold" />
            {selectedLabel}
          </>
        ) : (
          selectLabel
        )}
      </Button>
    </div>
  )
}

export const EmailCrmEntityPicker: React.FC<EmailCrmEntityPickerProps> = ({
  message,
  accessToken,
  activeAccount,
  employeeId,
  selectedEntity,
  onSelectEntity,
  'data-testid': testId = 'email-crm-entity-picker'
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

  const handleToggleEntity = useCallback(
    (entity: CrmEntityMatch) => {
      if (selectedEntity?.id === entity.id) {
        onSelectEntity(null)
      } else {
        onSelectEntity(entity)
      }
    },
    [selectedEntity, onSelectEntity]
  )

  const handleClearSelection = useCallback(() => {
    onSelectEntity(null)
  }, [onSelectEntity])

  const handleToggleMore = useCallback(() => {
    setShowMoreOptions(prev => !prev)
  }, [])

  const emailMatchIds = new Set(emailMatches.map(e => e.id))
  const filteredOwned = ownedEntities.filter(e => !emailMatchIds.has(e.id))
  const allShownIds = new Set([...emailMatchIds, ...filteredOwned.map(e => e.id)])
  const filteredSearchResults = searchResults.filter(e => !allShownIds.has(e.id))

  const selectLabel = t('email-suggestion-create-link-record-select')
  const selectedLabel = t('email-suggestion-create-link-record-selected')

  const renderRow = (entity: CrmEntityMatch, rowTestIdPrefix: string) => (
    <PickerRow
      key={entity.id}
      entity={entity}
      isSelected={selectedEntity?.id === entity.id}
      onToggle={handleToggleEntity}
      selectLabel={selectLabel}
      selectedLabel={selectedLabel}
      entityTypeLabel={t(ENTITY_LABEL_KEYS[entity.type])}
      testId={rowTestIdPrefix}
    />
  )

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-muted-foreground">
          {t('email-suggestion-create-link-record-title')}
        </p>
        {selectedEntity ? (
          <button
            type="button"
            className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
            onClick={handleClearSelection}
            data-testid={`${testId}-clear`}
          >
            <XCircleIcon className="gba:w-3.5 gba:h-3.5" />
            {t('email-suggestion-create-link-record-none')}
          </button>
        ) : null}
      </div>

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
          empty: t('email-suggestion-create-link-record-no-matches'),
          noCounterparty: t('crm-no-counterparty'),
          hideOptions: t('crm-hide-options'),
          showOptions: t('email-suggestion-create-link-record-show-more'),
          ownedCount: filteredOwned.length > 0 ? t('crm-owned-count', { count: filteredOwned.length }) : null,
          yourRecords: t('crm-your-records'),
          loadingRecords: t('crm-loading-records'),
          searchTitle: t('email-suggestion-create-link-record-search-placeholder'),
          searchPlaceholder: t('crm-search-placeholder'),
          searchLoading: t('crm-search-loading'),
          noResults: query => t('crm-no-results', { query })
        }}
        renderRow={renderRow}
        testId={testId}
      />
    </div>
  )
}

export default EmailCrmEntityPicker
