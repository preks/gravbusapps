import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Alert,
  Spinner
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  extractInvestmentId,
  parseAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS
} from '../utils/investmentPopupUtils'
import { buildInvestmentPopupPayload } from '../utils/investmentPopupPayloadHelper'
import {
  generateTileId,
  loadTilesFromInvestment,
  findTileById,
  upsertTile
} from '@/business-apps/irm/common/utils/tileUtils'
import { TileData, TILE_TYPES } from '@/business-apps/irm/common/types/tileTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const prefixDataTestId = 'investment-text-tile-component'

// Form validation schema
const textTileFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  textContent: z.string().optional()
})

type TextTileFormData = z.infer<typeof textTileFormSchema>

interface InvestmentTextTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileData: TileData) => void
  tileId?: string
}

export const InvestmentTextTileComponent: React.FC<InvestmentTextTileComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData,
  tileId
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }

  // Extract investmentId
  const investmentId = extractInvestmentId(additionalData)

  // Determine if this is create or edit mode
  const isEditMode = !!tileId

  // Load investment data
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'text'
  })

  // Initialize form
  const form = useForm<TextTileFormData>({
    resolver: zodResolver(textTileFormSchema),
    defaultValues: {
      title: '',
      textContent: ''
    }
  })

  // Load existing tile data if editing
  useEffect(() => {
    if (investment && isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        form.reset({
          title: existingTile.title || '',
          textContent: existingTile.textContent || ''
        })
      }
    }
  }, [investment, isEditMode, tileId, form])

  // Validate required data (after all hooks are called)
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'missing-investment-id')}>
        {INVESTMENT_ERRORS.MISSING_ID()}
      </Alert>
    )
  }

  // Handle form submission
  const handleSubmit = async (formData: TextTileFormData) => {
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    // Get current tiles
    const currentTiles = loadTilesFromInvestment(investment)

    // Create or update tile
    const tileData: TileData = {
      id: tileId || generateTileId(),
      type: TILE_TYPES.TEXT,
      title: formData.title,
      textContent: formData.textContent || '',
      order: 0, // Will be calculated by upsertTile
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // If editing, preserve creation date and order
    if (isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        tileData.createdAt = existingTile.createdAt
        tileData.order = existingTile.order
      }
    }

    // Update tiles array
    const updatedTiles = upsertTile(currentTiles, tileData)

    // Get current additionalProperties
    const currentAdditionalProps = parseAdditionalProperties(investment.additionalProperties)

    // Update additionalProperties with new tiles
    const updatedAdditionalProperties = {
      ...currentAdditionalProps,
      tilesData: updatedTiles
    }

    // Build the payload using the centralized helper
    const payload = buildInvestmentPopupPayload({
      investment,
      updatedAdditionalProperties,
      businessAppContext,
      businessKeyPrefix: 'investment-text-tile',
      businessKeySuffix: tileData.id
    })

    // Call success callback
    if (onSave) {
      onSave(tileData)
    }

    // Return the payload for AppActionForm to handle
    return payload
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
          {getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        {error}
      </Alert>
    )
  }

  // Show form when investment data is loaded
  if (!investment) {
    return null
  }

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editTextTile', 'Edit Text Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createTextTile', 'Create Text Tile')

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.save', 'Save')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        <h3 className="gba:text-lg gba:font-semibold">{formTitle}</h3>

        {/* Title Input */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {getTranslationFromI18nKeyAndLabel('investment.tiles.titleLabel', 'Title')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.titlePlaceholder',
                    'Enter tile title'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'title-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Text Content Textarea */}
        <FormField
          control={form.control}
          name="textContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('investment.tiles.contentLabel', 'Content')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.contentPlaceholder',
                    'Enter text content...'
                  )}
                  rows={8}
                  data-testid={formatDataTestId(prefixDataTestId, 'content-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  )
}

export default InvestmentTextTileComponent
