import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import type { FileListEntry } from '@/common/types/FileTypes'

export interface JobDescriptionInitialFile {
  id: string
  fileId: string
  name: string
  type: string
  path: string
  size: number
  url: string
  file?: File
}

export interface ResolvedFileChanges {
  jobDescriptionFileId: string | null | undefined
  fileIdsToDelete: string[]
}

interface UseJobDescriptionFileParams {
  accessToken: string | undefined
  jobProfileId: string | undefined
  isModalOpen: boolean
}

const APP_NAME = 'mdm'
const ACCESS_SCOPE = 'tenant'

function getJobDescriptionFolderPath(jobProfileId: string): string {
  return `/job-profiles/${jobProfileId}/documents`
}

function createJobDescriptionFile(blob: Blob, fileName: string, mimeType: string): File {
  const type = blob.type || mimeType || 'application/pdf'

  if (blob instanceof File && blob.name === fileName && blob.type === type) {
    return blob
  }

  return new File([blob], fileName, { type })
}

function normalizeFormFileEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value) return [value]
  return []
}

export function useJobDescriptionFile({ accessToken, jobProfileId, isModalOpen }: UseJobDescriptionFileParams) {
  const fileClient = useFileClient({ accessToken } as BusinessAppContextProps)
  const [isLoadingJobDescriptionFile, setIsLoadingJobDescriptionFile] = useState(false)
  const [initialJobDescriptionFile, setInitialJobDescriptionFile] = useState<JobDescriptionInitialFile | null>(null)
  const [previousFileIds, setPreviousFileIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    let objectUrlToRevoke: string | null = null

    const fetchFile = async () => {
      if (!isModalOpen || !jobProfileId) {
        setInitialJobDescriptionFile(null)
        setPreviousFileIds([])
        setIsLoadingJobDescriptionFile(false)
        return
      }

      try {
        setIsLoadingJobDescriptionFile(true)
        const folderPath = getJobDescriptionFolderPath(jobProfileId)
        const response = await fileClient.getAllFiles({ accessScope: ACCESS_SCOPE }, { appName: APP_NAME, folderPath })

        const files = Array.isArray(response.files) ? response.files : []
        const fileIds = files.map(f => f.fileId).filter((id): id is string => Boolean(id))
        setPreviousFileIds(fileIds)

        const latestFile = [...files]
          .sort((a: FileListEntry, b: FileListEntry) => {
            const aTime = new Date(a.uploadedAt || '').getTime()
            const bTime = new Date(b.uploadedAt || '').getTime()
            return bTime - aTime
          })
          .find(f => Boolean(f.fileId))

        if (!latestFile || cancelled) {
          setInitialJobDescriptionFile(null)
          return
        }

        let fileSize = 0
        let fileUrl = latestFile.path || latestFile.fileId
        const filePath = latestFile.path || ''
        const fileName = latestFile.fileMetadata?.originalFileName || latestFile.fileId
        const mimeType = latestFile.fileMetadata?.mimeType || ''
        let downloadedFile: File | undefined

        try {
          const downloaded = filePath
            ? await fileClient.downloadFileByPath(filePath, accessToken || '')
            : await fileClient.getFile(
                { accessScope: ACCESS_SCOPE, fileId: latestFile.fileId },
                { appName: APP_NAME, folderPath }
              )

          fileSize = downloaded.size
          downloadedFile = createJobDescriptionFile(downloaded, fileName, mimeType)
          objectUrlToRevoke = URL.createObjectURL(downloadedFile)
          fileUrl = objectUrlToRevoke
        } catch (downloadError) {
          console.error('Error downloading existing job description file:', downloadError)
        }

        if (!cancelled) {
          setInitialJobDescriptionFile({
            id: latestFile.fileId,
            fileId: latestFile.fileId,
            name: fileName,
            type: mimeType,
            path: latestFile.path || latestFile.fileId,
            size: fileSize,
            url: fileUrl,
            file: downloadedFile
          })
        }
      } catch (error) {
        if (!cancelled) {
          setInitialJobDescriptionFile(null)
          setPreviousFileIds([])
        }
        console.error('Error fetching existing job description file:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingJobDescriptionFile(false)
        }
      }
    }

    fetchFile()

    return () => {
      cancelled = true
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke)
      }
    }
  }, [accessToken, fileClient, isModalOpen, jobProfileId])

  const resolveFileForSave = useCallback(
    async (formFileValue: unknown, targetJobProfileId: string | undefined): Promise<ResolvedFileChanges> => {
      const entries = normalizeFormFileEntries(formFileValue)
      const fileWasRemoved = Boolean(jobProfileId) && previousFileIds.length > 0 && entries.length === 0

      if (fileWasRemoved) {
        return { jobDescriptionFileId: null, fileIdsToDelete: previousFileIds }
      }

      if (entries.length === 0) {
        return { jobDescriptionFileId: undefined, fileIdsToDelete: [] }
      }

      const firstEntry = entries[0] as Record<string, unknown>
      const existingFileId = firstEntry?.fileId as string | undefined
      if (existingFileId) {
        return { jobDescriptionFileId: existingFileId, fileIdsToDelete: [] }
      }

      const file = (firstEntry?.originFileObj ?? firstEntry?.file) as File | undefined

      if (file instanceof File) {
        const folderPath = getJobDescriptionFolderPath(targetJobProfileId || 'new')
        try {
          const uploadResponse = await fileClient.uploadFile(
            file,
            { accessScope: ACCESS_SCOPE },
            { appName: APP_NAME, folderPath, mimeType: file.type || 'application/pdf' }
          )
          const fileId = uploadResponse?.fileInfo?.fileId || null
          const fileIdsToDelete = fileId ? previousFileIds.filter(id => id !== fileId) : []
          return { jobDescriptionFileId: fileId, fileIdsToDelete }
        } catch (error) {
          console.error('Error uploading job description file:', error)
          return { jobDescriptionFileId: undefined, fileIdsToDelete: [] }
        }
      }

      return { jobDescriptionFileId: undefined, fileIdsToDelete: [] }
    },
    [fileClient, jobProfileId, previousFileIds]
  )

  const cleanupFiles = useCallback(
    async (targetJobProfileId: string, fileIdsToDelete: string[]) => {
      if (!fileIdsToDelete.length) return

      const folderPath = getJobDescriptionFolderPath(targetJobProfileId)
      try {
        await Promise.all(
          fileIdsToDelete.map(fileId =>
            fileClient.deleteFile({ accessScope: ACCESS_SCOPE, fileId }, { appName: APP_NAME, folderPath })
          )
        )
      } catch (error) {
        console.error('Failed to delete previous job description files:', error)
      }
    },
    [fileClient]
  )

  return { isLoadingJobDescriptionFile, initialJobDescriptionFile, resolveFileForSave, cleanupFiles }
}
