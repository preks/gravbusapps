import React, { useState, useEffect, useCallback } from 'react'
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
import { Asset, AssetAllocation } from './types'
import { useAssetService } from './services/useAssetService'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedAssetAllocations, setSelectedAssetAllocations] = useState<AssetAllocation[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [allocatingAssetId, setAllocatingAssetId] = useState<string | null>(null)

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[Assets] Component mounted, setting up event listeners')
  }, [])

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

  // Handle update asset
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

      const isRetireProcess =
        domain === 'employee' &&
        (processName === 'saveasset' ||
          processName.includes('retire') ||
          processName.includes('change-asset-status') ||
          processName.includes('changeassetstatus') ||
          processName.includes('retireasset'))

      const isUpdateProcess =
        domain === 'employee' &&
        (processName === 'updateasset' ||
          processName.includes('update-asset') ||
          processName.includes('editasset') ||
          processName.includes('edit-asset'))

      if (isRetireProcess || isUpdateProcess) {
        const assetId =
          startProcessBody.assetId ||
          startProcessBody.asset?.id ||
          startProcessBody.saveAssetModelInput?.asset?.id ||
          startProcessBody.updateAssetModelInput?.asset?.id ||
          detail?.assetId ||
          (startProcessBody as any)?.assetId

        if (assetId) {
          event.stopImmediatePropagation()
          event.preventDefault()
          if (customEvent.stopImmediatePropagation) {
            customEvent.stopImmediatePropagation()
          }
          if (customEvent.preventDefault) {
            customEvent.preventDefault()
          }

          handleUpdateAsset(assetId)

          return false
        }
      }
    }

    const options = { capture: true, passive: false } as AddEventListenerOptions
    window.addEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)

    return () => {
      window.removeEventListener('com.newwork.process.start', handleProcessStart as EventListener, options)
    }
  }, [handleUpdateAsset])

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
              onRetireAsset={handleUpdateAsset}
              onAllocateAsset={handleAllocateAsset}
              onUpdateAsset={handleUpdateAsset}
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
          <EquipmentRegistration
            {...props}
            additionalData={{
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
            }}
          />
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
    </div>
  )
}

export default Assets
