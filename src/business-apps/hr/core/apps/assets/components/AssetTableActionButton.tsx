import React, { useMemo } from 'react'
import { AssetStatus } from '../types'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

type ActionLabelKey =
  | 'actions'
  | 'update_asset'
  | 'allocate_asset'
  | 'retrieve_asset'
  | 'retire_asset'
  | 'export_certificate'

/** Action dropdown labels by locale (matches assets _i18n FTL). Fallback to en-US. */
const ACTION_LABELS_BY_LOCALE: Record<string, Record<ActionLabelKey, string>> = {
  'en-US': {
    actions: 'Actions',
    update_asset: 'Update Asset',
    allocate_asset: 'Allocate Asset',
    retrieve_asset: 'Retrieve Asset',
    retire_asset: 'Retire Asset',
    export_certificate: 'Export certificate'
  },
  'de-DE': {
    actions: 'Aktionen',
    update_asset: 'Gerät aktualisieren',
    allocate_asset: 'Gerät zuweisen',
    retrieve_asset: 'Gerät zurücknehmen',
    retire_asset: 'Gerät außer Betrieb nehmen',
    export_certificate: 'Zertifikat exportieren'
  },
  'ro-RO': {
    actions: 'Acțiuni',
    update_asset: 'Actualizează activ',
    allocate_asset: 'Alocă activ',
    retrieve_asset: 'Reia activul',
    retire_asset: 'Retrage activul',
    export_certificate: 'Exportă certificat'
  }
}

function getActionLabels(): Record<ActionLabelKey, string> {
  const locale = getCurrentActiveUserLocale()
  return ACTION_LABELS_BY_LOCALE[locale] ?? ACTION_LABELS_BY_LOCALE['en-US']!
}

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
  const isAllocated = assetStatus === AssetStatus.ALLOCATED
  const isRetired = assetStatus === AssetStatus.RETIRED
  const locale = getCurrentActiveUserLocale()

  const staticFlowData = useMemo(() => {
    const labels = getActionLabels()
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: labels.actions,
        key: 'update-asset',
        label: labels.update_asset,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(assetId)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: labels.actions,
        key: 'allocate-asset',
        label: labels.allocate_asset,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(assetId)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: labels.actions,
        key: 'retrieve-asset',
        label: labels.retrieve_asset,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(assetId)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: labels.actions,
        key: 'retire-asset',
        label: labels.retire_asset,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetireAsset(assetId)
        }
      })
    }

    if (isRetired && onGenerateDocument) {
      actions.push({
        category: labels.actions,
        key: 'generate-document',
        label: labels.export_certificate,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onGenerateDocument(assetId)
        }
      })
    }

    return actions
  }, [
    locale,
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
