import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Button, Dialog, DialogContent, DialogTitle } from '@newwork/nw-design-system'
import { DesktopIcon, PlusIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useAssets } from './hooks/useAssets'
import { useAssetDialogs } from './hooks/useAssetDialogs'
import { useAssetProcessEvents } from './hooks/useAssetProcessEvents'
import { AssetStatistics } from './components/AssetStatistics'
import { AssetTable } from './components/AssetTable'
import { AssetDetailPanel } from './components/AssetDetailPanel'
import { EquipmentRegistration } from '../../forms/equipment-registration/EquipmentRegistration'
import { AllocateAsset } from '../../forms/allocate-asset/AllocateAsset'
import { ReturnAsset } from '../../forms/return-asset/ReturnAsset'
import { Asset, AssetStatus } from './types'
import { useAssetService } from './services/useAssetService'
import { AssetProcessClient } from './services/AssetProcessClient'
import { generateAssetDocumentPdf } from './utils/assetDocumentPdf'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

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

  const {
    assets,
    totalCount,
    isLoading: assetsLoading,
    statistics,
    statisticsLoading,
    statisticsError,
    refetch: refetchAssets,
    refetchStatistics
  } = useAssets(props, {
    page: currentPage,
    pageSize,
    search: searchQuery,
    statusFilter,
    sortField: sortField || undefined,
    sortOrder: sortField ? sortOrder : undefined
  })

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

  const { getAllocationsForAsset, getAssetById, deallocateAsset } = useAssetService(props)

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

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }, [])

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
    async (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (!asset) return

      try {
        // Close any active allocations first so history shows ended, not "Current"
        const allocations = await getAllocationsForAsset(asset.id)
        const today = new Date().toISOString().slice(0, 10)
        for (const alloc of allocations) {
          if (!alloc.endDate) {
            await deallocateAsset(alloc.id, alloc.version, today)
          }
        }

        const client = new AssetProcessClient()
        client.setAccessToken(props.accessToken)

        await client.updateAsset({
          id: asset.id,
          version: asset.version,
          assetStatus: AssetStatus.RETIRED
        })

        const payload = {
          resolution: 'success',
          processName: 'updateAsset',
          domain: 'employee',
          response: { asset: { id: asset.id, assetStatus: AssetStatus.RETIRED } }
        }

        window.dispatchEvent(new CustomEvent('com.newwork.process.processCompletion', { detail: payload }))
        window.dispatchEvent(new CustomEvent('com.newwork.process.taskCompletion', { detail: payload }))
        refetchAssets()
      } catch (error) {
        console.error('Error retiring asset:', error)
      }
    },
    [assets, getAllocationsForAsset, deallocateAsset, props.accessToken, refetchAssets]
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
        <div className="gba:space-y-6">
          <AssetStatistics
            statistics={memoizedStatistics}
            isLoading={statisticsLoading}
            error={statisticsError}
            onRetry={refetchStatistics}
            onStatusFilterChange={handleStatusFilterChange}
            activeStatusFilter={statusFilter}
          />

          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h3 className="gba:text-lg gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_assets', 'All Assets')}
              </h3>
              <Button
                onClick={() => dialogs.openRegister()}
                data-testid="register-equipment-button"
                className="gba:gap-2"
              >
                <PlusIcon size={20} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.register_equipment', 'Register Equipment')}
              </Button>
            </div>
            <AssetTable
              {...props}
              assets={assets}
              totalCount={totalCount}
              isLoading={assetsLoading}
              currentPage={currentPage}
              pageSize={pageSize}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              sortField={sortField}
              sortOrder={sortOrder}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              onSearchChange={handleSearchChange}
              onStatusFilterChange={handleStatusFilterChange}
              onSortChange={handleSortChange}
              onAssetClick={handleAssetClick}
              onAllocateAsset={handleAllocateAsset}
              onUpdateAsset={handleUpdateAsset}
              onRetireAsset={handleRetireAsset}
              onRetrieveAsset={handleRetrieveAsset}
              onGenerateDocument={handleGenerateDocument}
            />
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
            key={`allocate-asset-${currentLocale}`}
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
    </div>
  )
}

export default Assets
