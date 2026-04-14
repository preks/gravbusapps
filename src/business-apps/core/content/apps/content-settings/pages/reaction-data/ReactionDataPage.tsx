import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CONTENT_REACTION_IDENTIFIER } from '@/common/data/content/constants/contentCatalogs'
import { ReactionTable } from './components/ReactionTable'
import { useCatalogEntries, type CatalogEntry } from '@/common/data/catalog'
import { useContentClient, type ContentReactionPayload } from '@/common/network/content'

export interface ReactionDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const ReactionDataPage: React.FC<ReactionDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [reactions, setReactions] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const contentClient = useContentClient(context.accessToken)

  const loadReactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(CONTENT_REACTION_IDENTIFIER, {
        limit: 100,
        offset: 0
      })
      // Filter to show only parent reactions (no skin tone variants)
      const parentReactions = result.entries.filter(entry => !entry.parentEntryId)
      setReactions(parentReactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reactions')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    loadReactions()
  }, [loadReactions])

  const handleCreate = async (data: ContentReactionPayload | ContentReactionPayload[]) => {
    if (Array.isArray(data)) {
      for (const variant of data) {
        await contentClient.createContentReaction(variant)
      }
    } else {
      await contentClient.createContentReaction(data)
    }
    await loadReactions()
  }

  const handleUpdate = async (id: string, data: ContentReactionPayload) => {
    await contentClient.updateContentReaction(id, data)
    await loadReactions()
  }

  const handleDelete = async (id: string) => {
    // First, find all children of this parent
    const result = await fetchCatalogEntriesByIdentifier(CONTENT_REACTION_IDENTIFIER, {
      limit: 1000,
      offset: 0
    })

    const children = result.entries.filter(entry => entry.parentEntryId === id)

    for (const child of children) {
      await contentClient.deleteContentReaction(child.id)
    }

    await contentClient.deleteContentReaction(id)

    await loadReactions()
  }

  if (isLoading && reactions.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId}>
      <PageHeader
        title="Content Reactions"
        subtitle="Manage emoji and custom reactions for user engagement"
        className="gba:mb-6"
        onBack={onBack}
      />
      <div className="gba:p-6">
        <ReactionTable
          reactions={reactions}
          isLoading={isLoading}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onRetry={loadReactions}
          prefixDataTestId={`${prefixDataTestId}-table`}
        />
      </div>
    </div>
  )
}

export default ReactionDataPage
