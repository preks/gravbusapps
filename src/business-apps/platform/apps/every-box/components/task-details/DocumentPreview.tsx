import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { PiEye, PiEyeSlash, PiWarning, PiFile } from 'react-icons/pi'

interface DocumentPreviewProps {
  fileInfo?: {
    path?: string
    fileMetadata?: {
      mimeType?: string
      originalFileName?: string
    }
  }
  documentName?: string
  accessToken?: string
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ fileInfo, documentName, accessToken }) => {
  const [showPreview, setShowPreview] = useState(true)
  const [previewError, setPreviewError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!fileInfo?.path) {
    return null
  }

  const mimeType = fileInfo.fileMetadata?.mimeType || ''
  const fileName = fileInfo.fileMetadata?.originalFileName || documentName || 'Document'
  const fileUrl = `${window.location.origin}${fileInfo.path}`

  // Debug logging
  console.log('DocumentPreview - fileInfo:', fileInfo)
  console.log('DocumentPreview - fileUrl:', fileUrl)
  console.log('DocumentPreview - mimeType:', mimeType)

  // Fetch image with authentication and convert to blob URL
  useEffect(() => {
    const fetchImageAsBlob = async () => {
      if (!mimeType.startsWith('image/') || blobUrl) {
        return
      }

      setIsLoading(true)
      try {
        const headers: HeadersInit = {}
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }

        const response = await fetch(fileUrl, { headers })

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        console.log('Image blob created successfully')
      } catch (error) {
        console.error('Failed to fetch image:', error)
        setPreviewError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImageAsBlob()

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [fileUrl, mimeType, accessToken, blobUrl])

  // Determine if we can show preview based on MIME type
  const canShowPreview = () => {
    // Images
    if (mimeType.startsWith('image/')) return true

    // PDF
    if (mimeType === 'application/pdf') return true

    // Text files
    if (mimeType.startsWith('text/')) return true

    // Common office formats that browsers can often handle
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // .docx
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ) {
      // For Office files, we'll use Google Docs Viewer or Microsoft Office Online Viewer
      return 'viewer'
    }

    return false
  }

  const previewSupport = canShowPreview()

  const renderPreview = () => {
    if (previewError) {
      return (
        <Alert variant="warning" className="gba:mb-4">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>
            Preview is not available for this document. Please download the file to view it.
          </AlertDescription>
        </Alert>
      )
    }

    // Image preview
    if (mimeType.startsWith('image/')) {
      if (isLoading) {
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px] gba:bg-muted gba:rounded-lg">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Spinner size="lg" />
              <div className="gba:text-sm gba:text-muted-foreground">Loading image...</div>
            </div>
          </div>
        )
      }

      if (!blobUrl) {
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px] gba:bg-muted gba:rounded-lg">
            <div className="gba:text-sm gba:text-muted-foreground">Preparing image...</div>
          </div>
        )
      }

      return (
        <div className="gba:relative gba:w-full gba:bg-muted gba:rounded-lg gba:overflow-hidden gba:p-4">
          {!imageLoaded && (
            <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[200px]">
              <div className="gba:text-sm gba:text-muted-foreground">Rendering image...</div>
            </div>
          )}
          <img
            src={blobUrl}
            alt={fileName}
            className="gba:w-full gba:h-auto gba:max-h-[600px] gba:object-contain gba:mx-auto"
            onLoad={() => {
              console.log('Image rendered successfully')
              setImageLoaded(true)
            }}
            onError={e => {
              console.error('Image failed to render:', e)
              setPreviewError(true)
            }}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        </div>
      )
    }

    // PDF preview
    if (mimeType === 'application/pdf') {
      return (
        <div className="gba:relative gba:w-full gba:h-[600px] gba:bg-muted gba:rounded-lg gba:overflow-hidden">
          <iframe
            src={fileUrl}
            className="gba:w-full gba:h-full gba:border-0"
            title={fileName}
            onError={() => setPreviewError(true)}
          />
        </div>
      )
    }

    // Text file preview
    if (mimeType.startsWith('text/')) {
      return (
        <div className="gba:relative gba:w-full gba:max-h-[600px] gba:overflow-auto gba:bg-muted gba:rounded-lg gba:p-4">
          <iframe
            src={fileUrl}
            className="gba:w-full gba:min-h-[400px] gba:border-0"
            title={fileName}
            onError={() => setPreviewError(true)}
          />
        </div>
      )
    }

    // Office documents - use external viewer
    if (previewSupport === 'viewer') {
      // Using Microsoft Office Online Viewer for better compatibility
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

      return (
        <div className="gba:space-y-3">
          <Alert>
            <PiFile className="gba:h-4 gba:w-4" />
            <AlertDescription>
              This document is being displayed using Microsoft Office Online Viewer. If it doesn't load, please download
              the file.
            </AlertDescription>
          </Alert>
          <div className="gba:relative gba:w-full gba:h-[600px] gba:bg-muted gba:rounded-lg gba:overflow-hidden">
            <iframe
              src={viewerUrl}
              className="gba:w-full gba:h-full gba:border-0"
              title={fileName}
              onError={() => setPreviewError(true)}
            />
          </div>
        </div>
      )
    }

    return null
  }

  if (!previewSupport) {
    return (
      <Alert>
        <PiFile className="gba:h-4 gba:w-4" />
        <AlertDescription>
          Preview is not available for this file type ({mimeType || 'unknown'}). Please download the file to view it.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-lg">Document Preview</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? (
              <>
                <PiEyeSlash className="gba:h-4 gba:w-4 gba:mr-2" />
                Hide Preview
              </>
            ) : (
              <>
                <PiEye className="gba:h-4 gba:w-4 gba:mr-2" />
                Show Preview
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {showPreview && <CardContent>{renderPreview()}</CardContent>}
    </Card>
  )
}
