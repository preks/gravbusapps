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
import { InvestmentKpiComponentProps, KpiFormData } from '../types'
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

const prefixDataTestId = 'investment-kpi-component'

// Form validation schema
const kpiFormSchema = z.object({
  kpiValue: z.string().min(1, 'Value is required')
})

// KPI labels mapping
const KPI_LABELS: Record<string, { label: string; i18nKey: string }> = {
  moic: {
    i18nKey: 'investment.kpi.moic.label',
    label: 'Planned MOIC'
  },
  irr: {
    i18nKey: 'investment.kpi.irr.label',
    label: 'Planned IRR (%)'
  }
}

export const InvestmentKpiComponent: React.FC<InvestmentKpiComponentProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData,
  kpiKey
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }

  // Extract investmentId
  const investmentId = extractInvestmentId(additionalData)

  // Load investment data
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope: 'kpi'
  })

  // Get KPI label
  const kpiLabel = React.useMemo(() => {
    const kpiConfig = KPI_LABELS[kpiKey]
    if (!kpiConfig) {
      return getTranslationFromI18nKeyAndLabel('investment.kpi.defaultLabel', 'KPI Value')
    }
    return getTranslationFromI18nKeyAndLabel(kpiConfig.i18nKey, kpiConfig.label)
  }, [kpiKey])

  // Initialize form
  const form = useForm<KpiFormData>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      kpiValue: ''
    }
  })

  // Load existing KPI value from additionalProperties.kpis
  // This hook MUST be called before any conditional returns
  useEffect(() => {
    if (investment && kpiKey) {
      const investmentData = investment as any
      const equityInvestment = Array.isArray(investmentData.equityInvestment)
        ? investmentData.equityInvestment[0]
        : investmentData.equityInvestment

      const additionalProps = parseAdditionalProperties(equityInvestment?.additionalProperties)
      const kpis = additionalProps?.kpis || {}
      const kpiValue = kpis[kpiKey] || ''

      form.reset({ kpiValue })
    }
  }, [investment, kpiKey, form])

  // Validate required data (after all hooks are called)
  if (!investmentId) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'missing-investment-id')}>
        {INVESTMENT_ERRORS.MISSING_ID()}
      </Alert>
    )
  }

  if (!kpiKey) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(prefixDataTestId, 'missing-kpi-key')}>
        {getTranslationFromI18nKeyAndLabel('investment.kpi.error.missingKpiKey', 'No KPI key found in context data')}
      </Alert>
    )
  }

  // Handle form submission
  const handleSubmit = async (formData: KpiFormData) => {
    validateInvestmentData(investment)

    // After validation, investment is guaranteed to exist
    if (!investment) {
      throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
    }

    // Get current additionalProperties from equityInvestment
    const investmentData = investment as any
    const equityInvestment = Array.isArray(investmentData.equityInvestment)
      ? investmentData.equityInvestment[0]
      : investmentData.equityInvestment

    const currentAdditionalProps = parseAdditionalProperties(equityInvestment?.additionalProperties)

    // Update the specific KPI
    const existingKpis = currentAdditionalProps?.kpis || {}
    const updatedKpis = {
      ...existingKpis,
      [kpiKey]: formData.kpiValue
    }

    // Update additionalProperties with new KPIs
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      kpis: updatedKpis
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
        additionalProperties: investment.additionalProperties
      }
    }

    // Add the appropriate subtype based on investment group (with updated additionalProperties)
    if (groupType === 'EQUITY') {
      const existingEquity = Array.isArray((investment as any).equityInvestment)
        ? (investment as any).equityInvestment[0]
        : (investment as any).equityInvestment
      investmentFormData.equityInvestment = {
        ...existingEquity,
        additionalProperties: updatedAdditionalProps
      }
    } else if (groupType === 'REAL_ESTATE') {
      const existingRealEstate = Array.isArray((investment as any).realEstateInvestment)
        ? (investment as any).realEstateInvestment[0]
        : (investment as any).realEstateInvestment
      investmentFormData.realEstateInvestment = {
        ...existingRealEstate,
        additionalProperties: updatedAdditionalProps
      }
    } else if (groupType === 'LIQUID_FUND') {
      const existingLiquidFund = Array.isArray((investment as any).liquidFundInvestment)
        ? (investment as any).liquidFundInvestment[0]
        : (investment as any).liquidFundInvestment
      investmentFormData.liquidFundInvestment = {
        ...existingLiquidFund,
        additionalProperties: updatedAdditionalProps
      }
    }

    // Build the payload using buildInvestmentPayload with rawInvestmentData
    const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
      isUpdate: true,
      rawInvestmentData: investment
    })

    // Add changeMode
    ;(payload as any).changeMode = 'UPDATE'

    // Add businessKey
    ;(payload as any).businessKey = generateBusinessKey('investment-kpi', kpiKey)

    // Call success callback with updated values
    if (onSave) {
      onSave(kpiKey, formData.kpiValue)
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
          {getTranslationFromI18nKeyAndLabel('investment.kpi.loading', 'Loading investment data...')}
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
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.kpi.save', 'Save')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        {/* KPI Value Input */}
        <FormField
          control={form.control}
          name="kpiValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {kpiLabel} <span className="gba:text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step={kpiKey === 'moic' ? '0.1' : '0.01'}
                  placeholder={kpiKey === 'moic' ? '3.5' : '22.5'}
                  data-testid={formatDataTestId(prefixDataTestId, 'input')}
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

export default InvestmentKpiComponent
