import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Alert, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// =============================================================================
// INVESTMENT REPORT PDF MODAL
// =============================================================================

export interface InvestmentReportPdfModalProps {
  isVisible: boolean
  reportUrl: string
  reportFileName: string
  isLoading: boolean
  error?: string | null
  onClose: () => void
  accessToken?: string
}

export const InvestmentReportPdfModal: React.FC<InvestmentReportPdfModalProps> = ({
  isVisible,
  reportUrl,
  reportFileName,
  isLoading,
  error,
  onClose,
  accessToken
}) => {
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [documentError, setDocumentError] = useState<string>('')
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)

  // Fetch document with authentication when modal opens
  useEffect(() => {
    if (!isVisible || !reportUrl || !accessToken) {
      return
    }

    const fetchDocument = async () => {
      setIsLoadingDocument(true)
      setDocumentError('')

      try {
        // Use direct fetch with proper authentication for file downloads
        const response = await fetch(reportUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/pdf, application/octet-stream, */*'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to download document: HTTP ${response.status} - ${response.statusText}`)
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setDocumentUrl(objectUrl)
      } catch (err) {
        setDocumentError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setIsLoadingDocument(false)
      }
    }

    fetchDocument()
  }, [isVisible, reportUrl, accessToken])

  const handleClose = () => {
    // Clean up the object URL when closing
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl)
      setDocumentUrl('')
    }
    setDocumentError('')
    onClose()
  }

  const loading = isLoading || isLoadingDocument
  const hasError = error || documentError
  const canShowDocument = documentUrl && !loading && !hasError

  return (
    <Dialog open={isVisible} onOpenChange={handleClose} data-testid="investment-report-modal">
      <DialogContent
        className="gba:max-w-[90vw] gba:max-h-[90vh] gba:w-full"
        data-testid="investment-report-modal-content"
      >
        <DialogHeader
          className="gba:flex gba:flex-row gba:items-center gba:justify-center"
          style={{ paddingBottom: 'var(--nw-spacing-md)' }}
          data-testid="investment-report-modal-header"
        >
          <DialogTitle className="gba:font-semibold" style={{ fontSize: 'var(--nw-text-lg)' }}>
            {getTranslationFromI18nKeyAndLabel('investment.reports.pdfViewer', 'Investment Report')}
          </DialogTitle>
        </DialogHeader>

        <div
          style={{
            marginTop: 'var(--nw-spacing-md)',
            backgroundColor: 'var(--nw-color-surface-primary)',
            minHeight: '80vh'
          }}
        >
          {loading ? (
            <div
              className="gba:flex gba:flex-col gba:justify-center gba:items-center"
              style={{
                height: '24rem',
                gap: 'var(--nw-spacing-md)'
              }}
              data-testid="investment-report-loading"
            >
              <Spinner size="lg" />
              <div
                style={{
                  fontSize: 'var(--nw-text-sm)',
                  color: 'var(--nw-color-text-secondary)'
                }}
              >
                {getTranslationFromI18nKeyAndLabel('investment.reports.loading', 'Loading investment report...')}
              </div>
            </div>
          ) : hasError ? (
            <div
              className="gba:flex gba:justify-center gba:items-center"
              style={{ height: '24rem' }}
              data-testid="investment-report-error"
            >
              <Alert
                variant="destructive"
                title={getTranslationFromI18nKeyAndLabel('investment.reports.error', 'Error Loading Report')}
                style={{ maxWidth: '28rem' }}
                data-testid="investment-report-error-alert"
              >
                {hasError}
              </Alert>
            </div>
          ) : canShowDocument ? (
            <iframe
              src={documentUrl}
              className="gba:w-full gba:border-0"
              style={{ height: 'calc(90vh - 120px)' }}
              title={reportFileName}
              data-testid="investment-report-pdf-iframe"
            />
          ) : (
            <div
              className="gba:flex gba:justify-center gba:items-center"
              style={{ height: '24rem' }}
              data-testid="investment-report-no-url"
            >
              <div className="gba:text-center">
                <div
                  className="gba:font-medium"
                  style={{
                    fontSize: 'var(--nw-text-lg)',
                    marginBottom: 'var(--nw-spacing-sm)'
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel('investment.reports.noUrl', 'No report URL available')}
                </div>
                <div
                  style={{
                    fontSize: 'var(--nw-text-sm)',
                    color: 'var(--nw-color-text-muted)'
                  }}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'investment.reports.noUrlDesc',
                    'Report URL could not be constructed'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvestmentReportPdfModal
