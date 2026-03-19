import { useState, useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'

interface DocumentData {
  id?: string
  version?: number
  name?: string
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  expirationDate?: string
  parentDocument?: string
  folder?: boolean
  file?: string
  fileInfo?: {
    fileId?: string
    path?: string
    folderPath?: string
    fileMetadata?: {
      originalFileName?: string
      mimeType?: string
      size?: number
      updatedAt?: string
    }
    appName?: string
    accessScope?: string
    uploadedAt?: string
  }
  fileSize?: number | null
  mimeType?: string | null
}

interface UseDocumentFormDataArgs {
  form: UseFormReturn<any>
  loadedDocument: DocumentData | null | undefined
  loading: boolean
  onExistingFileInfoChange?: (fileInfo: any) => void
}

/**
 * Hook to manage document form data population
 * Handles populating form fields when document data is loaded (update/rename mode)
 */
export const useDocumentFormData = ({
  form,
  loadedDocument,
  loading,
  onExistingFileInfoChange
}: UseDocumentFormDataArgs) => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

  // Populate form with pre-fetched document data
  useEffect(() => {
    if (!loadedDocument || loading) {
      return
    }

    // Store existing file info if available
    if (loadedDocument.fileInfo && onExistingFileInfoChange) {
      const fileInfo = {
        id: loadedDocument.file || loadedDocument.fileInfo?.fileId || loadedDocument.id || '',
        name: loadedDocument.name || loadedDocument.fileInfo?.fileMetadata?.originalFileName || '',
        fileInfo: loadedDocument.fileInfo,
        fileSize: loadedDocument.fileSize || loadedDocument.fileInfo?.fileMetadata?.size,
        mimeType: loadedDocument.mimeType
      }
      onExistingFileInfoChange(fileInfo)
    }

    // Format expiration date to YYYY-MM-DD for date input
    const formattedExpirationDate = loadedDocument.expirationDate
      ? new Date(loadedDocument.expirationDate).toISOString().split('T')[0]
      : ''

    form.setValue('documentId', loadedDocument.id || '')
    form.setValue('documentVersion', loadedDocument.version || 0)
    form.setValue('name', loadedDocument.name || '')
    form.setValue('description', loadedDocument.description || '')
    form.setValue('documentGroupRef', loadedDocument.documentGroupRef || '')
    form.setValue('documentTypeRef', loadedDocument.documentTypeRef || '')
    form.setValue('expirationDate', formattedExpirationDate)
    form.setValue('parentDocument', loadedDocument.parentDocument || undefined)
    form.setValue('folder', loadedDocument.folder || false)
  }, [loadedDocument, loading, form, onExistingFileInfoChange])

  // Mark initial data as loaded
  useEffect(() => {
    if (!loading && (loadedDocument || !initialDataLoaded)) {
      setInitialDataLoaded(true)
    }
  }, [loading, loadedDocument, initialDataLoaded])

  return {
    initialDataLoaded
  }
}
