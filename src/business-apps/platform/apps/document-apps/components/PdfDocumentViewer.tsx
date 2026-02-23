/**
 * PdfDocumentViewer Component
 *
 * A read-only viewer for PDF documents stored in the file service.
 * Downloads the PDF and displays it in an iframe.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Button, Spinner, Badge } from '@newwork/nw-design-system'
import { ChevronLeft, FileText, Download, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { fileClient } from '@/common/network/files/FileClient'
import type { Document } from '../types'

export interface PdfDocumentViewerProps {
  document: Document
  accessToken: string
  onBack: () => void
  'data-testid'?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * PdfDocumentViewer Component
 */
export const PdfDocumentViewer: React.FC<PdfDocumentViewerProps> = ({
  document,
  accessToken,
  onBack,
  'data-testid': testId = 'pdf-document-viewer'
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  // Cleanup object URL on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [])

  /**
   * Load the PDF from file service
   */
  const loadPdf = useCallback(async () => {
    if (!document.sourceFile?.path) {
      setError('PDF file path not found')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Cleanup previous URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }

    try {
      // Download the PDF from file service
      const blob = await fileClient.downloadFileByPath(document.sourceFile.path, accessToken)

      if (!isMounted.current) return

      // Create object URL for the PDF
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      if (!isMounted.current) return
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF'
      setError(errorMessage)
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [document.sourceFile?.path, accessToken, pdfUrl])

  // Load PDF on mount
  useEffect(() => {
    loadPdf()
  }, [document.id]) // Only reload when document changes

  /**
   * Download the PDF
   */
  const handleDownload = useCallback(() => {
    if (!pdfUrl) return

    const link = window.document.createElement('a')
    link.href = pdfUrl
    link.download = document.sourceFile?.originalName || `${document.title}.pdf`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }, [pdfUrl, document.sourceFile?.originalName, document.title])

  /**
   * Open in new tab
   */
  const handleOpenInNewTab = useCallback(() => {
    if (!pdfUrl) return
    window.open(pdfUrl, '_blank')
  }, [pdfUrl])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      {/* Header */}
      <header className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:bg-card">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back-button`}>
            <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
            Back
          </Button>

          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-red-500/10 gba:flex gba:items-center gba:justify-center">
              <FileText className="gba:w-5 gba:h-5 gba:text-red-600" />
            </div>
            <div>
              <h1 className="gba:text-lg gba:font-semibold gba:text-foreground">{document.title}</h1>
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                <Badge variant="secondary" className="gba:text-xs">
                  PDF
                </Badge>
                {document.sourceFile?.fileSize && <span>{formatFileSize(document.sourceFile.fileSize)}</span>}
                {document.sourceFile?.pageCount && <span>{document.sourceFile.pageCount} pages</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {pdfUrl && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownload} data-testid={`${testId}-download-button`}>
                <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                data-testid={`${testId}-open-new-tab-button`}
              >
                <ExternalLink className="gba:w-4 gba:h-4 gba:mr-2" />
                Open in New Tab
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-hidden gba:bg-muted/30">
        {/* Loading state */}
        {isLoading && (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4"
            data-testid={`${testId}-loading`}
          >
            <Spinner size="lg" />
            <p className="gba:text-muted-foreground">Loading PDF...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:p-6"
            data-testid={`${testId}-error`}
          >
            <Card className="gba:max-w-md gba:p-6 gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
                <AlertCircle className="gba:w-8 gba:h-8 gba:text-destructive" />
              </div>
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">Failed to load PDF</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{error}</p>
              <Button variant="outline" onClick={loadPdf}>
                <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
                Try Again
              </Button>
            </Card>
          </div>
        )}

        {/* PDF Preview */}
        {pdfUrl && !isLoading && !error && (
          <iframe
            src={pdfUrl}
            className="gba:w-full gba:h-full gba:border-0"
            title={`PDF Preview: ${document.title}`}
            data-testid={`${testId}-iframe`}
          />
        )}
      </div>

      {/* Footer info */}
      <footer className="gba:px-4 gba:py-2 gba:border-t gba:bg-card">
        <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
          <span>
            Uploaded: {document.sourceFile?.uploadedAt && new Date(document.sourceFile.uploadedAt).toLocaleString()}
          </span>
          {document.sourceFile?.originalName && <span>Original: {document.sourceFile.originalName}</span>}
          <Badge variant="outline" className="gba:text-[10px]">
            Read-only
          </Badge>
        </div>
      </footer>
    </div>
  )
}

export default PdfDocumentViewer
