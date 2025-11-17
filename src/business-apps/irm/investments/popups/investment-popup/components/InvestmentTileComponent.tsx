import React, { useEffect } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea, Alert } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { useInvestmentTileFields } from '../hooks/useInvestmentTileFields'
import { InvestmentTileComponentProps, TileFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'

const prefixDataTestId = 'investment-tile-component'

// Form validation schema (allow empty string to clear the field)
const tileFormSchema = z.object({
  tileValue: z.string()
})

export const InvestmentTileComponent: React.FC<InvestmentTileComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData,
  tileKey
}) => {
  // Create business app context
  const businessAppContext = {
    accessToken,
    userInfo,
    additionalData
  }

  // Extract investmentId from additionalData
  const investmentId =
    additionalData?.investmentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.id

  // Use the hook for data loading (always call hooks first)
  const { investment, tileValue, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'tile',
    tileKey
  })

  // Get tile fields definition to find the label for this tileKey
  const { processedTiles, loading: tilesLoading } = useInvestmentTileFields(businessAppContext, investment)

  // Find the label for the current tileKey
  const tileLabel = React.useMemo(() => {
    if (!processedTiles.length || !tileKey)
      return getTranslationFromI18nKeyAndLabel('investment.tile.defaultLabel', 'Tile Value')

    const tileField = processedTiles.find(tile => tile.key === tileKey)
    return tileField?.label || getTranslationFromI18nKeyAndLabel('investment.tile.defaultLabel', 'Tile Value')
  }, [processedTiles, tileKey])

  // Form setup with automatic sync to tileValue from hook
  const form = useForm<TileFormData>({
    resolver: zodResolver(tileFormSchema),
    defaultValues: {
      tileValue: ''
    }
  })

  // Validate required data after hooks have been called
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-investment-id`}>
        {getTranslationFromI18nKeyAndLabel('investment.tile.error.missingId', 'No investment ID found in context data')}
      </Alert>
    )
  }

  if (!tileKey) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-tile-key`}>
        {getTranslationFromI18nKeyAndLabel('investment.tile.error.missingTileKey', 'No tile key found in context data')}
      </Alert>
    )
  }

  // Sync form with loaded tile value
  useEffect(() => {
    if (tileValue !== undefined) {
      form.reset({
        tileValue: tileValue
      })
    }
  }, [tileValue, form])

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: TileFormData) => {
    if (!investment) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('investment.tile.error.dataNotLoaded', 'Investment data not loaded')
      )
    }

    // Get current additionalProperties (defensive: may be JSON string)
    const rawAdditionalProps = investment.additionalProperties
    let currentAdditionalProps: Record<string, any> = {}
    if (typeof rawAdditionalProps === 'string') {
      try {
        currentAdditionalProps = JSON.parse(rawAdditionalProps) || {}
      } catch {
        currentAdditionalProps = {}
      }
    } else if (rawAdditionalProps && typeof rawAdditionalProps === 'object') {
      currentAdditionalProps = rawAdditionalProps
    }
    const currentTiles = (currentAdditionalProps as any).tiles || {}

    // Update the specific tile using tileKey from props
    const updatedTiles = {
      ...currentTiles,
      [tileKey]: formData.tileValue
    }

    // Create updated additionalProperties
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      tiles: updatedTiles
    }

    // Create business app context
    const businessAppContext = {
      accessToken,
      userInfo,
      additionalData
    }

    // Build the payload using the centralized helper
    const payload = buildInvestmentPopupPayload({
      investment,
      updatedAdditionalProperties: updatedAdditionalProps,
      businessAppContext,
      businessKeyPrefix: 'investment-tile',
      businessKeySuffix: tileKey
    })

    // Call success callback with updated values
    if (onSave) {
      onSave(tileKey, formData.tileValue)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  return (
    <InvestmentPopupFormWrapper
      loading={loading || tilesLoading}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.tile.button.save', 'Save Tile')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        {/* Tile Value Field with Dynamic Label */}
        <FormField
          control={form.control}
          name="tileValue"
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-tile-value-field`}>
              <FormLabel>{tileLabel}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tile.placeholder',
                    `Enter ${tileLabel.toLowerCase()}`
                  )}
                  rows={6}
                  data-testid={`${prefixDataTestId}-tile-value-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </InvestmentPopupFormWrapper>
  )
}
