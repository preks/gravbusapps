import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader, Button, Spinner } from '@newwork/nw-design-system'
import { ArrowLeft } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TypeTable } from './components/TypeTable'
import {
  useCatalogEntries,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
  type CatalogEntry
} from '@/common/data/catalog'

export interface TypeDataPageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onBack?: () => void
}

const CATALOG_IDENTIFIER = 'ContentType'
const CATALOG_VERSION = 'v1'

const TypeDataPage: React.FC<TypeDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const [types, setTypes] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const { createCatalogEntry } = useCreateCatalogEntry({ accessToken: context.accessToken })
  const { updateCatalogEntry } = useUpdateCatalogEntry({ accessToken: context.accessToken })
  const { deleteCatalogEntry } = useDeleteCatalogEntry({ accessToken: context.accessToken })

  const loadTypes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
        limit: 100,
        offset: 0
      })
      setTypes(result.entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content types')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  const handleCreate = async (data: any) => {
    await createCatalogEntry({
      catalogIdentifier: CATALOG_IDENTIFIER,
      catalogVersion: CATALOG_VERSION,
      entry: {
        code: data.code,
        value: data.value,
        description: data.description,
        displayOrder: data.displayOrder,
        translations: []
      }
    })
    await loadTypes()
  }

  const handleUpdate = async (id: string, data: any) => {
    await updateCatalogEntry({
      entryId: id,
      entry: {
        code: data.code,
        value: data.value,
        description: data.description,
        displayOrder: data.displayOrder,
        translations: []
      }
    })
    await loadTypes()
  }

  const handleDelete = async (id: string) => {
    await deleteCatalogEntry({ entryId: id })
    await loadTypes()
  }

  if (isLoading && types.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={prefixDataTestId} className="gba:p-6">
      <PageHeader
        title="Content Types"
        description="Define different types of content entries (articles, announcements, etc.)"
        className="gba:mb-6"
      >
        {onBack && (
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-back-button`}>
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back
          </Button>
        )}
      </PageHeader>

      <TypeTable
        types={types}
        isLoading={isLoading}
        error={error}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onRetry={loadTypes}
        prefixDataTestId={`${prefixDataTestId}-table`}
      />
    </div>
  )
}

export default TypeDataPage
