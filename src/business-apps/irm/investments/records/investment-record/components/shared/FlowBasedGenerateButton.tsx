import React, { useState, useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentReportData, BaseInvestment } from '../../hooks/useInvestmentReportData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { InvestmentReportPdfModal } from './InvestmentReportPdfModal'
import { useReportGenerationMonitor } from './useReportGenerationMonitor'

// =============================================================================
// FLOW-BASED GENERATE BUTTON (Enhanced with Complete Payload)
// =============================================================================

export interface FlowBasedGenerateButtonProps extends Partial<BusinessAppContextProps> {
  investmentId: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  investmentData?: BaseInvestment
}

export const FlowBasedGenerateButton: React.FC<FlowBasedGenerateButtonProps> = ({
  investmentId,
  variant = 'default',
  size = 'default',
  accessToken,
  userInfo,
  investmentData
}) => {
  // Storage keys for persisting modal state across re-renders
  const MODAL_STORAGE_KEY = `investment-report-modal-${investmentId}`
  const MODAL_DATA_STORAGE_KEY = `investment-report-modal-data-${investmentId}`

  // Initialize state from sessionStorage to survive component remounts
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(() => {
    try {
      const stored = sessionStorage.getItem(MODAL_STORAGE_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })
  const [pdfModalData, setPdfModalData] = useState<{
    url: string
    fileName: string
  } | null>(() => {
    try {
      const stored = sessionStorage.getItem(MODAL_DATA_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Initialize hooks to prepare complete payload
  const { transformInvestmentToPayload } = useInvestmentReportData({
    accessToken: accessToken || '',
    userInfo
  } as BusinessAppContextProps)

  // Extract file path from FileInfo string and construct proper URL
  const extractFilePathFromReportPath = (reportPath: string): string => {
    try {
      // Parse FileInfo string to get the path
      // Example: "FileInfo(appName=investment_relations, fileId=investment-report-Co-Investments-1758641093671.pdf, folderPath=/generated-reports, accessScope=null, path=/api/v1/tenant/downloads/investment_relations/generated-reports/investment-report-Co-Investments-1758641093671.pdf, fileMetadata=null)"
      const pathMatch = reportPath.match(/path=([^,\s)]+)/)
      if (pathMatch) {
        const extractedPath = pathMatch[1]

        // Return the extracted path; let the consumer/client build the full URL or download via FileClient
        return extractedPath
      }

      // Return empty string instead of null for consistent type
      return ''
    } catch {
      // Return empty string instead of null for consistent type
      return ''
    }
  }

  // Extract filename from FileInfo string
  const extractFileNameFromReportPath = (reportPath: string): string => {
    try {
      const fileIdMatch = reportPath.match(/fileId=([^,\s)]+)/)
      return fileIdMatch ? fileIdMatch[1] : 'investment-report.pdf'
    } catch {
      return 'investment-report.pdf'
    }
  }

  // Show generated report in PDF modal viewer
  const handleShowGeneratedReport = useCallback(
    (downloadPath: string, fileName: string) => {
      try {
        if (!accessToken) {
          console.error('Authentication required to view report')
          return
        }

        // Build the full URL using current origin to avoid CORS issues
        // This ensures we use the same domain as the application (e.g., https://newwork-dev.newwork.com)
        const baseUrl = window.location.origin
        const fullUrl = `${baseUrl}/files${downloadPath}`

        // Set modal data and show it
        const modalData = { url: fullUrl, fileName }

        // Persist to sessionStorage so state survives component remounts
        try {
          sessionStorage.setItem(MODAL_STORAGE_KEY, 'true')
          sessionStorage.setItem(MODAL_DATA_STORAGE_KEY, JSON.stringify(modalData))
        } catch (e) {
          console.warn('Could not persist modal state:', e)
        }

        setPdfModalData(modalData)
        setShowPdfModal(true)
        setIsGenerating(false)
      } catch (error) {
        console.error('Failed to open report viewer:', error)
        setIsGenerating(false)
      }
    },
    [accessToken, MODAL_STORAGE_KEY, MODAL_DATA_STORAGE_KEY]
  )

  // Use monitoring hook for report generation events
  useReportGenerationMonitor({
    onReportGenerated: handleShowGeneratedReport,
    setIsGenerating,
    extractFilePathFromReportPath,
    extractFileNameFromReportPath
  })

  // Prepare complete payload for flow
  const getFlowContextData = () => {
    if (investmentData) {
      const completePayload = transformInvestmentToPayload(investmentData)

      const contextData = {
        investmentId,
        ...completePayload // Includes reportPath, templateName, reportData
      }

      return contextData
    }

    // Fallback to basic data if no investment data available
    const fallbackData = { investmentId }
    return fallbackData
  }

  const handleAppActionClick = () => {
    setIsGenerating(true)
  }

  return (
    <>
      <div onClick={handleAppActionClick} data-testid="investment-record-generate-one-pager-wrapper">
        <AppAction
          contextsArray={[FlowContextName.investmentReportGenerate]}
          externalContextData={getFlowContextData()}
          accessToken={accessToken}
          emptyStateBehavior="enable"
          prefixDataTestId="investment-record-generate-one-pager"
        >
          <Button
            variant={variant}
            size={size}
            className="gba:flex gba:items-center"
            style={{ gap: 'var(--nw-spacing-sm)' }}
            data-testid="generate-investment-one-pager-button"
            disabled={isGenerating}
          >
            <Eye style={{ height: '1rem', width: '1rem' }} />
            {isGenerating
              ? getTranslationFromI18nKeyAndLabel('investment.reports.generating', 'Generating...')
              : getTranslationFromI18nKeyAndLabel('investment.reports.generateOnePager', 'Generate One-Pager')}
          </Button>
        </AppAction>
      </div>

      {/* PDF Modal */}
      {showPdfModal && (
        <InvestmentReportPdfModal
          isVisible={showPdfModal}
          reportUrl={pdfModalData?.url || ''}
          reportFileName={pdfModalData?.fileName || 'investment-report.pdf'}
          isLoading={isGenerating}
          onClose={() => {
            // Clear sessionStorage when modal closes
            try {
              sessionStorage.removeItem(MODAL_STORAGE_KEY)
              sessionStorage.removeItem(MODAL_DATA_STORAGE_KEY)
            } catch (e) {
              console.warn('Could not clear modal state:', e)
            }

            setShowPdfModal(false)
            setPdfModalData(null)
          }}
          accessToken={accessToken}
        />
      )}
    </>
  )
}

export default FlowBasedGenerateButton
