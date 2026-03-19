import { useCallback, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import { InputType, type InputBlock } from '@/common/network/flows/FlowTemplateClient'
import type { FileInfo, FileUploadResponse } from '@/common/types/FileTypes'

type UseFlowLaunchFileUploadProps = Partial<BusinessAppContextProps>

interface UseFlowLaunchFileUploadResult {
  uploadFormFiles: (
    inputs: InputBlock[],
    formData: Record<string, any>,
    templateId: string
  ) => Promise<Record<string, any>>
  isUploading: boolean
  error: string | null
  clearError: () => void
}

function sanitizePathSegment(value: string): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'field'
}

function isNativeFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

function toLauncherFileInfo(response: FileUploadResponse): FileInfo {
  return {
    path: response.fileInfo.path,
    fileId: response.fileInfo.fileId,
    appName: response.fileInfo.appName,
    folderPath: response.fileInfo.folderPath,
    uploadedAt: response.fileInfo.uploadedAt,
    accessScope: response.fileInfo.accessScope,
    fileMetadata: {
      originalFileName: response.fileInfo.fileMetadata?.originalFileName,
      mimeType: response.fileInfo.fileMetadata?.mimeType,
      updatedAt: response.fileInfo.fileMetadata?.updatedAt
    }
  }
}

export function useFlowLaunchFileUpload({ accessToken }: UseFlowLaunchFileUploadProps): UseFlowLaunchFileUploadResult {
  const fileClient = useFileClient({ accessToken } as BusinessAppContextProps)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const uploadFormFiles = useCallback(
    async (inputs: InputBlock[], formData: Record<string, any>, templateId: string): Promise<Record<string, any>> => {
      const next = { ...formData }
      const fileInputs = inputs.filter(input => String(input?.type || '').toUpperCase() === InputType.FILE)
      if (fileInputs.length === 0) return next
      if (!accessToken) {
        const message = 'Access token is required to upload files'
        setError(message)
        throw new Error(message)
      }

      setIsUploading(true)
      setError(null)
      try {
        for (const input of fileInputs) {
          const fieldName = String(input?.name || '').trim()
          if (!fieldName || !(fieldName in next)) continue

          const currentValue = next[fieldName]
          if (!isNativeFile(currentValue)) continue

          const uploadResponse = await fileClient.uploadFile(
            currentValue,
            { accessScope: 'tenant' },
            {
              appName: 'flow-launcher',
              folderPath: `/flows/${sanitizePathSegment(templateId)}/launcher/${sanitizePathSegment(fieldName)}`,
              mimeType: currentValue.type || undefined
            }
          )

          next[fieldName] = toLauncherFileInfo(uploadResponse)
        }

        return next
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Failed to upload launcher files'
        setError(message)
        throw new Error(message)
      } finally {
        setIsUploading(false)
      }
    },
    [accessToken, fileClient]
  )

  return {
    uploadFormFiles,
    isUploading,
    error,
    clearError
  }
}
