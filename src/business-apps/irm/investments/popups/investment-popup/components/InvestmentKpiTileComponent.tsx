import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
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

const prefixDataTestId = 'investment-kpi-tile-component'

// Form validation schema
const kpiTileFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  kpiValue: z.string().min(1, 'Value is required'),
  kpiUnit: z.string().optional()
})

type KpiTileFormData = z.infer<typeof kpiTileFormSchema>

interface InvestmentKpiTileComponentProps extends BusinessAppContextProps {
  onClose: () => void
  onSave?: (tileData: TileData) => void
  tileId?: string
}

export const InvestmentKpiTileComponent: React.FC<InvestmentKpiTileComponentProps> = ({
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
    scope: 'kpi'
  })

  // Initialize form
  const form = useForm<KpiTileFormData>({
    resolver: zodResolver(kpiTileFormSchema),
    defaultValues: {
      title: '',
      kpiValue: '',
      kpiUnit: ''
    }
  })

  // Load existing tile data if editing
  useEffect(() => {
    if (investment && isEditMode && tileId) {
      const existingTile = findTileById(investment, tileId)
      if (existingTile) {
        form.reset({
          title: existingTile.title || '',
          kpiValue: existingTile.kpiValue?.toString() || '',
          kpiUnit: existingTile.kpiUnit || ''
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
  const handleSubmit = async (formData: KpiTileFormData) => {
    validateInvestmentData(investment)

    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    // Get current tiles
    const currentTiles = loadTilesFromInvestment(investment)

    // Parse KPI value as number
    const numericValue = parseFloat(formData.kpiValue)
    if (isNaN(numericValue)) {
      throw new Error(getTranslationFromI18nKeyAndLabel('investment.tiles.invalidNumber', 'Invalid numeric value'))
    }

    // Create or update tile
    const tileData: TileData = {
      id: tileId || generateTileId(),
      type: TILE_TYPES.KPI,
      title: formData.title,
      kpiValue: numericValue,
      kpiUnit: formData.kpiUnit || '',
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
      businessKeyPrefix: 'investment-kpi-tile',
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
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editKpiTile', 'Edit KPI Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createKpiTile', 'Create KPI Tile')

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
                {getTranslationFromI18nKeyAndLabel('investment.tiles.kpiNameLabel', 'KPI Name')}{' '}
                <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'investment.tiles.kpiNamePlaceholder',
                    'Enter KPI name (e.g., ROI, Growth Rate)'
                  )}
                  data-testid={formatDataTestId(prefixDataTestId, 'title-input')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* KPI Value and Unit - Side by Side */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* KPI Value Input */}
          <FormField
            control={form.control}
            name="kpiValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('investment.tiles.valueLabel', 'Value')}{' '}
                  <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'investment.tiles.valuePlaceholder',
                      'Enter numeric value'
                    )}
                    data-testid={formatDataTestId(prefixDataTestId, 'value-input')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* KPI Unit Input */}
          <FormField
            control={form.control}
            name="kpiUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('investment.tiles.unitLabel', 'Unit (Optional)')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'investment.tiles.unitPlaceholder',
                      'e.g., %, x, $, M€'
                    )}
                    data-testid={formatDataTestId(prefixDataTestId, 'unit-input')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </AppActionForm>
  )
}

export default InvestmentKpiTileComponent
