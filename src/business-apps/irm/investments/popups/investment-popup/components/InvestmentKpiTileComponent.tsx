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
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  extractInvestmentId,
  parseAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS,
  getInvestmentGroupType,
  generateBusinessKey
} from '../utils/investmentPopupUtils'
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
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      tilesData: updatedTiles
    }

    // Determine investment group type
    const groupType = getInvestmentGroupType(investment)

    // Create investment form data using the full structure with all investment fields
    const investmentFormData: any = {
      investment: {
        id: investmentId,
        version: investment.version,
        name: investment.name || '',
        initialInvestmentAmount: investment.initialInvestmentAmount || 0,
        investmentGroup: investment.investmentGroup,
        ownerEmployee: investment.ownerEmployee,

        // Include ALL existing investment fields to preserve them
        code: investment.code,
        isin: investment.isin,
        investmentType: investment.investmentType,
        investmentStakeType: investment.investmentStakeType,
        investmentPhase: investment.investmentPhase,
        investmentStatus: investment.investmentStatus,
        investmentRiskLevel: investment.investmentRiskLevel,
        acquisitionDate: investment.acquisitionDate,
        planedExit: investment.planedExit,
        plannedExitDate: investment.plannedExitDate,
        exitDate: investment.exitDate,
        totalInvestmentAmount: investment.totalInvestmentAmount,
        investmentMarketValue: investment.investmentMarketValue,
        debtFinancingAmount: investment.debtFinancingAmount,
        requiredCapitalAmount: investment.requiredCapitalAmount,
        forecastedRevenueAmount: investment.forecastedRevenueAmount,
        forecastedProfitAmount: investment.forecastedProfitAmount,
        stakePercentage: investment.stakePercentage,
        loanRecipientName: investment.loanRecipientName,
        loanAmount: investment.loanAmount,
        loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount,
        loanInterestRate: investment.loanInterestRate,
        loanStartDate: investment.loanStartDate,
        loanEndDate: investment.loanEndDate,
        loanInterestClaim: investment.loanInterestClaim,
        totalCommitmentAmount: investment.totalCommitmentAmount,
        totalDistributionAmount: investment.totalDistributionAmount,
        currency: investment.currency,
        fundManagerName: investment.fundManagerName,
        identification: investment.identification,
        investmentAccount: investment.investmentAccount,
        investmentOpportunity: investment.investmentOpportunity?.id,
        loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id,
        additionalProperties: updatedAdditionalProps
      }
    }

    // Add the appropriate subtype based on investment group
    if (groupType === 'EQUITY') {
      const existingEquity = Array.isArray((investment as any).equityInvestment)
        ? (investment as any).equityInvestment[0]
        : (investment as any).equityInvestment
      investmentFormData.equityInvestment = existingEquity || {}
    } else if (groupType === 'REAL_ESTATE') {
      const existingRealEstate = Array.isArray((investment as any).realEstateInvestment)
        ? (investment as any).realEstateInvestment[0]
        : (investment as any).realEstateInvestment
      investmentFormData.realEstateInvestment = existingRealEstate || {}
    } else if (groupType === 'LIQUID_FUND') {
      const existingLiquidFund = Array.isArray((investment as any).liquidFundInvestment)
        ? (investment as any).liquidFundInvestment[0]
        : (investment as any).liquidFundInvestment
      investmentFormData.liquidFundInvestment = existingLiquidFund || {}
    }

    // Build the payload using buildInvestmentPayload
    const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add changeMode
    ;(payload as any).changeMode = 'UPDATE'

    // Add businessKey
    ;(payload as any).businessKey = generateBusinessKey('investment-kpi-tile', tileData.id)

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
