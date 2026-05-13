import React, { useEffect } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Alert } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { useTileSubmission } from '../hooks/useTileSubmission'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { INVESTMENT_ERRORS } from '../utils/investmentPopupUtils'
import { findTileById, TileData } from '@/common/components/investment/tiles'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const prefixDataTestId = 'investment-kpi-tile-component'

// Form validation schema
const kpiTileFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  kpiValue: z.string().trim().min(1, 'Value is required'),
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
  // Use common setup hook
  const { businessAppContext, investmentId, investment, loading, error } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
    scope: 'kpi'
  })

  // Use tile submission hook
  const { isEditMode, buildTileSubmission } = useTileSubmission({
    investment,
    businessAppContext,
    tileId,
    tileType: 'KPI',
    businessKeyPrefix: 'investment-kpi-tile'
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
    // Parse KPI value as number
    const numericValue = Number.parseFloat(formData.kpiValue)
    if (Number.isNaN(numericValue)) {
      throw new TypeError(getTranslationFromI18nKeyAndLabel('investment.tiles.invalidNumber', 'Invalid numeric value'))
    }

    // Build tile submission with specific data
    const { payload, tileData } = buildTileSubmission({
      title: formData.title,
      kpiValue: numericValue,
      kpiUnit: formData.kpiUnit || ''
    })

    // Call success callback
    if (onSave) {
      onSave(tileData)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  const formTitle = isEditMode
    ? getTranslationFromI18nKeyAndLabel('investment.tiles.editKpiTile', 'Edit KPI Tile')
    : getTranslationFromI18nKeyAndLabel('investment.tiles.createKpiTile', 'Create KPI Tile')

  return (
    <InvestmentPopupFormWrapper
      loading={loading}
      error={error}
      investment={investment}
      onSubmit={handleSubmit}
      onClose={onClose}
      form={form}
      businessAppContext={businessAppContext}
      prefixDataTestId={prefixDataTestId}
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.tiles.loading', 'Loading investment data...')}
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
    </InvestmentPopupFormWrapper>
  )
}

export default InvestmentKpiTileComponent
