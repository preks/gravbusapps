import React, { useEffect, useState } from 'react'
import { Modal } from 'antd'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { DownloadOutlined, PrinterOutlined, FullscreenOutlined, MoreOutlined } from '@ant-design/icons'
import { FileClient } from '@/common/network/files/FileClient'

interface DocumentPdfModalProps {
  isVisible: boolean
  pdfUrl: string // This will be the document ID or filename
  pdfLoading: boolean
  pdfError: string
  onClose: () => void
  accessToken?: string
  employeeId?: string // Add employee ID for file path construction
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
  const hasError = pdfError || documentError
  const canShowDocument = documentUrl && !isLoading && !hasError

  return (
    <Modal
      title={null}
      open={isVisible}
      onCancel={handleClose}
      footer={null}
      width="85%"
      style={{
        top: 20,
        maxWidth: '1350px',
        padding: 0
      }}
      className="pdf-viewer-modal"
      data-testid="document-pdf-modal"
    >
      {/* Custom Header with PDF Controls */}
      <div className="gba:bg-gray-800 gba:text-white gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between">
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
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-1">-</button>
            <span className="gba:text-sm gba:px-2">100%</span>
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-1">+</button>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:border-l gba:border-gray-600 gba:pl-3">
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-2" title="Full Screen">
              <FullscreenOutlined />
            </button>
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-2" title="Download">
              <DownloadOutlined />
            </button>
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-2" title="Print">
              <PrinterOutlined />
            </button>
            <button className="gba:text-gray-300 hover:gba:text-white gba:p-2" title="More Options">
              <MoreOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Content */}
      <div className="gba:bg-white gba:min-h-[80vh]">
        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Spinner size="lg" />
            <div>Loading PDF...</div>
          </div>
        ) : hasError ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <Alert variant="destructive">
              <div className="gba:font-medium">Error Loading PDF</div>
              <div className="gba:text-sm">{hasError}</div>
            </Alert>
          </div>
        ) : canShowDocument ? (
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
        ) : (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
            <div className="gba:text-center">
              <div className="gba:text-lg gba:font-medium gba:mb-2">No PDF URL available</div>
              <div className="gba:text-sm gba:text-gray-500">Document URL could not be constructed</div>
              <div className="gba:text-xs gba:text-gray-400 gba:mt-2">Document ID: {pdfUrl}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DocumentPdfModal
