import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout, Button, Dialog, DialogContent, DialogTitle } from '@newwork/nw-design-system'
import { DesktopIcon, PlusIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useAssets } from './hooks/useAssets'
import { AssetStatistics } from './components/AssetStatistics'
import { AssetTable } from './components/AssetTable'
import { AssetDetailPanel } from './components/AssetDetailPanel'
import { EquipmentRegistration } from '../../forms/equipment-registration/EquipmentRegistration'
import { AllocateAsset } from '../../forms/allocate-asset/AllocateAsset'
import { ChangeAssetStatus } from '../../forms/change-asset-status/ChangeAssetStatus'
import { ReturnAsset } from '../../forms/return-asset/ReturnAsset'
import { Asset, AssetAllocation, AssetStatus } from './types'
import { useAssetService } from './services/useAssetService'
import { AssetProcessClient } from './services/AssetProcessClient'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedAssetAllocations, setSelectedAssetAllocations] = useState<AssetAllocation[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false)
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [allocatingAssetId, setAllocatingAssetId] = useState<string | null>(null)
  const [retiringAssetId, setRetiringAssetId] = useState<string | null>(null)
  const [returningAssetId, setReturningAssetId] = useState<string | null>(null)

  // Load assets data
  const { assets, isLoading: assetsLoading, error: assetsError, statistics, refetch: refetchAssets } = useAssets(props)

  // Initialize asset service
  const { getAllocationsForAsset } = useAssetService(props)

  // Load allocations when asset is selected
  useEffect(() => {
    const loadAllocations = async () => {
      if (selectedAsset) {
        try {
          const allocations = await getAllocationsForAsset(selectedAsset.id)
          setSelectedAssetAllocations(allocations)
        } catch (error) {
          console.error('Error loading allocations:', error)
          setSelectedAssetAllocations([])
        }
      } else {
        setSelectedAssetAllocations([])
      }
    }

    loadAllocations()
  }, [selectedAsset, getAllocationsForAsset])

  // Handle asset selection
  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset)
    setIsPanelOpen(true)
  }

  // Handle panel close
  const handlePanelClose = () => {
    setIsPanelOpen(false)
    // Keep selected asset for a moment to prevent flash
    setTimeout(() => setSelectedAsset(null), 300)
  }

  // Handle register equipment
  const handleRegisterEquipment = () => {
    setEditingAssetId(null)
    setIsRegisterDialogOpen(true)
  }

  // Handle update asset (opens edit modal)
  const handleUpdateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
        setEditingAssetId(assetId)
        setIsRegisterDialogOpen(true)
      } else {
        console.error('Asset not found:', assetId)
      }
    },
    [assets]
  )

  // Handle allocate asset
  const handleAllocateAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
      }
      setAllocatingAssetId(assetId)
      setIsAllocateDialogOpen(true)
    },
    [assets]
  )

  // Handle retrieve asset (return asset)
  const handleRetrieveAsset = useCallback(
    (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (asset) {
        setSelectedAsset(asset)
      }
      setReturningAssetId(assetId)
      setIsReturnDialogOpen(true)
    },
    [assets]
  )

  // Handle retire asset - directly call the updateAsset API
  const handleRetireAsset = useCallback(
    async (assetId: string) => {
      const asset = assets.find(a => a.id === assetId)
      if (!asset) {
        console.error('Asset not found:', assetId)
        return
      }

      try {
        const assetProcessClient = new AssetProcessClient()
        assetProcessClient.setAccessToken(props.accessToken)

        // Call updateAsset process API with id, version, and status RETIRED_ASSET
        await assetProcessClient.updateAsset({
          id: asset.id,
          version: asset.version,
          assetStatus: AssetStatus.RETIRED
        })

        // Dispatch process completion event to refresh data
        const completionPayload = {
          resolution: 'success',
          processName: 'updateAsset',
          domain: 'employee',
          response: {
            asset: {
              id: asset.id,
              assetStatus: AssetStatus.RETIRED
            }
          }
        }

        window.dispatchEvent(
          new CustomEvent('com.newwork.process.processCompletion', {
            detail: completionPayload
          })
        )

        window.dispatchEvent(
          new CustomEvent('com.newwork.process.taskCompletion', {
            detail: completionPayload
          })
        )

        refetchAssets()
      } catch (error) {
        console.error('Error retiring asset:', error)
      }
    },
    [assets, props.accessToken, refetchAssets]
  )

  useEffect(() => {
    const handleProcessCompletion = (event: CustomEvent) => {
      const detail = event.detail

      if (detail?.resolution === 'success') {
        const processName = (detail?.processName || '').toLowerCase()
        const domain = (detail?.domain || '').toLowerCase()

        const isAssetProcess = domain === 'employee' && processName.includes('asset')

        const isAllocationProcess =
          domain === 'employee' && (processName.includes('allocate') || processName.includes('employeeasset'))

        if (isAssetProcess || detail?.response?.asset) {
          setIsRegisterDialogOpen(false)
          setEditingAssetId(null)
          setSelectedAsset(null)
        }

        if (isAllocationProcess || detail?.response?.allocation || detail?.response?.employeeAsset) {
          setIsAllocateDialogOpen(false)
          setAllocatingAssetId(null)
        }

        // Check if this is a return/deallocate process
        const isReturnProcess =
          domain === 'employee' &&
          (processName.includes('return') || processName.includes('deallocate') || processName.includes('retrieve'))

        if (isReturnProcess || detail?.response?.deallocation) {
          setIsReturnDialogOpen(false)
          setReturningAssetId(null)
        }

        // Check if this is a retire/status change process
        const isStatusChangeProcess =
          domain === 'employee' && (processName.includes('updateasset') || processName.includes('retire'))

        if (isStatusChangeProcess && detail?.response?.asset?.assetStatus === 'RETIRE') {
          setIsRetireDialogOpen(false)
          setRetiringAssetId(null)
        }

        refetchAssets()
      }
    }

    const handleProcessContinue = (event: CustomEvent) => {
      const detail = event.detail
      if (detail?.event === 'pse_abort') {
        setIsRegisterDialogOpen(false)
        setEditingAssetId(null)
        setIsAllocateDialogOpen(false)
        setAllocatingAssetId(null)
        setIsRetireDialogOpen(false)
        setRetiringAssetId(null)
        setIsReturnDialogOpen(false)
        setReturningAssetId(null)
      }
    }

    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion as EventListener)
    window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener)
    window.addEventListener('com.newwork.process.continue', handleProcessContinue as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion as EventListener)
      window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion as EventListener)
      window.removeEventListener('com.newwork.process.continue', handleProcessContinue as EventListener)
    }
  }, [refetchAssets])

  useEffect(() => {
    const handleUpdateAssetAction = (event: CustomEvent) => {
      const assetId = event.detail?.assetId || event.detail?.id
      if (assetId) {
        handleUpdateAsset(assetId)
      }
    }

    window.addEventListener('update-asset', handleUpdateAssetAction as EventListener)

    return () => {
      window.removeEventListener('update-asset', handleUpdateAssetAction as EventListener)
    }
  }, [handleUpdateAsset])

  useEffect(() => {
    const handleProcessStart = (event: Event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent.detail
      const processName = (detail?.processName || '').toLowerCase()
      const domain = (detail?.domain || '').toLowerCase()
      const startProcessBody = detail?.startProcessBody || {}

      // Helper to extract assetId from various payload structures
      const extractAssetId = () => {
        return (
          startProcessBody.assetId ||
          startProcessBody.asset?.id ||
          startProcessBody.saveAssetModelInput?.asset?.id ||
          startProcessBody.updateAssetModelInput?.asset?.id ||
          detail?.assetId ||
          (startProcessBody as any)?.assetId
        )
      }

      // Helper to intercept and prevent default behavior
      // Note: This is now mainly a fallback since we override onClick handlers in AssetTable
      const interceptAndOpen = (handler: (assetId: string) => void, assetId: string) => {
        // Stop all event propagation immediately to prevent platform modal from opening
        event.stopImmediatePropagation()
        event.stopPropagation()
        event.preventDefault()
        if (customEvent.stopImmediatePropagation) {
          customEvent.stopImmediatePropagation()
        }
        if (customEvent.stopPropagation) {
          customEvent.stopPropagation()
        }
        if (customEvent.preventDefault) {
          customEvent.preventDefault()
        }

        handler(assetId)
        return false
      }

      // Check if this is a createEmployeeAsset process (allocate)
      const isAllocateProcess = domain === 'employee' && processName === 'createemployeeasset'
      if (isAllocateProcess) {
        const assetId = extractAssetId()
        if (assetId && handleAllocateAsset) {
          return interceptAndOpen(handleAllocateAsset, assetId)
        }
      }

      // Check if this is an updateAsset process
      const isUpdateAssetProcess = domain === 'employee' && processName === 'updateasset'
      if (isUpdateAssetProcess) {
        const assetId = extractAssetId()
        if (assetId) {
          return interceptAndOpen(handleUpdateAsset, assetId)
        }
      }

      // Handle other update processes (legacy process names)
      const isUpdateProcess =
        domain === 'employee' &&
        (processName.includes('update-asset') ||
          processName.includes('editasset') ||
          processName.includes('edit-asset'))

      if (isUpdateProcess) {
        const assetId = extractAssetId()
        if (assetId) {
          return interceptAndOpen(handleUpdateAsset, assetId)
        }
      }
    }

    const options = { capture: true, passive: false } as AddEventListenerOptions
    window.addEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)

    return () => {
      window.removeEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)
    }
  }, [handleUpdateAsset, handleAllocateAsset])

  // Memoize additionalData
  const equipmentRegistrationAdditionalData = useMemo(
    () => ({
      ...props.additionalData,
      assetId: editingAssetId || undefined,
      asset: selectedAsset || undefined,
      version: selectedAsset?.version,
      onSuccess: () => {
        setIsRegisterDialogOpen(false)
        setEditingAssetId(null)
        setSelectedAsset(null)
        refetchAssets()
      }
    }),
    [props.additionalData, editingAssetId, selectedAsset, refetchAssets]
  )

  return (
    <div data-testid="assets-app">
      <PageLayout
        headerIcon={DesktopIcon}
        headerTitle="Asset Management"
        headerDescription="Manage IT equipment inventory and allocations"
        className="gba:min-h-screen"
        variant={moduleColor}
      >
        <div className="gba:space-y-6">
          {/* Statistics Cards */}
          <AssetStatistics
            statistics={statistics}
            isLoading={assetsLoading}
            error={assetsError}
            onRetry={refetchAssets}
          />

          {/* All Assets Table */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <h3 className="gba:text-lg gba:font-semibold">All Assets</h3>
              <Button onClick={handleRegisterEquipment} data-testid="register-equipment-button" className="gba:gap-2">
                <PlusIcon size={20} />
                Register Equipment
              </Button>
            </div>
            <AssetTable
              {...props}
              assets={assets}
              isLoading={assetsLoading}
              onAssetClick={handleAssetClick}
              onAllocateAsset={handleAllocateAsset}
              onUpdateAsset={handleUpdateAsset}
              onRetireAsset={handleRetireAsset}
              onRetrieveAsset={handleRetrieveAsset}
            />
          </div>
        </div>
      </PageLayout>

      {/* Asset Detail Side Panel */}
      <AssetDetailPanel
        asset={selectedAsset}
        allocations={selectedAssetAllocations}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        accessToken={props.accessToken}
      />

      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogTitle className="gba:sr-only">
            {editingAssetId ? 'Update Equipment' : 'Register Equipment'}
          </DialogTitle>
          {isRegisterDialogOpen && (
            <EquipmentRegistration
              {...props}
              key={`equipment-registration-${editingAssetId || 'new'}`}
              additionalData={equipmentRegistrationAdditionalData}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogTitle className="gba:sr-only">Allocate Asset</DialogTitle>
          <AllocateAsset
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: allocatingAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isRetireDialogOpen} onOpenChange={setIsRetireDialogOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogTitle className="gba:sr-only">Retire Asset</DialogTitle>
          <ChangeAssetStatus
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: retiringAssetId || undefined,
              asset: selectedAsset || undefined,
              forceStatus: 'RETIRED'
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogTitle className="gba:sr-only">Return Asset</DialogTitle>
          <ReturnAsset
            {...props}
            additionalData={{
              ...props.additionalData,
              assetId: returningAssetId || undefined,
              asset: selectedAsset || undefined
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Assets
