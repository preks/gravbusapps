import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import { ContentGroup } from '@/common/data/content/types/contentEnums'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const CONTENT_GROUP_OPTIONS: { value: ContentGroup; label: string }[] = [
  { value: ContentGroup.NEWS, label: 'News' },
  { value: ContentGroup.KNOWLEDGE, label: 'Knowledge' },
  { value: ContentGroup.POLICY, label: 'Policies' },
  { value: ContentGroup.DOCUMENT, label: 'Document' },
  { value: ContentGroup.QUESTION, label: 'Question' },
  { value: ContentGroup.GLOSSARY, label: 'Glossary' }
]

export interface ContentGroupChangePopupProps extends BusinessAppContextProps {
  onClose: () => void
  onSuccess?: () => void
  onError?: (error: unknown) => void
  'data-testid'?: string
}

/**
 * ContentGroupChangePopup
 * Flow popup to move a content entry to another group.
 * - Loads content entry from context (additionalData.contentEntryId)
 * - Shows group selector; on submit returns contentEntry payload (id, version, contentGroup)
 * - When registered as flow target (e.g. targetDesktop "content-group-change-popup"), available wherever the flow is used
 */
export const ContentGroupChangePopup: React.FC<ContentGroupChangePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'content-group-change-popup'
}) => {
  const contentEntryId =
    additionalData?.contentEntryId || additionalData?.psi_taskPayload?.psi_initialParameters?.contentEntryId

  const queryOptions = useMemo(
    () => ({
      fields: ['id', 'version', 'contentGroup'] as Array<'id' | 'version' | 'contentGroup'>
    }),
    []
  )

  const { entry, isLoading, error } = useContentEntry(contentEntryId || '', {
    accessToken,
    queryOptions
  })

  const [selectedGroup, setSelectedGroup] = useState<string>('')

  const currentGroup = entry?.contentGroup ?? ''
  const availableGroups = useMemo(() => CONTENT_GROUP_OPTIONS.filter(opt => opt.value !== currentGroup), [currentGroup])

  const handleSubmit = async () => {
    if (!entry?.id) {
      throw new Error('Content entry not loaded')
    }
    if (!selectedGroup) {
      throw new Error('Please select a group')
    }

    return {
      contentEntry: {
        id: entry.id,
        ...(entry.version !== undefined && entry.version !== null ? { version: entry.version } : {}),
        contentGroup: selectedGroup
      }
    }
  }

  const handleProcessCompletion = () => {
    onSuccess?.()
    onClose()
  }

  if (!contentEntryId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'content.groupChange.missingId',
            'Content entry ID not found. Cannot change group.'
          )}
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('content.loading', 'Loading content entry...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'content.groupChange.loadError',
            'Failed to load content entry. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!entry) {
    return null
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={`${dataTestId}-form`}
    >
      <div className="gba:space-y-4 gba:p-6" data-testid={`${dataTestId}-content`}>
        <p className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'content.groupChange.description',
            'Select the target group for this content entry.'
          )}
        </p>
        <div className="gba:space-y-2">
          <label className="gba:text-sm gba:font-medium gba:leading-none gba:peer-disabled:gba:cursor-not-allowed gba:peer-disabled:gba:opacity-70">
            {getTranslationFromI18nKeyAndLabel('content.groupChange.targetGroup', 'Target group')}
          </label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger data-testid={`${dataTestId}-group-select`}>
              <SelectValue
                placeholder={getTranslationFromI18nKeyAndLabel('content.groupChange.selectPlaceholder', 'Select group')}
              />
            </SelectTrigger>
            <SelectContent>
              {availableGroups.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppActionForm>
  )
}

export default ContentGroupChangePopup
