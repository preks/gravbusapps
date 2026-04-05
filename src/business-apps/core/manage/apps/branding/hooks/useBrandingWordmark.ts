import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import {
  BRANDING_APP_NAME,
  BRANDING_WORDMARK_FILE_ID,
  BrandingWordmarkValidationError,
  createBrandingWordmarkUploadFile,
  notifyBrandingUpdate,
  resolveBrandingFolderPath,
  validateBrandingWordmarkFile
} from '../brandingFileUtils'

type SaveWordmarkResult = 'uploaded' | 'deleted' | null

interface UseBrandingWordmarkResult {
  currentWordmarkUrl: string | null
  previewWordmarkUrl: string | null
  hasStoredWordmark: boolean
  hasUnsavedChanges: boolean
  isLoading: boolean
  isSaving: boolean
  validationError: BrandingWordmarkValidationError | null
  resetChanges: () => void
  removeWordmark: () => void
  selectWordmark: (file: File) => BrandingWordmarkValidationError | null
  saveWordmark: () => Promise<SaveWordmarkResult>
}

const PUBLIC_FILE_ACCESS = { accessScope: 'public' } as const

const revokeObjectUrl = (objectUrl: string | null) => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
}

export const useBrandingWordmark = (context: BusinessAppContextProps): UseBrandingWordmarkResult => {
  const { accessToken, userInfo, additionalData } = context
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })
  const tenantKey = env('NEXT_PUBLIC_TENANT_KEY') ?? ''
  const folderPath = useMemo(() => resolveBrandingFolderPath(tenantKey), [tenantKey])

  const [currentWordmarkUrl, setCurrentWordmarkUrl] = useState<string | null>(null)
  const [selectedWordmarkFile, setSelectedWordmarkFile] = useState<File | null>(null)
  const [selectedWordmarkUrl, setSelectedWordmarkUrl] = useState<string | null>(null)
  const [hasStoredWordmark, setHasStoredWordmark] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMarkedForDeletion, setIsMarkedForDeletion] = useState(false)
  const [validationError, setValidationError] = useState<BrandingWordmarkValidationError | null>(null)

  const replaceCurrentWordmarkUrl = useCallback((nextWordmarkUrl: string | null) => {
    setCurrentWordmarkUrl(previousWordmarkUrl => {
      if (previousWordmarkUrl && previousWordmarkUrl !== nextWordmarkUrl) {
        revokeObjectUrl(previousWordmarkUrl)
      }
      return nextWordmarkUrl
    })
  }, [])

  const replaceSelectedWordmarkUrl = useCallback((nextWordmarkUrl: string | null) => {
    setSelectedWordmarkUrl(previousWordmarkUrl => {
      if (previousWordmarkUrl && previousWordmarkUrl !== nextWordmarkUrl) {
        revokeObjectUrl(previousWordmarkUrl)
      }
      return nextWordmarkUrl
    })
  }, [])

  const loadCurrentWordmark = useCallback(async () => {
    if (!accessToken) {
      replaceCurrentWordmarkUrl(null)
      setHasStoredWordmark(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const availableFiles = await fileClient.getAllFiles(PUBLIC_FILE_ACCESS, {
        appName: BRANDING_APP_NAME,
        folderPath
      })

      const storedWordmark = availableFiles.files.find(file => file.fileId === BRANDING_WORDMARK_FILE_ID)

      if (!storedWordmark) {
        replaceCurrentWordmarkUrl(null)
        setHasStoredWordmark(false)
        return
      }

      const wordmarkBlob = await fileClient.getFile(
        { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_WORDMARK_FILE_ID },
        {
          appName: BRANDING_APP_NAME,
          folderPath
        }
      )

      replaceCurrentWordmarkUrl(URL.createObjectURL(wordmarkBlob))
      setHasStoredWordmark(true)
    } catch {
      replaceCurrentWordmarkUrl(null)
      setHasStoredWordmark(false)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fileClient, folderPath, replaceCurrentWordmarkUrl])

  useEffect(() => {
    loadCurrentWordmark()
  }, [loadCurrentWordmark])

  useEffect(() => {
    return () => {
      revokeObjectUrl(currentWordmarkUrl)
      revokeObjectUrl(selectedWordmarkUrl)
    }
  }, [currentWordmarkUrl, selectedWordmarkUrl])

  const resetChanges = useCallback(() => {
    setSelectedWordmarkFile(null)
    replaceSelectedWordmarkUrl(null)
    setIsMarkedForDeletion(false)
    setValidationError(null)
  }, [replaceSelectedWordmarkUrl])

  const removeWordmark = useCallback(() => {
    setValidationError(null)
    setSelectedWordmarkFile(null)
    replaceSelectedWordmarkUrl(null)

    if (hasStoredWordmark) {
      setIsMarkedForDeletion(true)
    }
  }, [hasStoredWordmark, replaceSelectedWordmarkUrl])

  const selectWordmark = useCallback(
    (file: File): BrandingWordmarkValidationError | null => {
      const validationResult = validateBrandingWordmarkFile(file)

      if (!validationResult.isValid) {
        setValidationError(validationResult.error ?? null)
        return validationResult.error ?? null
      }

      setValidationError(null)
      setIsMarkedForDeletion(false)
      setSelectedWordmarkFile(file)
      replaceSelectedWordmarkUrl(URL.createObjectURL(file))

      return null
    },
    [replaceSelectedWordmarkUrl]
  )

  const saveWordmark = useCallback(async (): Promise<SaveWordmarkResult> => {
    if (!accessToken) {
      throw new Error('Access token is required to update branding.')
    }

    const hasPendingUpload = selectedWordmarkFile !== null
    const hasPendingDeletion = isMarkedForDeletion && !hasPendingUpload

    if (!hasPendingUpload && !hasPendingDeletion) {
      return null
    }

    setIsSaving(true)

    try {
      if (hasPendingDeletion) {
        const deleted = await fileClient.deleteFile(
          { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_WORDMARK_FILE_ID },
          {
            appName: BRANDING_APP_NAME,
            folderPath
          }
        )

        if (!deleted) {
          throw new Error('Failed to delete branding wordmark.')
        }
      }

      if (selectedWordmarkFile) {
        const uploadFile = createBrandingWordmarkUploadFile(selectedWordmarkFile)

        if (hasStoredWordmark) {
          await fileClient.updateFile(
            uploadFile,
            { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_WORDMARK_FILE_ID },
            {
              appName: BRANDING_APP_NAME,
              folderPath
            }
          )
        } else {
          await fileClient.uploadFile(uploadFile, PUBLIC_FILE_ACCESS, {
            appName: BRANDING_APP_NAME,
            folderPath,
            keepFilename: true
          })
        }
      }

      resetChanges()
      await loadCurrentWordmark()
      notifyBrandingUpdate()

      return hasPendingDeletion ? 'deleted' : 'uploaded'
    } finally {
      setIsSaving(false)
    }
  }, [
    accessToken,
    fileClient,
    folderPath,
    hasStoredWordmark,
    isMarkedForDeletion,
    loadCurrentWordmark,
    resetChanges,
    selectedWordmarkFile
  ])

  return {
    currentWordmarkUrl,
    previewWordmarkUrl: selectedWordmarkUrl ?? (isMarkedForDeletion ? null : currentWordmarkUrl),
    hasStoredWordmark,
    hasUnsavedChanges: selectedWordmarkFile !== null || isMarkedForDeletion,
    isLoading,
    isSaving,
    validationError,
    resetChanges,
    removeWordmark,
    selectWordmark,
    saveWordmark
  }
}
