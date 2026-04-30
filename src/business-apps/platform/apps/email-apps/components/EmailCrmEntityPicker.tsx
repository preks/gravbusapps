/**
 * EmailCrmEntityPicker – Selection-mode counterpart of EmailCrmRecordingSection.
 * Reuses useEmailCrmSuggestions to show counterparty matches, owned records, and search,
 * but rows act as toggleable "Select / Selected" affordances rather than one-click recorders.
 */

import React, { useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, useTranslation } from '@newwork/nw-design-system'
import { BriefcaseIcon, BuildingsIcon, CheckIcon, TargetIcon, UserIcon, XCircleIcon } from '@phosphor-icons/react'
import translations from '../_i18n'
import type { CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'
import type { EmailAccount, EmailMessage } from '../types'
import { EmailCrmSuggestionContainer, buildEmailCrmSuggestionLabels } from './EmailCrmSuggestionSections'

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

      <EmailCrmSuggestionContainer
        message={message}
        accessToken={accessToken}
        activeAccount={activeAccount}
        employeeId={employeeId}
        labels={buildEmailCrmSuggestionLabels(t, 'picker')}
        renderRow={renderRow}
        t={t}
        testId={testId}
      />
    </div>
  )
}

export default EmailCrmEntityPicker
