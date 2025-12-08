import React from 'react'
import { EntityCard } from './EntityCard'
import { useContentEntry } from '@/common/data/content/hooks'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface ContentEntryDisplayProps {
  contentEntryId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

export const ContentEntryDisplay: React.FC<ContentEntryDisplayProps> = ({ contentEntryId, accessToken, operation }) => {
  const { entry, isLoading, error } = useContentEntry(contentEntryId, {
    includeChildren: false,
    accessToken
  })

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (!contentEntryId) {
      return
    }

    const url = buildPlatformUrl('/platform/content/intranet/content-record', {
      contentId: contentEntryId,
      source: 'every-ai'
    })

    navigateTo(url)
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-primary-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    </div>
  )

  const createdField =
    entry?.formattedCreatedAt != null ? [{ label: 'Created', value: entry.formattedCreatedAt }] : undefined

  const categories = entry?.categoryNames && entry.categoryNames.length > 0 ? entry.categoryNames.join(', ') : undefined

  return (
    <EntityCard
      title={entry?.title || 'Content Entry'}
      subtitle={categories}
      description={entry?.preview || undefined}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={createdField}
      isLoading={isLoading}
      error={error?.message}
      onClick={handleClick}
      data-testid="content-entry-display"
    />
  )
}

export default ContentEntryDisplay
