import { useState, useCallback } from 'react'
import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { UploadProgress, UseInvestmentDocumentUploadProps, UseInvestmentDocumentUploadReturn } from '../types'

const FILES_ENDPOINT = env('NEXT_PUBLIC_FILE_SERVICE_ENDPOINT')

export const useInvestmentFileUpload = ({
  accessToken,
  onSuccess,
  onError
}: UseInvestmentDocumentUploadProps): UseInvestmentDocumentUploadReturn => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Upload single file using investment folder structure
  const uploadSingleFile = useCallback(
    async (file: File, investmentId: string): Promise<any> => {
      if (!FILES_ENDPOINT) {
        throw new Error('File service endpoint not configured')
      }

      // Create folder path for investment documents using camelCase alternate codes
      // documentGroup: Uses 'financial' (alternativeCode from InvestmentDocumentGroup catalog)
      // documentType: Uses 'fundPerformanceReport' (alternativeCode from InvestmentDocumentType catalog)
      // Pattern must match: ^(/[\\w_-]{1,256})+$ (each segment must start with /)
      const documentGroup = 'reports'
      const documentType = 'investmentReport'
      const folderPath = `/investment/${investmentId}/${documentGroup}/${documentType}`
      const mimeType = file.type

      // Build URL with established appName and folder structure
      const url = `${FILES_ENDPOINT}/tenant/files?appName=investmentRelations&folderPath=${encodeURIComponent(folderPath)}&mimeType=${encodeURIComponent(mimeType)}`

      // Create FormData
      const formData = new FormData()
      formData.append('fileContent', file)

      console.log(`Uploading file: ${file.name} to ${url}`)
      console.log(`Using folder structure: ${folderPath} (Investment: ${investmentId})`)

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
      console.log(`File uploaded successfully:`, result)
      return result
    },
    [accessToken]
  )

  const uploadFiles = useCallback(
    async (files: File[], investmentId: string): Promise<any[]> => {
      if (!files.length) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'investment.document.upload.error.noFile',
          'Please select at least one file'
        )
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

          console.log(`Uploading file ${i + 1}/${totalFiles}: ${file.name}`)

          // Upload using established folder structure pattern
          const uploadResult = await uploadSingleFile(file, investmentId)
          uploadResults.push(uploadResult)

          console.log(`File ${i + 1} uploaded successfully. Full response:`, uploadResult)
        }

        setUploadProgress(null)

        if (onSuccess) {
          // For backward compatibility, still pass file IDs to onSuccess
          const fileIds = uploadResults.map(
            result => result?.fileInfo?.fileId || result?.fileId || result?.id || `FILE_${Date.now()}`
          )
          onSuccess(fileIds)
        }

        return uploadResults
      } catch (err: any) {
        const errorMessage = err?.message || 'Upload failed'
        console.error('Upload failed:', err)
        setError(errorMessage)
        setUploadProgress(null)

        if (onError) {
          onError(errorMessage)
        }

        return []
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
