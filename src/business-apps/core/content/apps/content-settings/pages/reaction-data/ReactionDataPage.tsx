import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader, Button, Spinner } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ReactionTable } from './components/ReactionTable'
import {
  useCatalogEntries,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
  type CatalogEntry
} from '@/common/data/catalog'

export interface ReactionDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const CATALOG_IDENTIFIER = 'ContentReaction'
const CATALOG_VERSION = 'v1'

const ReactionDataPage: React.FC<ReactionDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [reactions, setReactions] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const { createCatalogEntry } = useCreateCatalogEntry({ accessToken: context.accessToken })
  const { updateCatalogEntry } = useUpdateCatalogEntry({ accessToken: context.accessToken })
  const { deleteCatalogEntry } = useDeleteCatalogEntry({ accessToken: context.accessToken })

  const loadReactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
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

  const handleCreate = async (data: any) => {
    // Check if data is an array (multiple skin tone variants)
    if (Array.isArray(data)) {
      // Create all variants
      for (const variant of data) {
        await createCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, {
          type: variant.type,
          code: variant.code,
          parentEntryId: variant.parentEntryId || undefined,
          value: variant.value,
          description: variant.description,
          additionalValue1: variant.additionalValue1,
          additionalValue2: variant.additionalValue2,
          additionalValue3: variant.additionalValue3,
          alternativeCode: variant.alternativeCode,
          displayOrder: variant.displayOrder,
          objectValue: variant.objectValue,
          valueTranslations: {},
          additionalValue1Translations: {},
          additionalValue2Translations: {},
          additionalValue3Translations: {}
        })
      }
    } else {
      // Single entry
      await createCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, {
        type: data.type,
        code: data.code,
        parentEntryId: data.parentEntryId || undefined,
        value: data.value,
        description: data.description,
        additionalValue1: data.additionalValue1,
        additionalValue2: data.additionalValue2,
        additionalValue3: data.additionalValue3,
        alternativeCode: data.alternativeCode,
        displayOrder: data.displayOrder,
        objectValue: data.objectValue,
        valueTranslations: {},
        additionalValue1Translations: {},
        additionalValue2Translations: {},
        additionalValue3Translations: {}
      })
    }
    await loadReactions()
  }

  const handleUpdate = async (id: string, data: any) => {
    await updateCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, id, {
      type: data.type,
      code: data.code,
      parentEntryId: data.parentEntryId || undefined,
      value: data.value,
      description: data.description,
      additionalValue1: data.additionalValue1,
      additionalValue2: data.additionalValue2,
      additionalValue3: data.additionalValue3,
      alternativeCode: data.alternativeCode,
      displayOrder: data.displayOrder,
      objectValue: data.objectValue,
      valueTranslations: {},
      additionalValue1Translations: {},
      additionalValue2Translations: {},
      additionalValue3Translations: {}
    })
    await loadReactions()
  }

  const handleDelete = async (id: string) => {
    // First, find all children of this parent
    const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
      limit: 1000,
      offset: 0
    })

    const children = result.entries.filter(entry => entry.parentEntryId === id)

    // Delete all children first
    for (const child of children) {
      await deleteCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, child.id)
    }

    // Then delete the parent
    await deleteCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, id)

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
    <div data-testid={prefixDataTestId} className="gba:p-6">
      <PageHeader
        title="Content Reactions"
        description="Manage emoji and custom reactions for user engagement"
        className="gba:mb-6"
      >
        {onBack && (
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-back-button`}>
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back
          </Button>
        )}
      </PageHeader>

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
  )
}

export default ReactionDataPage
