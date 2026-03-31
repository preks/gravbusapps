import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import {
  BRANDING_APP_NAME,
  BRANDING_LOGOMARK_FILE_ID,
  BrandingLogomarkValidationError,
  createBrandingLogomarkUploadFile,
  notifyBrandingUpdate,
  resolveBrandingFolderPath,
  validateBrandingLogomarkFile
} from '../brandingFileUtils'

type SaveLogomarkResult = 'uploaded' | 'deleted' | null

interface UseBrandingLogomarkResult {
  currentLogomarkUrl: string | null
  previewLogomarkUrl: string | null
  hasStoredLogomark: boolean
  hasUnsavedChanges: boolean
  isLoading: boolean
  isSaving: boolean
  validationError: BrandingLogomarkValidationError | null
  resetChanges: () => void
  removeLogomark: () => void
  selectLogomark: (file: File) => BrandingLogomarkValidationError | null
  saveLogomark: () => Promise<SaveLogomarkResult>
}

const PUBLIC_FILE_ACCESS = { accessScope: 'public' } as const

const revokeObjectUrl = (objectUrl: string | null) => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
}

export const useBrandingLogomark = (context: BusinessAppContextProps): UseBrandingLogomarkResult => {
  const { accessToken, userInfo, additionalData } = context
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })
  const tenantKey = env('NEXT_PUBLIC_TENANT_KEY') ?? ''
  const folderPath = useMemo(() => resolveBrandingFolderPath(tenantKey), [tenantKey])

  const [currentLogomarkUrl, setCurrentLogomarkUrl] = useState<string | null>(null)
  const [selectedLogomarkFile, setSelectedLogomarkFile] = useState<File | null>(null)
  const [selectedLogomarkUrl, setSelectedLogomarkUrl] = useState<string | null>(null)
  const [hasStoredLogomark, setHasStoredLogomark] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMarkedForDeletion, setIsMarkedForDeletion] = useState(false)
  const [validationError, setValidationError] = useState<BrandingLogomarkValidationError | null>(null)

  const replaceCurrentLogomarkUrl = useCallback((nextLogomarkUrl: string | null) => {
    setCurrentLogomarkUrl(previousLogomarkUrl => {
      if (previousLogomarkUrl && previousLogomarkUrl !== nextLogomarkUrl) {
        revokeObjectUrl(previousLogomarkUrl)
      }
      return nextLogomarkUrl
    })
  }, [])

  const replaceSelectedLogomarkUrl = useCallback((nextLogomarkUrl: string | null) => {
    setSelectedLogomarkUrl(previousLogomarkUrl => {
      if (previousLogomarkUrl && previousLogomarkUrl !== nextLogomarkUrl) {
        revokeObjectUrl(previousLogomarkUrl)
      }
      return nextLogomarkUrl
    })
  }, [])

  const loadCurrentLogomark = useCallback(async () => {
    if (!accessToken) {
      replaceCurrentLogomarkUrl(null)
      setHasStoredLogomark(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const availableFiles = await fileClient.getAllFiles(PUBLIC_FILE_ACCESS, {
        appName: BRANDING_APP_NAME,
        folderPath
      })

      const storedLogomark = availableFiles.files.find(file => file.fileId === BRANDING_LOGOMARK_FILE_ID)

      if (!storedLogomark) {
        replaceCurrentLogomarkUrl(null)
        setHasStoredLogomark(false)
        return
      }

      const logomarkBlob = await fileClient.getFile(
        { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_LOGOMARK_FILE_ID },
        { appName: BRANDING_APP_NAME, folderPath }
      )

      replaceCurrentLogomarkUrl(URL.createObjectURL(logomarkBlob))
      setHasStoredLogomark(true)
    } catch {
      replaceCurrentLogomarkUrl(null)
      setHasStoredLogomark(false)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fileClient, folderPath, replaceCurrentLogomarkUrl])

  useEffect(() => {
    loadCurrentLogomark()
  }, [loadCurrentLogomark])

  useEffect(() => {
    return () => {
      revokeObjectUrl(currentLogomarkUrl)
      revokeObjectUrl(selectedLogomarkUrl)
    }
  }, [currentLogomarkUrl, selectedLogomarkUrl])

  const resetChanges = useCallback(() => {
    setSelectedLogomarkFile(null)
    replaceSelectedLogomarkUrl(null)
    setIsMarkedForDeletion(false)
    setValidationError(null)
  }, [replaceSelectedLogomarkUrl])

  const removeLogomark = useCallback(() => {
    setValidationError(null)
    setSelectedLogomarkFile(null)
    replaceSelectedLogomarkUrl(null)

    if (hasStoredLogomark) {
      setIsMarkedForDeletion(true)
    }
  }, [hasStoredLogomark, replaceSelectedLogomarkUrl])

  const selectLogomark = useCallback(
    (file: File): BrandingLogomarkValidationError | null => {
      const validationResult = validateBrandingLogomarkFile(file)

      if (!validationResult.isValid) {
        setValidationError(validationResult.error ?? null)
        return validationResult.error ?? null
      }

      setValidationError(null)
      setIsMarkedForDeletion(false)
      setSelectedLogomarkFile(file)
      replaceSelectedLogomarkUrl(URL.createObjectURL(file))

      return null
    },
    [replaceSelectedLogomarkUrl]
  )

  const saveLogomark = useCallback(async (): Promise<SaveLogomarkResult> => {
    if (!accessToken) {
      throw new Error('Access token is required to update branding.')
    }

    const hasPendingUpload = selectedLogomarkFile !== null
    const hasPendingDeletion = isMarkedForDeletion && !hasPendingUpload

    if (!hasPendingUpload && !hasPendingDeletion) {
      return null
    }

    setIsSaving(true)

    try {
      if (hasPendingDeletion) {
        const deleted = await fileClient.deleteFile(
          { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_LOGOMARK_FILE_ID },
          { appName: BRANDING_APP_NAME, folderPath }
        )

        if (!deleted) {
          throw new Error('Failed to delete branding logomark.')
        }
      }

      if (selectedLogomarkFile) {
        const uploadFile = createBrandingLogomarkUploadFile(selectedLogomarkFile)

        if (hasStoredLogomark) {
          await fileClient.updateFile(
            uploadFile,
            { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_LOGOMARK_FILE_ID },
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
      await loadCurrentLogomark()
      notifyBrandingUpdate()

      return hasPendingDeletion ? 'deleted' : 'uploaded'
    } finally {
      setIsSaving(false)
    }
  }, [
    accessToken,
    fileClient,
    folderPath,
    hasStoredLogomark,
    isMarkedForDeletion,
    loadCurrentLogomark,
    resetChanges,
    selectedLogomarkFile
  ])

  return {
    currentLogomarkUrl,
    previewLogomarkUrl: selectedLogomarkUrl ?? (isMarkedForDeletion ? null : currentLogomarkUrl),
    hasStoredLogomark,
    hasUnsavedChanges: selectedLogomarkFile !== null || isMarkedForDeletion,
    isLoading,
    isSaving,
    validationError,
    resetChanges,
    removeLogomark,
    selectLogomark,
    saveLogomark
  }
}
