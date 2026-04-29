/**
 * EmailCrmEntityPicker – Selection-mode counterpart of EmailCrmRecordingSection.
 * Reuses useEmailCrmSuggestions to show counterparty matches, owned records, and search,
 * but rows act as toggleable "Select / Selected" affordances rather than one-click recorders.
 */

import React, { useCallback, useRef, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Input,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import {
  BriefcaseIcon,
  BuildingsIcon,
  CheckIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  TargetIcon,
  UserIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import translations from '../_i18n'
import { useEmailCrmSuggestions, type CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'
import type { EmailAccount, EmailMessage } from '../types'

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

const LoadingRow: React.FC<{ label: string }> = ({ label }) => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
    <Spinner size="sm" />
    <span className="gba:text-xs gba:text-muted-foreground">{label}</span>
  </div>
)

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

      {counterpartyEmails.length > 0 ? (
        <div>
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
            {t('crm-matches-for')}
            <span className="gba:font-normal gba:ml-1">{counterpartyEmails.join(', ')}</span>
          </p>
          {emailLoading ? (
            <LoadingRow label={t('crm-searching')} />
          ) : emailMatches.length > 0 ? (
            <div className="gba:space-y-1">{emailMatches.map(entity => renderRow(entity, `${testId}-email`))}</div>
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground gba:italic">
              {t('email-suggestion-create-link-record-no-matches')}
            </p>
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
          {showMoreOptions ? t('crm-hide-options') : t('email-suggestion-create-link-record-show-more')}
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
                    {filteredOwned.map(entity => renderRow(entity, `${testId}-owned`))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1.5">
                {t('email-suggestion-create-link-record-search-placeholder')}
              </p>
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
                  {filteredSearchResults.map(entity => renderRow(entity, `${testId}-search`))}
                </div>
              ) : null}
              {!searchLoading && searchTerm.trim() && filteredSearchResults.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic gba:mt-1">
                  {t('crm-no-results', { query: searchTerm })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default EmailCrmEntityPicker
