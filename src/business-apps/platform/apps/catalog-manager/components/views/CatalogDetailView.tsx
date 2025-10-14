import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Separator } from '@newwork/nw-design-system'
import { FloppyDiskIcon, GearIcon, FileTextIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Catalog, useCatalog, useUpdateCatalog } from '@/common/data/catalog'
import { CatalogManagement } from '@/common/types/CatalogTypes'
import { CatalogHeaderForm } from '../forms/CatalogHeader'
import { CatalogEntryTable } from '../tables/CatalogEntryTable'

interface CatalogDetailViewProps extends BusinessAppContextProps {
  catalog: Catalog
  onBack: () => void
  onViewCatalog?: (catalog: Catalog) => void
  isLoading?: boolean
  'data-testid'?: string
}

interface CatalogDetailState {
  headerData: Catalog
  isDirty: boolean
  isSaving: boolean
  error: string | null
  isHeaderExpanded: boolean
}

export const CatalogDetailView: React.FC<CatalogDetailViewProps> = ({
  catalog,
  onBack,
  onViewCatalog,
  isLoading = false,
  'data-testid': dataTestId = 'CatalogDetailView',
  ...context
}) => {
  const [state, setState] = useState<CatalogDetailState>({
    headerData: { ...catalog },
    isDirty: false,
    isSaving: false,
    error: null,
    isHeaderExpanded: false
  })

  const { fetchCatalog } = useCatalog(context)
  const { updateCatalog } = useUpdateCatalog(context)
  const [prefetchedEntries, setPrefetchedEntries] = useState<{ entries: any[]; totalCount: number } | null>(null)

  // Load full catalog data locally
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const identifier = catalog.identifier || catalog.name
      const version = catalog.version || 'v1'
      const full = await fetchCatalog(
        { identifier, version, entriesLimit: 100, entriesOffset: 0 },
        { includeCatalogEntries: true, includeChildCatalogEntries: true, includeParentCatalogEntry: true }
      )
      if (isMounted && full) {
        setState(prev => ({
          ...prev,
          headerData: full
        }))
        setPrefetchedEntries({ entries: full.entries || [], totalCount: full.total || full.entries?.length || 0 })
      } else if (isMounted) {
        setState(prev => ({ ...prev, headerData: { ...catalog } }))
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [catalog.identifier, catalog.version, fetchCatalog])

  // Get active tab from URL
  // No longer need tab URL management

  const handleToggleHeader = useCallback(() => {
    setState(prev => ({ ...prev, isHeaderExpanded: !prev.isHeaderExpanded }))
  }, [])

  const handleHeaderDataChange = useCallback((field: string, value: any) => {
    setState(prev => ({
      ...prev,
      headerData: { ...prev.headerData, [field]: value },
      isDirty: true
    }))
  }, [])

  const handleSave = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      await updateCatalog(state.headerData.identifier, state.headerData.version || 'v1', {
        // Required by API body
        id: state.headerData.id,
        identifier: state.headerData.identifier,
        version: state.headerData.version || 'v1',

        // Parent linkage
        parentId: state.headerData.parentId,
        parentName: (state.headerData as any).parentName,

        // Editable fields
        name: state.headerData.name,
        validFrom: state.headerData.validFrom,
        validTo: state.headerData.validTo,
        defaultLocale: state.headerData.defaultLocale,
        description: state.headerData.description,

        // Optional/system fields (pass-through if present)
        createdAt: state.headerData.createdAt,
        createdBy: state.headerData.createdBy,
        updatedAt: state.headerData.updatedAt,
        updatedBy: state.headerData.updatedBy,
        deletedAt: (state.headerData as any).deletedAt,
        isDeleted: state.headerData.isDeleted,
        recordState: state.headerData.recordState,
        schemaDefinition: state.headerData.schemaDefinition as any
      } as CatalogManagement)

      setState(prev => ({
        ...prev,
        isSaving: false,
        isDirty: false
      }))
    } catch (err) {
      console.error('Error saving catalog:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to save catalog',
        isSaving: false
      }))
    }
  }, [state.headerData, updateCatalog])

  // Removed unused CSV handlers; handled within entry table actions

  if (state.error) {
    return (
      <div className="gba:p-6" data-testid={`${dataTestId}-Error`}>
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Error</h4>
          <p className="gba:text-sm">{state.error}</p>
          <div className="gba:mt-4">
            <Button size="sm" variant="outline" onClick={() => setState(prev => ({ ...prev, error: null }))}>
              Dismiss
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  const headerFormData: CatalogManagement = {
    id: state.headerData.id,
    parentId: state.headerData.parentId,
    identifier: state.headerData.identifier,
    name: state.headerData.name,
    version: state.headerData.version || 'v1',
    validFrom: state.headerData.validFrom,
    validTo: state.headerData.validTo,
    children: undefined,
    defaultLocale: state.headerData.defaultLocale,
    description: state.headerData.description,
    createdAt: state.headerData.createdAt,
    createdBy: state.headerData.createdBy,
    updatedAt: state.headerData.updatedAt,
    updatedBy: state.headerData.updatedBy,
    deletedAt: (state.headerData as any).deletedAt,
    isDeleted: state.headerData.isDeleted,
    recordState: state.headerData.recordState,
    schemaDefinition: state.headerData.schemaDefinition as any
  }

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      {/* Header with Catalog Info, Settings, and Action Buttons */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <FileTextIcon className="gba:h-6 gba:w-6" style={{ color: 'var(--nw-color-primary-500)' }} />
              <div>
                <CardTitle className="gba:text-xl">{state.headerData.name}</CardTitle>
                <p className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                  {state.headerData.identifier} • Version {state.headerData.version}
                </p>
                <p className="gba:text-xs gba:font-mono" style={{ color: 'var(--nw-color-text-secondary)' }}>
                  uuid: {state.headerData.id}
                </p>
              </div>

              {/* Settings Toggle - moved next to catalog info */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleHeader}
                data-testid={`${dataTestId}-SettingsToggle`}
                className="gba:ml-4"
              >
                <GearIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                Settings
                {state.isHeaderExpanded ? (
                  <CaretUpIcon className="gba:h-4 gba:w-4 gba:ml-2" />
                ) : (
                  <CaretDownIcon className="gba:h-4 gba:w-4 gba:ml-2" />
                )}
              </Button>
            </div>

            <div className="gba:flex gba:items-center gba:gap-3">
              {/* Save Button */}
              {state.isDirty && (
                <Button onClick={handleSave} disabled={state.isSaving} data-testid={`${dataTestId}-SaveButton`}>
                  <FloppyDiskIcon className="gba:h-4 gba:w-4 gba:mr-2" />
                  {state.isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>

          {state.headerData.description && (
            <>
              <Separator />
              <p style={{ color: 'var(--nw-color-text-secondary)' }}>{state.headerData.description}</p>
            </>
          )}
        </CardHeader>

        {/* Collapsible Settings Section */}
        {state.isHeaderExpanded && (
          <CardContent>
            <div className="gba:border-t gba:pt-6">
              <CatalogHeaderForm
                data={headerFormData}
                onChange={handleHeaderDataChange}
                isLoading={state.isSaving}
                {...context}
                data-testid={`${dataTestId}-HeaderForm`}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Catalog Entries Table */}
      <div>
        {(() => {
          // Only render the table if we have a valid catalog with identifier
          const catalogId = state.headerData.identifier || state.headerData.id
          if (!catalogId) {
            return (
              <Card>
                <CardContent className="gba:p-6 gba:text-center">
                  <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    Loading catalog entries...
                  </div>
                </CardContent>
              </Card>
            )
          }

          if (!prefetchedEntries) {
            return (
              <Card>
                <CardContent className="gba:p-6 gba:text-center">
                  <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    Loading catalog entries...
                  </div>
                </CardContent>
              </Card>
            )
          }

          return (
            <CatalogEntryTable
              catalog={state.headerData}
              onViewCatalog={onViewCatalog}
              prefetched={{
                initialEntries: prefetchedEntries.entries,
                initialTotalCount: prefetchedEntries.totalCount,
                externalLoadEntries: async (searchTerm?: string, limit?: number, offset?: number) => {
                  const identifier = state.headerData.identifier || state.headerData.name
                  const version = state.headerData.version || 'v1'
                  const full = await fetchCatalog(
                    {
                      identifier,
                      version,
                      entriesLimit: limit ?? 100,
                      entriesOffset: offset ?? 0,
                      search: searchTerm?.trim() || undefined
                    },
                    { includeCatalogEntries: true, includeChildCatalogEntries: true, includeParentCatalogEntry: true }
                  )
                  return { entries: full?.entries || [], totalCount: full?.total || full?.entries?.length || 0 }
                }
              }}
              {...context}
              data-testid={`${dataTestId}-EntriesTable`}
            />
          )
        })()}
      </div>
    </div>
  )
}

export default CatalogDetailView
