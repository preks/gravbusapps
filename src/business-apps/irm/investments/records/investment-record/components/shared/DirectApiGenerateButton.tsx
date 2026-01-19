import React, { useState } from 'react'
import { Button, Alert } from '@newwork/nw-design-system'
import { FileTextIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentReportClient } from '@/common/network/investment-reports'
import { useInvestmentReportData, BaseInvestment } from '../../hooks/useInvestmentReportData'

// =============================================================================
// DIRECT API GENERATE BUTTON (Internal Component)
// =============================================================================

export interface DirectApiGenerateButtonProps extends Partial<BusinessAppContextProps> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  investmentData?: BaseInvestment
}

export const DirectApiGenerateButton: React.FC<DirectApiGenerateButtonProps> = ({
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  investmentData
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize hooks for direct API approach
  const reportClient = useInvestmentReportClient(accessToken || '')
  const { transformInvestmentToPayload } = useInvestmentReportData({
    accessToken: accessToken || '',
    userInfo
  } as BusinessAppContextProps)

  if (!accessToken) {
    return null // Don't render if no access token
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      // 🔥 ALWAYS USE PRE-LOADED DATA - NO ADDITIONAL API CALLS
      if (!investmentData) {
        throw new Error(
          getTranslationFromI18nKeyAndLabel(
            'investment.reports.noInvestmentData',
            'Investment data not available. Please refresh the page.'
          )
        )
      }

      // Use existing investment data instead of fetching
      const reportPayload = transformInvestmentToPayload(investmentData)

      // Generate the report
      const response = await reportClient.generateInvestmentReport(reportPayload)

      if (response.success) {
        // If the API returns a download URL, open it using platform navigation
        if (response.reportUrl) {
          const url = buildPlatformUrl(response.reportUrl)
          navigateTo(url)
        }
      } else {
        throw new Error(
          response.message ||
            getTranslationFromI18nKeyAndLabel('investment.reports.generateFailed', 'Report generation failed')
        )
      }
    } catch (err) {
      const unknownError = getTranslationFromI18nKeyAndLabel('common.unknownError', 'Unknown error occurred')
      const errorMessage = err instanceof Error ? err.message : unknownError
      setError(errorMessage)
      console.error(
        '❌ Report generation failed:',
        getTranslationFromI18nKeyAndLabel('investment.reports.generateError', 'Failed to generate report: ') +
          errorMessage
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nw-spacing-sm)' }}
      data-testid="generate-investment-one-pager-container"
    >
      {error && (
        <Alert
          variant="destructive"
          title={getTranslationFromI18nKeyAndLabel('investment.reports.generationError', 'Report Generation Error')}
          data-testid="generate-investment-one-pager-error"
        >
          {error}
        </Alert>
      )}

      <Button
        variant={variant}
        size={size}
        className="gba:flex gba:items-center"
        style={{ gap: 'var(--nw-spacing-sm)' }}
        onClick={handleGenerateReport}
        disabled={isGenerating}
        data-testid="generate-investment-one-pager-button"
      >
        <FileTextIcon style={{ height: '1rem', width: '1rem' }} />
        {isGenerating
          ? getTranslationFromI18nKeyAndLabel('investment.reports.generating', 'Generating...')
          : getTranslationFromI18nKeyAndLabel('investment.reports.generateOnePager', 'Generate One-Pager')}
      </Button>
    </div>
  )
}

export default DirectApiGenerateButton
