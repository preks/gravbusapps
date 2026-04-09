import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Dialog, DialogContent, DialogTitle, Button, useTranslation } from '@newwork/nw-design-system'
import { DesktopIcon, PlusIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useAssets } from './hooks/useAssets'
import { useAssetDialogs } from './hooks/useAssetDialogs'
import { useEmployeeFilterBackendSearch } from './hooks/useEmployeeFilterBackendSearch'
import { useAssetProcessEvents } from './hooks/useAssetProcessEvents'
import { useSiteLocationsForFilter } from './hooks/useSiteLocationsForFilter'
import { useAssetFilterState } from './hooks/useAssetFilterState'
import { AssetStatistics } from './components/AssetStatistics'
import { AssetTable } from './components/AssetTable'
import { AssetDetailPanel } from './components/AssetDetailPanel'
import { AssetEmployeeFilter, buildAssetEmployeeCustomGroup } from './components/AssetEmployeeFilter'
import { DeleteAssetDialog } from './components/DeleteAssetDialog'
import { EquipmentRegistration } from '../../forms/equipment-registration/EquipmentRegistration'
import { AllocateAsset } from '../../forms/allocate-asset/AllocateAsset'
import { ReturnAsset } from '../../forms/return-asset/ReturnAsset'
import { RetireAsset } from '../../forms/retire-asset/RetireAsset'
import { Asset, AssetStatus } from './types'
import { AssetProcessClient } from './services/AssetProcessClient'
import { useAssetService } from './services/useAssetService'
import { useAssetsCatalog } from '../../forms/equipment-registration/hooks/useAssetsCatalog'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import { generateAssetDocumentPdf } from './utils/assetDocumentPdf'
import assetsTranslations from './_i18n'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const { t: tAssets } = useTranslation(assetsTranslations)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [employeeFilterSearch, setEmployeeFilterSearch] = useState('')
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())
  const [isDeletingAsset, setIsDeletingAsset] = useState(false)

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()
    const interval = setInterval(checkLocale, 500)
    return () => clearInterval(interval)
  }, [currentLocale])

  const dialogs = useAssetDialogs()

  const { options: categoryOptions } = useAssetsCatalog(props)
  const { locations: locationOptions } = useSiteLocationsForFilter(props.accessToken)
  const { employeeOptions, isLoading: employeeSearchLoading } = useEmployeeFilterBackendSearch(
    props.accessToken ?? '',
    selectedEmployeeIds,
    employeeFilterSearch
  )
  const { filterConfiguration, filtersObject, queryFilterState, handleFilterChangeFromDisplay, hasActiveFilters } =
    useAssetFilterState({
      statusOptions: Object.values(AssetStatus),
      categoryOptions: categoryOptions.map(opt => ({ id: opt.value, label: opt.label })),
      locationOptions: locationOptions.map(location => ({ id: location.id, label: location.name })),
      employeeOptions,
      employeeIds: selectedEmployeeIds,
      setEmployeeIds: setSelectedEmployeeIds,
      setCurrentPage
    })

  const activeStatusFilter = useMemo(() => {
    const statusIds = queryFilterState.statusFilter
    if (statusIds.length === 0) return 'all'
    if (statusIds.length === 1) return statusIds[0]
    return 'all'
  }, [queryFilterState.statusFilter])

  const assetsOptions = useMemo(
    () => ({
      page: currentPage,
      pageSize,
      search: searchQuery,
      statusFilter: queryFilterState.statusFilter.length > 0 ? queryFilterState.statusFilter : undefined,
      categoryFilter: queryFilterState.categoryFilter.length > 0 ? queryFilterState.categoryFilter : undefined,
      locationFilter: queryFilterState.locationFilter.length > 0 ? queryFilterState.locationFilter : undefined,
      employeeFilter: queryFilterState.employeeFilter.length > 0 ? queryFilterState.employeeFilter : undefined,
      acquisitionDateFrom: queryFilterState.acquisitionDateFrom,
      acquisitionDateTo: queryFilterState.acquisitionDateTo,
      disposalDateFrom: queryFilterState.disposalDateFrom,
      disposalDateTo: queryFilterState.disposalDateTo,
      sortField: sortField || undefined,
      sortOrder: sortField ? sortOrder : undefined
    }),
    [currentPage, pageSize, searchQuery, queryFilterState, sortField, sortOrder]
  )

  const {
    assets,
    totalCount,
    isLoading: assetsLoading,
    statistics,
    statisticsLoading,
    statisticsError,
    refetch: refetchAssets,
    refetchStatistics
  } = useAssets(props, assetsOptions)

  const memoizedStatistics = useMemo(
    () => statistics,
    [
      statistics.totalAssets,
      statistics.allocatedAssets,
      statistics.availableAssets,
      statistics.underRepairAssets,
      statistics.retiredAssets
    ]
  )

  const { getAllocationsForAsset, getAssetById } = useAssetService(props)
  const assetProcessClient = useMemo(() => {
    const client = new AssetProcessClient()
    if (props.accessToken) {
      client.setAccessToken(props.accessToken)
    }
    return client
  }, [props.accessToken])

  const handleGenerateDocument = useCallback(
    async (assetId: string) => {
      try {
        const asset = assets.find(a => a.id === assetId) ?? (await getAssetById(assetId))
        if (!asset) return
        const allocations = await getAllocationsForAsset(assetId)
        await generateAssetDocumentPdf(asset, allocations)
      } catch (error) {
        console.error('Error generating asset document:', error)
      }
    },
    [assets, getAssetById, getAllocationsForAsset]
  )
  const [selectedAssetAllocations, setSelectedAssetAllocations] = useState<any[]>([])

  const getAssetIdFromUrl = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null
    }

    const params = new URLSearchParams(window.location.search)
    const assetId = params.get('assetId')
    return assetId && assetId.trim() ? assetId : null
  }, [])

  const updateAssetIdInUrl = useCallback((assetId: string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    if (assetId) {
      params.set('assetId', assetId)
    } else {
      params.delete('assetId')
    }

    const search = params.toString()
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash || ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [])

  useEffect(() => {
    const assetId = getAssetIdFromUrl()
    if (assetId) {
      setPendingAssetId(assetId)
    }
  }, [getAssetIdFromUrl])

  useEffect(() => {
    if (!selectedAsset) {
      setSelectedAssetAllocations([])
      return
    }

    const loadAllocations = async () => {
      try {
        const allocations = await getAllocationsForAsset(selectedAsset.id)
        setSelectedAssetAllocations(allocations)
      } catch (error) {
        console.error('Error loading allocations:', error)
        setSelectedAssetAllocations([])
      }
    }

    loadAllocations()
  }, [selectedAsset, getAllocationsForAsset])

  useEffect(() => {
    if (!pendingAssetId) {
      return
    }

    const existing = assets.find(asset => asset.id === pendingAssetId)
    if (existing) {
      setSelectedAsset(existing)
      setIsPanelOpen(true)
      setPendingAssetId(null)
      return
    }

    if (assetsLoading) {
      return
    }

    let isActive = true

    const loadAssetFromUrl = async () => {
      try {
        const asset = await getAssetById(pendingAssetId)
        if (!isActive) {
          return
        }
        if (asset) {
          setSelectedAsset(asset)
          setIsPanelOpen(true)
        }
      } catch (error) {
        console.error('Error loading asset from URL:', error)
      } finally {
        if (isActive) {
          setPendingAssetId(null)
        }
      }
    }

    loadAssetFromUrl()
    return () => {
      isActive = false
    }
  }, [pendingAssetId, assets, assetsLoading, getAssetById])

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsPanelOpen(true)
  }

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedAsset(null), 300)
  }, [])

  useEffect(() => {
    if (pendingAssetId) {
      return
    }

    if (isPanelOpen && selectedAsset?.id) {
      updateAssetIdInUrl(selectedAsset.id)
      return
    }

    if (!isPanelOpen) {
      updateAssetIdInUrl(null)
    }
  }, [isPanelOpen, selectedAsset?.id, pendingAssetId, updateAssetIdInUrl])

  useEffect(() => {
    const handlePopState = () => {
      const assetId = getAssetIdFromUrl()
      if (assetId) {
        setPendingAssetId(assetId)
      } else {
        handlePanelClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getAssetIdFromUrl, handlePanelClose])

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search)
    setCurrentPage(1)
  }, [])

  // Handle sort change
  const handleSortChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    if (order === '') {
      // Clear sorting - reset to default
      setSortField('')
      setSortOrder('DESC')
    } else {
      setSortField(field)
      setSortOrder(order)
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  const handleUpdateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
        dialogs.openRegister(assetId)
      }
    },
    [assets, dialogs]
  )

  const handleAllocateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openAllocate(assetId)
    },
    [assets, dialogs]
  )

  const handleRetrieveAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openReturn(assetId)
    },
    [assets, dialogs]
  )

  const handleRetireAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) setSelectedAsset(asset)
      dialogs.openRetire(assetId)
    },
    [assets, dialogs]
  )

  const handleDeleteAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(item => item.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
      }
      dialogs.openDelete(assetId)
    },
    [assets, dialogs]
  )

  const handleConfirmDeleteAsset = useCallback(
    async (notes: string) => {
      const trimmedNotes = notes.trim()

      if (!dialogs.deletingAssetId || !trimmedNotes) {
        return
      }

      const assetToDelete =
        assets.find(item => item.id === dialogs.deletingAssetId) ||
        (selectedAsset?.id === dialogs.deletingAssetId ? selectedAsset : null)

      if (!assetToDelete) {
        return
      }

      if (trimmedNotes === (assetToDelete.notes || '').trim()) {
        return
      }

      setIsDeletingAsset(true)
      try {
        await assetProcessClient.deleteAsset({
          id: assetToDelete.id,
          version: assetToDelete.version,
          model: assetToDelete.model,
          serialNumber: assetToDelete.serialNumber,
          acquisitionDate: assetToDelete.acquisitionDate,
          warrantyPeriodMonths: assetToDelete.warrantyPeriodMonths,
          inventoryValue: assetToDelete.inventoryValue,
          assetStatus: assetToDelete.assetStatus,
          assetBrandRef: assetToDelete.assetBrandRef,
          assetCategoryRef: assetToDelete.assetCategoryRef,
          currencyRef: assetToDelete.currencyRef,
          siteLocation: assetToDelete.siteLocationId,
          notes: trimmedNotes,
          disposalStatus: assetToDelete.disposalStatus,
          disposalOutcomeRef: assetToDelete.disposalOutcomeRef,
          disposalDate: assetToDelete.disposalDate,
          disposalReason: assetToDelete.disposalReason,
          requireSanitization: assetToDelete.requireSanitization,
          sanitizationMethodRef: assetToDelete.sanitizationMethodRef,
          sanitizationExecutionDate: assetToDelete.sanitizationExecutionDate,
          responsibleEmployee: assetToDelete.responsibleEmployeeId,
          performerEmployee: assetToDelete.performerEmployeeId
        })
        dialogs.closeDelete()
        if (selectedAsset?.id === assetToDelete.id) {
          handlePanelClose()
        }
        refetchAssets()
        refetchStatistics()
      } finally {
        setIsDeletingAsset(false)
      }
    },
    [assetProcessClient, assets, dialogs, handlePanelClose, refetchAssets, refetchStatistics, selectedAsset]
  )

  useAssetProcessEvents({
    onAssetProcessComplete: () => {
      dialogs.closeRegister()
      setSelectedAsset(null)
      refetchAssets()
    },
    onAllocationProcessComplete: () => {
      dialogs.closeAllocate()
      refetchAssets()
    },
    onReturnProcessComplete: () => {
      dialogs.closeReturn()
      refetchAssets()
    },
    onRetireProcessComplete: () => {
      dialogs.closeRetire()
      refetchAssets()
    },
    onUpdateAsset: handleUpdateAsset,
    onAllocateAsset: handleAllocateAsset,
    onCloseDialogs: dialogs.closeAll
  })

  const allocateDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
    [currentLocale]
  )

  const registerDialogTitle = useMemo(
    () =>
      dialogs.editingAssetId
        ? getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_equipment', 'Update Equipment')
        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment'),
    [currentLocale, dialogs.editingAssetId]
  )

  const returnDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.return_asset_form', 'Return Asset'),
    [currentLocale]
  )

  const retireDialogTitle = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retire_asset', 'Retire Asset'),
    [currentLocale]
  )

  const equipmentRegistrationAdditionalData = useMemo(
    () => ({
      ...props.additionalData,
      assetId: dialogs.editingAssetId || undefined,
      asset: selectedAsset || undefined,
      version: selectedAsset?.version,
      onSuccess: () => {
        dialogs.closeRegister()
        setSelectedAsset(null)
        refetchAssets()
      }
    }),
    [props.additionalData, dialogs.editingAssetId, selectedAsset, refetchAssets, dialogs]
  )

  const employeeFilterCustomGroup = useMemo(
    () =>
      buildAssetEmployeeCustomGroup(renderProps => (
        <AssetEmployeeFilter
          {...renderProps}
          searchText={employeeFilterSearch}
          setSearchText={setEmployeeFilterSearch}
          showDropdown={showEmployeeDropdown}
          setShowDropdown={setShowEmployeeDropdown}
          employeeOptions={employeeOptions}
          isLoading={employeeSearchLoading}
          searchPlaceholder={tAssets('asset-employee-filter-search-placeholder')}
          emptyLabel={tAssets('asset-employee-filter-empty')}
          loadingLabel={tAssets('asset-employee-filter-loading')}
        />
      )),
    [employeeFilterSearch, employeeOptions, employeeSearchLoading, showEmployeeDropdown, tAssets]
  )

  const tablePrimaryAction = useMemo(
    () => (
      <Button
        onClick={() => dialogs.openRegister()}
        data-testid="register-equipment-button"
        className="gba:gap-2 gba:shrink-0"
      >
        <PlusIcon size={20} />
        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment')}
      </Button>
    ),
    [dialogs]
  )

  const listEmptyMessage = useMemo(
    () =>
      hasActiveFilters || searchQuery.trim()
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_assets.no_assets_found',
            'No assets found matching your criteria.'
          )
        : tAssets('asset-management-empty'),
    [hasActiveFilters, searchQuery, tAssets]
  )

  return (
    <div data-testid="assets-app">
      <PageLayout
        headerIcon={DesktopIcon}
        headerTitle={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset_management', 'Asset Management')}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_assets.asset_management_description',
          'Manage IT equipment inventory and allocations'
        )}
        className="gba:min-h-screen"
        variant={moduleColor}
      >
        <div className="gba:flex gba:flex-col gba:h-full gba:w-full gba:min-w-0" data-testid="data-container">
          <div className="gba:min-h-[400px] gba:overflow-auto gba:bg-white" data-testid="data-container-body">
            <div className="gba:p-4 gba:space-y-6">
              <AssetStatistics
                statistics={memoizedStatistics}
                isLoading={statisticsLoading}
                error={statisticsError}
                onRetry={refetchStatistics}
                onStatusFilterChange={status => {
                  if (status === 'all') {
                    const restFilters = { ...filtersObject }
                    delete restFilters.statusIds
                    handleFilterChangeFromDisplay(restFilters)
                    return
                  }

                  handleFilterChangeFromDisplay({ ...filtersObject, statusIds: [status] })
                }}
                activeStatusFilter={activeStatusFilter}
              />

              <BackofficeDataDisplay
                titleSections={[
                  {
                    id: 'list',
                    label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_assets', 'All Assets'),
                    metadata: { count: totalCount, isLoading: assetsLoading }
                  }
                ]}
                currentSection="list"
                searchValue={searchQuery}
                searchPlaceholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:hr_assets.search_assets',
                  'Search assets...'
                )}
                onSearchChange={handleSearchChange}
                filters={filtersObject}
                filterConfiguration={filterConfiguration}
                onFilterChange={handleFilterChangeFromDisplay}
                primaryAction={tablePrimaryAction}
                renderFilterSheet={(open, onOpenChange) => (
                  <BackofficeFilterSheet
                    open={open}
                    onOpenChange={onOpenChange}
                    configuration={filterConfiguration}
                    values={filtersObject}
                    onApply={handleFilterChangeFromDisplay}
                    onChange={handleFilterChangeFromDisplay}
                    title={tAssets('asset-filter-sheet-title')}
                    description={tAssets('asset-filter-sheet-description')}
                    customGroup={employeeFilterCustomGroup}
                  />
                )}
              >
                <AssetTable
                  {...props}
                  assets={assets}
                  totalCount={totalCount}
                  isLoading={assetsLoading}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  searchQuery={searchQuery}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handlePageSizeChange}
                  onSearchChange={handleSearchChange}
                  onSortChange={handleSortChange}
                  onAssetClick={handleAssetClick}
                  onAllocateAsset={handleAllocateAsset}
                  onUpdateAsset={handleUpdateAsset}
                  onRetireAsset={handleRetireAsset}
                  onRetrieveAsset={handleRetrieveAsset}
                  onDeleteAsset={handleDeleteAsset}
                  onGenerateDocument={handleGenerateDocument}
                  emptyMessage={listEmptyMessage}
                />
              </BackofficeDataDisplay>
            </div>
          </div>
        </div>
      </PageLayout>
      <AssetDetailPanel
        asset={selectedAsset}
        allocations={selectedAssetAllocations}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        accessToken={props.accessToken}
        onAllocateAsset={handleAllocateAsset}
        onUpdateAsset={handleUpdateAsset}
        onRetireAsset={handleRetireAsset}
        onRetrieveAsset={handleRetrieveAsset}
        onDeleteAsset={handleDeleteAsset}
        onGenerateDocument={handleGenerateDocument}
      />

      <DeleteAssetDialog
        open={dialogs.isDeleteOpen}
        asset={
          assets.find(item => item.id === dialogs.deletingAssetId) ||
          (selectedAsset?.id === dialogs.deletingAssetId ? selectedAsset : null)
        }
        isSubmitting={isDeletingAsset}
        onClose={dialogs.closeDelete}
        onConfirm={handleConfirmDeleteAsset}
      />

      <Dialog open={dialogs.isRegisterOpen} onOpenChange={dialogs.closeRegister}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{registerDialogTitle}</DialogTitle>
          {dialogs.isRegisterOpen && (
            <EquipmentRegistration
              {...props}
              key={`equipment-registration-${dialogs.editingAssetId || 'new'}-${currentLocale}`}
              additionalData={equipmentRegistrationAdditionalData}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isAllocateOpen} onOpenChange={dialogs.closeAllocate}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{allocateDialogTitle}</DialogTitle>
          <AllocateAsset
            key={`allocate-asset-${dialogs.allocatingAssetId ?? ''}-${currentLocale}`}
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: dialogs.allocatingAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isReturnOpen} onOpenChange={dialogs.closeReturn}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{returnDialogTitle}</DialogTitle>
          <ReturnAsset
            key={`return-asset-${currentLocale}`}
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: dialogs.returningAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.isRetireOpen} onOpenChange={dialogs.closeRetire}>
        <DialogContent
          className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogTitle className="gba:sr-only">{retireDialogTitle}</DialogTitle>
          {dialogs.isRetireOpen && (
            <RetireAsset
              key={`retire-asset-${dialogs.retiringAssetId ?? ''}-${currentLocale}`}
              {...props}
              additionalData={{
                ...props.additionalData,
                assetId: dialogs.retiringAssetId || undefined,
                asset: selectedAsset || undefined
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Assets
