import React from 'react'
import { AiButton } from '@newwork/nw-design-system'
import { UploadIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BaseInvestment } from '../../hooks/useInvestmentReportData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { DirectApiGenerateButton } from './DirectApiGenerateButton'
import { FlowBasedGenerateButton } from './FlowBasedGenerateButton'

// =============================================================================
// GENERATE ONE-PAGER BUTTON
// =============================================================================

export interface GenerateOnePagerButtonProps {
  /**
   * Access token for API requests (required)
   */
  accessToken: string

  /**
   * User information (optional)
   */
  userInfo?: BusinessAppContextProps['userInfo']

  /**
   * Additional data (optional)
   */
  additionalData?: BusinessAppContextProps['additionalData']

  /**
   * Investment ID to generate report for
   */
  investmentId?: string

  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg'

  /**
   * Use direct API approach instead of flow-based approach
   * When true: calls /generateInvestmentReport API directly with proper payload
   * When false/undefined: uses existing flow-based approach (default behavior)
   */
  useDirectApi?: boolean

  /**
   * Pre-loaded investment data to avoid duplicate API calls
   * When provided, this data will be used instead of fetching it again
   */
  investmentData?: BaseInvestment
}

export const GenerateOnePagerButton: React.FC<GenerateOnePagerButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  useDirectApi = false,
  investmentData
}) => {
  // Validate required props
  if (!accessToken) {
    console.warn('⚠️ GenerateOnePagerButton: Missing required accessToken')
    return null
  }

  const resolvedInvestmentId = investmentId ?? investmentData?.id

  if (!resolvedInvestmentId) {
    console.warn('⚠️ GenerateOnePagerButton: Missing required investmentId and no ID in investmentData')
    return null
  }

  // NEW DIRECT API APPROACH (opt-in with useDirectApi=true)
  if (useDirectApi) {
    if (!investmentData) {
      console.warn('⚠️ GenerateOnePagerButton: Direct API requires investmentData')
      return null
    }
    return (
      <DirectApiGenerateButton
        variant={variant}
        size={size}
        accessToken={accessToken}
        userInfo={userInfo}
        investmentData={investmentData}
      />
    )
  }

  // ORIGINAL FLOW-BASED APPROACH (default behavior) - Enhanced with complete payload
  return (
    <FlowBasedGenerateButton
      investmentId={resolvedInvestmentId}
      variant={variant}
      size={size}
      accessToken={accessToken}
      userInfo={userInfo}
      investmentData={investmentData}
    />
  )
}

// =============================================================================
// UPLOAD REPORT BUTTON
// =============================================================================

export interface UploadReportButtonProps extends BusinessAppContextProps {
  /**
   * Investment ID to pass to the upload flow
   */
  investmentId: string

  /**
   * Investment data for flow context (optional but recommended)
   */
  investment?: BaseInvestment

  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg'
}

export const UploadReportButton: React.FC<UploadReportButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken
}) => {
  if (!investmentId || !accessToken) {
    return null
  }

  return (
    <AppAction
      contexts={[{ context: FlowContextName.investmentReportUploadIcon, contextData: { investmentId } }]}
      accessToken={accessToken}
      emptyState="enable"
      prefixDataTestId="investment-record-upload-report"
    >
      <AiButton
        variant={variant}
        size={size}
        showIcon={true}
        icon={<UploadIcon style={{ height: '1rem', width: '1rem' }} />}
        iconPosition="before"
        data-testid="upload-investment-report-button"
      >
        {getTranslationFromI18nKeyAndLabel('investment.reports.uploadReport', 'Upload Report')}
      </AiButton>
    </AppAction>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  GenerateOnePagerButton,
  UploadReportButton
}
