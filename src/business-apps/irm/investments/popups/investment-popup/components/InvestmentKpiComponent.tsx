import React, { useEffect } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Alert } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentPopupForm } from '../hooks/useInvestmentPopupForm'
import { InvestmentPopupFormWrapper } from './InvestmentPopupFormWrapper'
import { InvestmentKpiComponentProps, KpiFormData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  getSubtypeOrInvestmentAdditionalProperties,
  validateInvestmentData,
  INVESTMENT_ERRORS
} from '../utils/investmentPopupUtils'
import { buildInvestmentSubtypePayload } from '../utils/investmentPopupPayloadHelper'

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
  // Use common setup hook
  const { businessAppContext, investmentId, investment, loading, error } = useInvestmentPopupForm({
    accessToken,
    userInfo,
    additionalData,
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
      const additionalProps = getSubtypeOrInvestmentAdditionalProperties(investment)
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

    // Get current additionalProperties from subtype (equityInvestment, realEstateInvestment, etc.)
    const currentAdditionalProps = getSubtypeOrInvestmentAdditionalProperties(investment)

    // Update the specific KPI
    const existingKpis = currentAdditionalProps?.kpis || {}
    const updatedKpis = {
      ...existingKpis,
      [kpiKey]: formData.kpiValue
    }

    // Update additionalProperties with new KPIs
    const updatedSubtypeAdditionalProperties = {
      ...currentAdditionalProps,
      kpis: updatedKpis
    }

    // Build the payload using the centralized helper for subtype updates
    const payload = buildInvestmentSubtypePayload({
      investment,
      updatedSubtypeAdditionalProperties,
      businessAppContext,
      businessKeyPrefix: 'investment-kpi',
      businessKeySuffix: kpiKey
    })

    // Call success callback with updated values
    if (onSave) {
      onSave(kpiKey, formData.kpiValue)
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

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
      loadingMessage={getTranslationFromI18nKeyAndLabel('investment.kpi.loading', 'Loading investment data...')}
      submitButtonText={getTranslationFromI18nKeyAndLabel('investment.kpi.save', 'Save')}
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
    </InvestmentPopupFormWrapper>
  )
}

export default InvestmentKpiComponent
