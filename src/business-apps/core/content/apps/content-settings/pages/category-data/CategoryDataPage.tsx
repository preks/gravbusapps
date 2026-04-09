import React, { useState, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CategoryTable } from './components/CategoryTable'
import { useContentCategoryOptions } from '@/common/data/content/hooks/useContentCategoryOptions'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildInsertContentCategoryMutation,
  buildUpdateContentCategoryMutation,
  buildDeleteContentCategoryMutation
} from '@/common/data/content/queries/contentQueries'
import type { ContentCategory } from '@/common/data/content/types/contentTypes'

export interface CategoryDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const CategoryDataPage: React.FC<CategoryDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [mutationError, setMutationError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const { options: categories, isLoading, error: fetchError, refetch } = useContentCategoryOptions(context.accessToken)

  const error = mutationError || (fetchError ? fetchError.message : null)

  const handleCreate = useCallback(
    async (data: { name: string }) => {
      setMutationError(null)
      try {
        await graphqlClient.request<{ InsertContentCategoryOne: ContentCategory }>(
          buildInsertContentCategoryMutation(),
          { name: data.name }
        )
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create category'
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
        await graphqlClient.request<{ UpdateContentCategoryByPk: ContentCategory }>(
          buildUpdateContentCategoryMutation(),
          { id, name: data.name }
        )
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update category'
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
        await graphqlClient.request(buildDeleteContentCategoryMutation(), { id })
        await refetch()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete category'
        setMutationError(message)
        throw err
      }
    },
    [graphqlClient, refetch]
  )

  if (isLoading && categories.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      <PageHeader
        title="Content Categories"
        subtitle="Manage content categories for organizing articles and entries"
        className="gba:mb-6"
        onBack={onBack}
      />
      <div className="gba:p-6">
        <CategoryTable
          categories={categories}
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

export default CategoryDataPage
