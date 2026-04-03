import { useState, useCallback, useEffect, useRef } from 'react'
import type { UploadFile } from 'antd/es/upload/interface'
import type { FileClient } from '@/common/network/files/FileClient'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import {
  extractExpenseItemFileId,
  fetchExpenseItemFileBlob,
  type ExpenseItemFileRecord
} from './expenseItemAttachmentFetch'

function collectBlobUrls(files: UploadFile[]): string[] {
  return files.map(f => f.url).filter((url): url is string => Boolean(url && url.startsWith('blob:')))
}

async function fileRecordToUploadFile(
  fileInfo: ExpenseItemFileRecord,
  fileClient: FileClient,
  employeeId: string,
  itemId: string,
  isStillMounted: () => boolean
): Promise<UploadFile | null> {
  try {
    const fileId = extractExpenseItemFileId(fileInfo)
    const fileBlob = await fetchExpenseItemFileBlob(fileClient, fileId, employeeId, itemId)

    if (!fileBlob || !isStillMounted()) {
      return null
    }

    const downloadUrl = URL.createObjectURL(fileBlob)

    return {
      uid: fileId,
      name: fileInfo.fileName || fileId,
      status: 'done',
      url: downloadUrl,
      size: fileBlob.size,
      type: fileBlob.type || 'application/octet-stream'
    }
  } catch {
    return null
  }
}

export interface UseExpenseItemFileAttachmentsParams {
  detailedItem: ExpenseItem | null
  fileClient: FileClient
  employeeId: string | undefined
  accessToken: string | undefined
}

export function useExpenseItemFileAttachments({
  detailedItem,
  fileClient,
  employeeId,
  accessToken
}: UseExpenseItemFileAttachmentsParams): {
  fileList: UploadFile[]
  fileLoading: boolean
} {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const isMountedRef = useRef(true)
  const objectUrlsRef = useRef<string[]>([])
  const fetchGenerationRef = useRef(0)

  const revokeTrackedUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      revokeTrackedUrls()
    }
  }, [revokeTrackedUrls])

  const invalidateInFlightFetches = useCallback(() => {
    fetchGenerationRef.current += 1
  }, [])

  const fetchFileAttachments = useCallback(
    async (item: ExpenseItem) => {
      if (!item?.expenseItemFile || item.expenseItemFile.length === 0) {
        revokeTrackedUrls()
        setFileList([])
        return
      }

      if (!employeeId || !accessToken) {
        return
      }

      const generation = ++fetchGenerationRef.current
      setFileLoading(true)
      revokeTrackedUrls()

      try {
        const isStillMounted = () => isMountedRef.current
        const filePromises = item.expenseItemFile.map(fileInfo =>
          fileRecordToUploadFile(fileInfo, fileClient, employeeId, item.id, isStillMounted)
        )

        const results = await Promise.all(filePromises)
        const processedFiles = results.filter((file): file is UploadFile => file !== null)

        if (generation !== fetchGenerationRef.current) {
          collectBlobUrls(processedFiles).forEach(url => URL.revokeObjectURL(url))
          return
        }

        if (!isMountedRef.current) {
          collectBlobUrls(processedFiles).forEach(url => URL.revokeObjectURL(url))
          return
        }

        objectUrlsRef.current = collectBlobUrls(processedFiles)
        setFileList(processedFiles)
      } catch {
        if (generation === fetchGenerationRef.current && isMountedRef.current) {
          setFileList([])
        }
      } finally {
        if (generation === fetchGenerationRef.current && isMountedRef.current) {
          setFileLoading(false)
        }
      }
    },
    [accessToken, employeeId, fileClient, revokeTrackedUrls]
  )

  useEffect(() => {
    if (!detailedItem) {
      invalidateInFlightFetches()
      revokeTrackedUrls()
      setFileList([])
      setFileLoading(false)
      return
    }
    void fetchFileAttachments(detailedItem)
  }, [detailedItem, fetchFileAttachments, invalidateInFlightFetches, revokeTrackedUrls])

  return { fileList, fileLoading }
}
