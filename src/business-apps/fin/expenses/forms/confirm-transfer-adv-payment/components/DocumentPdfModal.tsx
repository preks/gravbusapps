import React, { useEffect, useState } from 'react'
import { Alert, Spinner, Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { DownloadOutlined, PrinterOutlined, FullscreenOutlined, MoreOutlined } from '@ant-design/icons'
import { FileClient } from '@/common/network/files/FileClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DocumentPdfModalProps {
  isVisible: boolean
  pdfUrl: string // This will be the document ID or filename
  pdfLoading: boolean
  pdfError: string
  onClose: () => void
  accessToken?: string
  employeeId?: string // Add employee ID for file path construction
}

// Helper function to render modal content based on state
const renderModalContent = (
  isLoading: boolean,
  hasError: string | false,
  canShowDocument: boolean,
  documentUrl: string
): React.ReactNode => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Spinner size="lg" />
        <div>Loading PDF...</div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Alert variant="destructive">
          <div className="gba:font-medium">Error Loading PDF</div>
          <div className="gba:text-sm">{hasError}</div>
        </Alert>
      </div>
    )
  }

  if (canShowDocument) {
    return (
      <iframe
        src={documentUrl}
        style={{
          width: '100%',
          height: '80vh',
          border: 'none',
          display: 'block'
        }}
        title="Advance Payment Document PDF"
        data-testid="document-pdf-iframe"
      />
    )
  }

  return (
    <div className="gba:text-center gba:p-8 gba:text-gray-500">
      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_document', 'No PDF URL available')}
    </div>
  )
}

const DocumentPdfModal: React.FC<DocumentPdfModalProps> = ({
  isVisible,
  pdfUrl,
  pdfLoading,
  pdfError,
  onClose,
  accessToken,
  employeeId
}) => {
  const [documentUrl, setDocumentUrl] = useState<string>('')
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentError, setDocumentError] = useState<string>('')

  // Fetch the document when the modal opens
  useEffect(() => {
    if (isVisible && pdfUrl && accessToken && !pdfLoading) {
      fetchDocument()
    }
  }, [isVisible, pdfUrl, accessToken, pdfLoading])

  const fetchDocument = async () => {
    if (!pdfUrl || !accessToken) return

    setIsLoadingDocument(true)
    setDocumentError('')

    try {
      const fileClient = new FileClient()
      fileClient.setAccessToken(accessToken)

      // Use the same logic as the working ExpenseRequestFileService
      // Extract the file ID from the file path (like the working service does)
      const fileId = pdfUrl.includes('/') ? pdfUrl.split('/').pop() : pdfUrl

      if (!fileId) {
        throw new Error('No file ID available for printing')
      }

      // Use the exact same parameters as the working service
      const blob = await fileClient.getFile(
        {
          accessScope: 'tenant',
          fileId: fileId
        },
        {
          appName: 'employee-profile',
          folderPath: `/documents/${employeeId}`
        }
      )

      const objectUrl = URL.createObjectURL(blob)
      setDocumentUrl(objectUrl)
    } catch (error) {
      console.error('Error fetching document:', error)
      setDocumentError(error instanceof Error ? error.message : 'Failed to load document')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const handleClose = () => {
    // Clean up the object URL when closing
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl)
      setDocumentUrl('')
    }
    setDocumentError('')
    onClose()
  }

  const documentName = pdfUrl ? pdfUrl.split('/').pop() || 'Document' : 'Document'
  const isLoading = pdfLoading || isLoadingDocument
  const hasError: string | false = pdfError || documentError || false
  const canShowDocument = Boolean(documentUrl && !isLoading && !hasError)

  return (
    <Dialog
      open={isVisible}
      onOpenChange={open => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md"
        style={{ height: '90vh' }}
        data-testid="document-pdf-modal"
      >
        <DialogHeader className="gba:p-4">
          <DialogTitle>{documentName}</DialogTitle>
        </DialogHeader>
        {/* Custom Header with PDF Controls */}
        <div className="gba:bg-gray-800 gba:text-background gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-4">
            <span className="gba:text-sm gba:font-mono gba:text-gray-300">{documentName}</span>
          </div>

          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Page Navigation */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <span>1 / 1</span>
            </div>

            {/* Zoom Controls */}
            <div className="gba:flex gba:items-center gba:gap-1 gba:border-l gba:border-gray-600 gba:pl-3">
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-1">-</button>
              <span className="gba:text-sm gba:px-2">100%</span>
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-1">+</button>
            </div>

            {/* Action Buttons */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:border-l gba:border-gray-600 gba:pl-3">
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-2" title="Full Screen">
                <FullscreenOutlined />
              </button>
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-2" title="Download">
                <DownloadOutlined />
              </button>
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-2" title="Print">
                <PrinterOutlined />
              </button>
              <button className="gba:text-gray-300 gba:hover:text-background gba:p-2" title="More Options">
                <MoreOutlined />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="gba:bg-background gba:min-h-[80vh]">
          {renderModalContent(isLoading, hasError, canShowDocument, documentUrl)}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentPdfModal
