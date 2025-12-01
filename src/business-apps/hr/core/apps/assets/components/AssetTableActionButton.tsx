import React, { useMemo } from 'react'
import { AssetStatus } from '../types'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AssetTableActionButtonProps {
  assetId: string
  assetStatus: AssetStatus
  accessToken: string
  dataTestIdPrefix: string
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
}

export const AssetTableActionButton: React.FC<AssetTableActionButtonProps> = ({
  assetId,
  assetStatus,
  accessToken,
  dataTestIdPrefix,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset
}) => {
  const isAllocated = assetStatus === AssetStatus.ALLOCATED
  const isRetired = assetStatus === AssetStatus.RETIRED

  const staticFlowData = useMemo(() => {
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'update-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_asset', 'Update Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(assetId)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'allocate-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(assetId)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retrieve-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retrieve_asset', 'Retrieve Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(assetId)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retire-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retire_asset', 'Retire Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetireAsset(assetId)
        }
      })
    }

    return actions
  }, [assetId, isAllocated, isRetired, onAllocateAsset, onUpdateAsset, onRetireAsset, onRetrieveAsset])

  return (
    <AppActionButton
      data-testid={`${dataTestIdPrefix}-actions-${assetId}`}
      size="icon"
      staticFlowData={staticFlowData}
      prefixDataTestId={`${dataTestIdPrefix}-action-${assetId}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick={true}
      onClick={e => e.stopPropagation()}
    />
  )
}
