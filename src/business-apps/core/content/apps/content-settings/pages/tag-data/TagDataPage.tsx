import React, { useState, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TagTable } from './components/TagTable'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { useContentClient } from '@/common/network/content'

export interface TagDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const TagDataPage: React.FC<TagDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [mutationError, setMutationError] = useState<string | null>(null)
  const { options: tags, isLoading, error: fetchError, refetch } = useContentTagOptions(context.accessToken)
  const contentClient = useContentClient(context.accessToken)

  const error = mutationError || (fetchError ? fetchError.message : null)

  const handleCreate = useCallback(
    async (data: { name: string }) => {
      setMutationError(null)
      try {
        await contentClient.createContentTag({ name: data.name })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create tag'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch]
  )

  const handleUpdate = useCallback(
    async (id: string, data: { name: string }) => {
      setMutationError(null)
      try {
        const tagToUpdate = tags.find(tag => tag.id === id)
        if (tagToUpdate?.version == null) {
          throw new Error('Failed to update tag: version is missing')
        }
        await contentClient.updateContentTag({
          id,
          version: tagToUpdate.version,
          name: data.name
        })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tag'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch, tags]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setMutationError(null)
      try {
        const tagToDelete = tags.find(tag => tag.id === id)
        if (tagToDelete?.version == null) {
          throw new Error('Failed to delete tag: version is missing')
        }
        await contentClient.deleteContentTag(id, tagToDelete.version)
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete tag'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch, tags]
  )

  if (isLoading && tags.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      <PageHeader
        title="Content Tags"
        subtitle="Manage tags for content filtering and organization"
        className="gba:mb-6"
        onBack={onBack}
      />
      <div className="gba:p-6">
        <TagTable
          tags={tags}
          isLoading={isLoading}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onRetry={refetch}
          prefixDataTestId={`${prefixDataTestId}-table`}
        />
      </div>
    </div>
  )
}

export default TagDataPage
