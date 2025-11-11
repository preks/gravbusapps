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
import { useFileClient } from '@/common/network/files/useFileClient'

interface DocumentPreviewProps {
  fileInfo?: {
    path?: string
    fileId?: string
    appName?: string
    folderPath?: string
    accessScope?: string
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

  // Initialize file client for proper file fetching
  const fileClient = useFileClient({ accessToken })

  if (!fileInfo) {
    return null
  }

  const mimeType = fileInfo.fileMetadata?.mimeType || ''
  const fileName = fileInfo.fileMetadata?.originalFileName || documentName || 'Document'

  // Support both direct path and fileId-based access
  const hasFileId = fileInfo.fileId && fileInfo.appName
  const hasPath = fileInfo.path
  const fileUrl = hasPath ? `${window.location.origin}${fileInfo.path}` : null

  // Debug logging
  console.log('DocumentPreview - fileInfo:', fileInfo)
  console.log('DocumentPreview - hasFileId:', hasFileId)
  console.log('DocumentPreview - hasPath:', hasPath)
  console.log('DocumentPreview - mimeType:', mimeType)

  // Fetch file with authentication and convert to blob URL
  useEffect(() => {
    const fetchFileAsBlob = async () => {
      // Only fetch for previewable types
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
        return
      }

      // Skip if already loading or loaded
      if (isLoading || blobUrl) {
        return
      }

      setIsLoading(true)
      setPreviewError(false)

      try {
        let blob: Blob | null = null

        // Try fileId-based access first (more reliable)
        if (hasFileId && fileInfo.fileId && fileInfo.appName) {
          console.log('Fetching via File Client API...')
          blob = await fileClient.getFile(
            {
              accessScope: (fileInfo.accessScope as 'public' | 'private' | 'tenant') || 'tenant',
              fileId: fileInfo.fileId
            },
            {
              appName: fileInfo.appName,
              folderPath: fileInfo.folderPath || ''
            }
          )
        }
        // Fallback to path-based access
        else if (hasPath && fileUrl) {
          console.log('Fetching via path URL...')
          const headers: HeadersInit = {}
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
          }

          const response = await fetch(fileUrl, { headers })
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`)
          }
          blob = await response.blob()
        } else {
          throw new Error('No valid file reference found')
        }

        if (!blob || blob.size === 0) {
          throw new Error('Empty file received')
        }

        // Create blob URL with proper MIME type
        let typedBlob = blob
        if (mimeType === 'application/pdf') {
          typedBlob = new Blob([blob], { type: 'application/pdf' })
        } else if (mimeType.startsWith('image/')) {
          typedBlob = new Blob([blob], { type: mimeType })
        }

        const objectUrl = URL.createObjectURL(typedBlob)
        setBlobUrl(objectUrl)
        console.log('File blob created successfully')
      } catch (error) {
        console.error('Failed to fetch file:', error)
        setPreviewError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileAsBlob()

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [fileInfo, mimeType, accessToken, hasFileId, hasPath, fileUrl, blobUrl, isLoading, fileClient])

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
      if (isLoading) {
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[600px] gba:bg-muted gba:rounded-lg">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Spinner size="lg" />
              <div className="gba:text-sm gba:text-muted-foreground">Loading PDF...</div>
            </div>
          </div>
        )
      }

      if (!blobUrl) {
        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[600px] gba:bg-muted gba:rounded-lg">
            <div className="gba:text-sm gba:text-muted-foreground">Preparing PDF...</div>
          </div>
        )
      }

      return (
        <div className="gba:relative gba:w-full gba:h-[600px] gba:bg-muted gba:rounded-lg gba:overflow-hidden">
          <iframe
            src={blobUrl}
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

    // Office documents - use external viewer (only works with publicly accessible URLs)
    if (previewSupport === 'viewer' && fileUrl) {
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
