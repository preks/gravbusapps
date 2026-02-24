import React, { useMemo } from 'react'
import { AssetStatus } from '../types'
import { useTranslation } from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import assetsTranslations from '../_i18n'

interface AssetTableActionButtonProps {
  assetId: string
  assetStatus: AssetStatus
  accessToken: string
  dataTestIdPrefix: string
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
  onGenerateDocument?: (assetId: string) => void
}

export const AssetTableActionButton: React.FC<AssetTableActionButtonProps> = ({
  assetId,
  assetStatus,
  accessToken,
  dataTestIdPrefix,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset,
  onGenerateDocument
}) => {
  const { t } = useTranslation(assetsTranslations)
  const isAllocated = assetStatus === AssetStatus.ALLOCATED
  const isRetired = assetStatus === AssetStatus.RETIRED

  const staticFlowData = useMemo(() => {
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: t('actions'),
        key: 'update-asset',
        label: t('update_asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(assetId)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: t('actions'),
        key: 'allocate-asset',
        label: t('allocate_asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(assetId)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: t('actions'),
        key: 'retrieve-asset',
        label: t('retrieve_asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(assetId)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: t('actions'),
        key: 'retire-asset',
        label: t('retire_asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetireAsset(assetId)
        }
      })
    }

    if (onGenerateDocument) {
      actions.push({
        category: t('actions'),
        key: 'generate-document',
        label: t('export_pdf'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onGenerateDocument(assetId)
        }
      })
    }

    return actions
  }, [
    t,
    assetId,
    isAllocated,
    isRetired,
    onAllocateAsset,
    onUpdateAsset,
    onRetireAsset,
    onRetrieveAsset,
    onGenerateDocument
  ])

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
