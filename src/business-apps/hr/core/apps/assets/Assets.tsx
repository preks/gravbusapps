/**
 * Assets Management App
 * Main application component for IT Equipment Inventory
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PageLayout,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@newwork/nw-design-system'
import { DesktopIcon, PlusIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useAssets } from './hooks/useAssets'
import { AssetStatistics } from './components/AssetStatistics'
import { AssetTable } from './components/AssetTable'
import { AssetDetailPanel } from './components/AssetDetailPanel'
import { EquipmentRegistration } from '../../forms/equipment-registration/EquipmentRegistration'
import { Asset, AssetAllocation } from './types'
import { useAssetService } from './services/useAssetService'

const moduleColor = MODULE_COLORS.HR

export const Assets: React.FC<BusinessAppContextProps> = props => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedAssetAllocations, setSelectedAssetAllocations] = useState<AssetAllocation[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)

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
    setIsRegisterDialogOpen(true)
  }

  const handleRegisterSuccess = () => {
    setIsRegisterDialogOpen(false)
    refetchAssets() // Refresh the asset list after successful registration
  }

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
            <AssetTable {...props} assets={assets} isLoading={assetsLoading} onAssetClick={handleAssetClick} />
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

      {/* Register Equipment Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Equipment</DialogTitle>
            <DialogDescription>Add a new asset to the inventory system.</DialogDescription>
          </DialogHeader>
          <EquipmentRegistration {...props} onSuccess={handleRegisterSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Assets
