import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TagTable } from './components/TagTable'
import {
  useCatalogEntries,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
  type CatalogEntry
} from '@/common/data/catalog'

export interface TagDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const CATALOG_IDENTIFIER = 'ContentTag'
const CATALOG_VERSION = 'v1'

const TagDataPage: React.FC<TagDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [tags, setTags] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const { createCatalogEntry } = useCreateCatalogEntry({ accessToken: context.accessToken })
  const { updateCatalogEntry } = useUpdateCatalogEntry({ accessToken: context.accessToken })
  const { deleteCatalogEntry } = useDeleteCatalogEntry({ accessToken: context.accessToken })

  const loadTags = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
        limit: 100,
        offset: 0
      })
      setTags(result.entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  const handleCreate = async (data: any) => {
    await createCatalogEntry({
      catalogIdentifier: CATALOG_IDENTIFIER,
      catalogVersion: CATALOG_VERSION,
      entry: {
        code: data.code,
        value: data.value,
        displayOrder: data.displayOrder,
        additionalValue1: data.color, // Color hex
        translations: []
      }
    })
    await loadTags()
  }

  const handleUpdate = async (id: string, data: any) => {
    await updateCatalogEntry({
      entryId: id,
      entry: {
        code: data.code,
        value: data.value,
        displayOrder: data.displayOrder,
        additionalValue1: data.color,
        translations: []
      }
    })
    await loadTags()
  }

  const handleDelete = async (id: string) => {
    await deleteCatalogEntry({ entryId: id })
    await loadTags()
  }

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
          onRetry={loadTags}
          prefixDataTestId={`${prefixDataTestId}-table`}
        />
      </div>
    </div>
  )
}

export default TagDataPage
