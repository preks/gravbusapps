import React, { useEffect } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Alert,
  Spinner
} from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupData } from '../hooks/useInvestmentPopupData'
import { useInvestmentTileFields } from '../hooks/useInvestmentTileFields'
import { InvestmentTileComponentProps, TileFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'

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

    // Determine investment group type
    const groupRef = investment.investmentGroup?.id || ''
    const groupType = groupRef.split(':').pop()

    // Create investment form data using new nested structure with full objects
    const investmentFormData: any = {
      investment: {
        id: investmentId,
        version: investment.version,
        name: investment.name || '',
        initialInvestmentAmount: investment.initialInvestmentAmount || 0,
        investmentGroup: investment.investmentGroup, // Full object
        ownerEmployee: investment.ownerEmployee, // Full object

        // Include ALL existing investment fields to preserve them
        code: investment.code,
        isin: investment.isin,
        investmentType: investment.investmentType, // Full object
        investmentStakeType: investment.investmentStakeType, // Full object
        investmentPhase: investment.investmentPhase, // Full object
        investmentStatus: investment.investmentStatus, // Full object
        investmentRiskLevel: investment.investmentRiskLevel, // Full object
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
        currency: investment.currency, // Full object
        fundManagerName: investment.fundManagerName,
        identification: investment.identification,
        investmentAccount: investment.investmentAccount, // Full object
        investmentOpportunity: investment.investmentOpportunity?.id,
        loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id,
        additionalProperties: updatedAdditionalProps
      }
    }

    // CRITICAL: Add the appropriate subtype based on investment group (required by API)
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

    // Use the central payload builder to preserve all existing data
    const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add changeMode to the payload
    ;(payload as any).changeMode = 'UPDATE'

    // Call success callback with updated values
    if (onSave) {
      onSave(tileKey, formData.tileValue)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  // Show loading state (investment data or tile fields)
  if (loading || tilesLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('investment.tile.loading', 'Loading investment data...')}
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

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
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
    </AppActionForm>
  )
}
