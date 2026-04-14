import React, { useState, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TypeTable } from './components/TypeTable'
import { useContentTypeOptions } from '@/common/data/content/hooks/useContentTypeOptions'
import { useContentClient } from '@/common/network/content'

export interface TypeDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const TypeDataPage: React.FC<TypeDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [mutationError, setMutationError] = useState<string | null>(null)
  const { options: types, isLoading, error: fetchError, refetch } = useContentTypeOptions(context.accessToken)
  const contentClient = useContentClient(context.accessToken)

  const error = mutationError || (fetchError ? fetchError.message : null)

  const handleCreate = useCallback(
    async (data: { name: string; contentGroup: string }) => {
      setMutationError(null)
      try {
        await contentClient.createContentType({
          name: data.name,
          contentGroup: data.contentGroup
        })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create content type'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch]
  )

  const handleUpdate = useCallback(
    async (id: string, data: { name: string; contentGroup: string }) => {
      setMutationError(null)
      try {
        const typeToUpdate = types.find(type => type.id === id)
        if (typeToUpdate?.version == null) {
          throw new Error('Failed to update content type: version is missing')
        }
        await contentClient.updateContentType({
          id,
          version: typeToUpdate.version,
          name: data.name,
          contentGroup: data.contentGroup
        })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update content type'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch, types]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setMutationError(null)
      try {
        const typeToDelete = types.find(type => type.id === id)
        if (typeToDelete?.version == null) {
          throw new Error('Failed to delete content type: version is missing')
        }
        await contentClient.deleteContentType(id, typeToDelete.version)
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete content type'
        setMutationError(message)
        throw err
      }
    },
    [contentClient, refetch, types]
  )

  if (isLoading && types.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      <PageHeader
        title="Content Types"
        subtitle="Define different types of content entries (articles, announcements, etc.)"
        className="gba:mb-6"
        onBack={onBack}
      />
      <div className="gba:p-6">
        <TypeTable
          types={types}
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

export default TypeDataPage
