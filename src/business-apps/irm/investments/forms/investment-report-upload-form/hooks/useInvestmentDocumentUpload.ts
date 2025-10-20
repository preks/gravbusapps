import { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UploadParams {
  file: File
  investmentId: string
  name: string
  description: string
  documentGroupRef: string
  documentTypeRef: string
}

interface UploadResult {
  success: boolean
  documentId?: string
  fileId?: string
  error?: string
}

export const useInvestmentDocumentUpload = (context: BusinessAppContextProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileClient = useFileClient({ accessToken: context.accessToken } as any)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const uploadDocument = async (params: UploadParams): Promise<UploadResult> => {
    if (!context.accessToken) {
      const errorMsg = getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.noAuth',
        'Authentication required'
      )
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }

    setIsUploading(true)
    setError(null)

    try {
      // Step 1: Upload file to storage
      const pathParams = { accessScope: 'public' }
      const queryParams = {
        appName: 'investments',
        folderPath: `/investments/${params.investmentId}/documents`
      }

      const uploadResponse = await fileClient.uploadFile(params.file, pathParams, queryParams)

      if (!uploadResponse?.fileInfo?.fileId) {
        throw new Error(
          getTranslationFromI18nKeyAndLabel('investment.document.upload.error.fileUploadFailed', 'File upload failed')
        )
      }

      // Step 2: Save document metadata using direct API call
      const documentData = {
        changeMode: 'INSERT',
        investmentDocument: {
          name: params.name,
          description: params.description || '',
          file: uploadResponse.fileInfo.fileId,
          fileSize: params.file.size,
          mimeType: params.file.type,
          investment: params.investmentId,
          documentGroupRef: params.documentGroupRef,
          documentTypeRef: params.documentTypeRef,
          verified: true,
          verificationDate: new Date().toISOString(),
          format: 'FILE',
          version: 0
        }
      }

      const documentResponse = await restClient.post('/investments/saveInvestmentDocument', documentData, {
        headers: {
          Authorization: `Bearer ${context.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      // Extract document ID from response
      const documentId = documentResponse?.data?.investmentDocument?.id

      if (!documentId) {
        throw new Error(
          getTranslationFromI18nKeyAndLabel(
            'investment.document.upload.error.saveDocumentFailed',
            'Failed to save document metadata'
          )
        )
      }

      return {
        success: true,
        documentId,
        fileId: uploadResponse.fileInfo.fileId
      }
    } catch (err: any) {
      console.error('Investment document upload failed:', err)

      let errorMessage = getTranslationFromI18nKeyAndLabel(
        'investment.document.upload.error.uploadFailed',
        'Document upload failed'
      )

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsUploading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    uploadDocument,
    isUploading,
    error,
    clearError
  }
}
