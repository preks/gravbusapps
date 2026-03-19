import { useState, useCallback } from 'react'
import { fileClient } from '@/common/network/files/FileClient'

interface DocumentFileInfo {
  id?: string
  name?: string
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

interface UseDocumentFileUploadArgs {
  accessToken?: string | null
  entityId: string
  folderEntityName: string
  appName: string
  existingFile?: DocumentFileInfo | null
  isRenameMode: boolean
}

export const useDocumentFileUpload = ({
  accessToken,
  entityId,
  folderEntityName,
  appName,
  existingFile: initialExistingFile,
  isRenameMode
}: UseDocumentFileUploadArgs) => {
  const [existingFileInfo, setExistingFileInfo] = useState<DocumentFileInfo | null>(initialExistingFile || null)

  const shouldUploadFiles = useCallback(
    (files?: File[], isFolder?: boolean): boolean => {
      return !isRenameMode && !isFolder && !!files && files.length > 0 && !!accessToken
    },
    [isRenameMode, accessToken]
  )

  const uploadFiles = useCallback(
    async (files?: File[], isFolder?: boolean): Promise<any[]> => {
      if (!shouldUploadFiles(files, isFolder) || !accessToken) {
        return []
      }

      fileClient.setAccessToken(accessToken)

      const sanitizedId = entityId
        .split('')
        .map(char => (/[\w-]/.test(char) ? char : '_'))
        .join('')
      const folderPath = `/${folderEntityName}/${sanitizedId}/documents`

      const folderPathRegex = /^(\/[\w-]{1,256})+$/
      if (!folderPathRegex.test(folderPath)) {
        throw new Error(`Invalid folder path format: ${folderPath}`)
      }

      const pathParams = { accessScope: 'public' as const }
      const queryParams = { appName, folderPath }

      return await Promise.all(files!.map(file => fileClient.uploadFile(file, pathParams, queryParams)))
    },
    [accessToken, entityId, folderEntityName, appName, shouldUploadFiles]
  )

  const handleFilesChange = useCallback((filesList: any[], form: any) => {
    const filesArray = filesList.map(f => f.file).filter(Boolean) as File[]
    form.setValue('files', filesArray)

    // Auto-fill name with first file name if empty
    if (filesArray[0] && !form.getValues('name')) {
      form.setValue('name', filesArray[0].name)
    }
  }, [])

  return {
    existingFileInfo,
    setExistingFileInfo,
    uploadFiles,
    handleFilesChange
  }
}
