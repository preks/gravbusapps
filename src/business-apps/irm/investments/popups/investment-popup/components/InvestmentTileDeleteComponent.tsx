import React from 'react'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { WarningIcon, TrashIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'
import {
  deleteTile,
  loadTilesFromInvestment,
  parseAdditionalProperties
} from '@/common/components/investment/tiles/utils/tileUtils'

interface InvestmentTileDeleteComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: () => void
}

const prefixDataTestId = 'investment-tile-delete'

export const InvestmentTileDeleteComponent: React.FC<InvestmentTileDeleteComponentProps> = ({ onClose, ...props }) => {
  // Extract tileId from additionalData
  const tileId = props.additionalData?.tileId || props.additionalData?.psi_taskPayload?.psi_initialParameters?.tileId

  // Use common form setup hook
  const { businessAppContext, investment, loading, error } = useInvestmentPopupForm({
    ...props,
    scope: 'delete'
  })

  // Find the tile to get its title for display
  const tiles = investment ? loadTilesFromInvestment(investment) : []
  const tileToDelete = tiles.find(t => t.id === tileId)

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!investment || !tileId) {
      throw new Error('Missing investment or tile ID')
    }

    // Get current tiles
    const currentTiles = loadTilesFromInvestment(investment)

    // Remove the tile
    const updatedTiles = deleteTile(currentTiles, tileId)

    // Update additionalProperties
    const additionalProps = parseAdditionalProperties(investment.additionalProperties)
    const updatedAdditionalProps = {
      ...additionalProps,
      tilesData: updatedTiles
    }

    // Build payload using helper
    const payload = buildInvestmentPopupPayload({
      investment,
      updatedAdditionalProperties: updatedAdditionalProps,
      businessAppContext,
      businessKeyPrefix: 'investment-tile-delete',
      businessKeySuffix: tileId
    })

    return payload
  }

  // Validate tileId
  if (!tileId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-tile-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'investment.tiles.error.missingTileId',
            'No tile ID found. Cannot delete tile.'
          )}
        </Alert>
      </div>
    )
  }

  // Validate tile exists
  if (investment && !tileToDelete) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-tile-not-found`}>
          {getTranslationFromI18nKeyAndLabel(
            'investment.tiles.error.tileNotFound',
            'Tile not found. It may have already been deleted.'
          )}
        </Alert>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('investment.popup.loading', 'Loading investment data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
          {error}
        </Alert>
      </div>
    )
  }

  // Return null if no investment data
  if (!investment) {
    return null
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleDelete}
      onCancel={onClose}
      formData={{}}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-content`}>
        {/* Warning Icon and Message */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:bg-destructive/10 gba:rounded-lg gba:border gba:border-destructive/20">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive/20">
            <WarningIcon className="gba:w-5 gba:h-5 gba:text-destructive" />
          </div>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.tiles.deleteConfirmMessage',
                'Are you sure you want to delete this tile?'
              )}
            </p>
            {tileToDelete && (
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                <span className="gba:font-semibold">{tileToDelete.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Warning Text */}
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-warning`}>
          <TrashIcon className="gba:h-4 gba:w-4" />
          <div>
            <p className="gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('investment.tiles.deleteWarningTitle', 'This action cannot be undone')}
            </p>
            <p className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'investment.tiles.deleteWarningText',
                'The tile and all its data will be permanently deleted from this investment.'
              )}
            </p>
          </div>
        </Alert>
      </div>
    </AppActionForm>
  )
}
