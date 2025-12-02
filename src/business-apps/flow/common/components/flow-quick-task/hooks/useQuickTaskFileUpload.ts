import { useState, useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'

const FILES_ENDPOINT = env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT')

/**
 * Get MIME type from file, with fallback to extension-based detection
 */
const getMimeType = (file: File): string => {
  // If file.type is available, use it
  if (file.type) {
    return file.type
  }

  // Fallback: detect from file extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    // Archives
    zip: 'application/zip'
  }

  return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream'
}

export interface UploadProgress {
  current: number
  total: number
}

export interface UseQuickTaskFileUploadProps {
  accessToken: string
  onSuccess?: (results: any[]) => void
  onError?: (error: string) => void
}

export interface UseQuickTaskFileUploadReturn {
  uploadFiles: (files: File[], requestId?: string) => Promise<any[]>
  isUploading: boolean
  uploadProgress: UploadProgress | null
  error: string | null
  clearError: () => void
}

export const useQuickTaskFileUpload = ({
  accessToken,
  onSuccess,
  onError
}: UseQuickTaskFileUploadProps): UseQuickTaskFileUploadReturn => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Upload single file
  const uploadSingleFile = useCallback(
    async (file: File, requestId?: string): Promise<any> => {
      if (!FILES_ENDPOINT) {
        throw new Error('File service endpoint not configured')
      }

      // Create folder path for Quick Task documents
      const folderPath = requestId ? `/quick-tasks/${requestId}/attachments` : `/quick-tasks/temp/${Date.now()}`

      // Get MIME type with fallback for files without type (e.g., screenshots)
      const mimeType = getMimeType(file)

      // Build URL with blink app name and folder structure
      const url = `${FILES_ENDPOINT}/tenant/files?appName=quick-task&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mimeType)}`

      // Create FormData with explicit filename
      const formData = new FormData()
      formData.append('fileContent', file, file.name)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result
    },
    [accessToken]
  )

  const uploadFiles = useCallback(
    async (files: File[], requestId?: string): Promise<any[]> => {
      if (!files.length) {
        const errorMessage = 'Please select at least one file'
        setError(errorMessage)
        return []
      }

      if (!accessToken) {
        const errorMessage = 'Authentication required'
        setError(errorMessage)
        return []
      }

      setIsUploading(true)
      setError(null)
      const uploadResults: any[] = []
      const totalFiles = files.length

      try {
        // Upload files one by one
        for (let i = 0; i < files.length; i++) {
          const file = files[i]

          setUploadProgress({ current: i + 1, total: totalFiles })

          const uploadResult = await uploadSingleFile(file, requestId)
          uploadResults.push(uploadResult)
        }

        setUploadProgress(null)

        if (onSuccess) {
          onSuccess(uploadResults)
        }

        return uploadResults
      } catch (err: any) {
        const errorMessage = err?.message || 'Upload failed'
        setError(errorMessage)
        setUploadProgress(null)

        if (onError) {
          onError(errorMessage)
        }

        // Re-throw error so caller can handle it properly
        throw new Error(`File upload failed: ${errorMessage}`)
      } finally {
        setIsUploading(false)
      }
    },
    [accessToken, uploadSingleFile, onSuccess, onError]
  )

  return {
    uploadFiles,
    isUploading,
    uploadProgress,
    error,
    clearError
  }
}
