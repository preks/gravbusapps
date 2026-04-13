import React, { useState, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TagTable } from './components/TagTable'
import { useContentTagOptions } from '@/common/data/content/hooks/useContentTagOptions'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInsertContentTagMutation,
  buildUpdateContentTagMutation,
  buildDeleteContentTagMutation
} from '@/common/data/content/queries/contentQueries'
import type { ContentTag } from '@/common/data/content/types/contentTypes'

export interface TagDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const TagDataPage: React.FC<TagDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [mutationError, setMutationError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const { options: tags, isLoading, error: fetchError, refetch } = useContentTagOptions(context.accessToken)

  const error = mutationError || (fetchError ? fetchError.message : null)

  const handleCreate = useCallback(
    async (data: { name: string }) => {
      setMutationError(null)
      try {
        await graphqlClient.request<{ InsertContentTagOne: ContentTag }>(buildInsertContentTagMutation(), {
          name: data.name
        })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create tag'
        setMutationError(message)
        throw err
      }
    },
    [graphqlClient, refetch]
  )

  const handleUpdate = useCallback(
    async (id: string, data: { name: string }) => {
      setMutationError(null)
      try {
        await graphqlClient.request<{ UpdateContentTagByPk: ContentTag }>(buildUpdateContentTagMutation(), {
          id,
          name: data.name
        })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tag'
        setMutationError(message)
        throw err
      }
    },
    [graphqlClient, refetch]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setMutationError(null)
      try {
        await graphqlClient.request(buildDeleteContentTagMutation(), { id })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete tag'
        setMutationError(message)
        throw err
      }
    },
    [graphqlClient, refetch]
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
