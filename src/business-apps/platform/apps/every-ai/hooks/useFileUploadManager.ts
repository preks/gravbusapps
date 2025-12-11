import { useCallback, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

type UploadedFile = {
  id: string
  file: File
}

export type FileUploadManager = {
  files: UploadedFile[]
  uploadFile: (file: File) => UploadedFile
  removeFile: (fileId: string) => void
  clearFiles: () => void
}

const MAX_NUMBER_OF_FILES = 5
const MAX_TOTAL_SIZE = 100 * 1024 * 1024 // 100MB

// Define custom errors
export class MaxNumberOfFilesError extends Error {
  constructor() {
    super('Maximum number of files reached')
  }
}

export class MaxTotalSizeError extends Error {
  constructor() {
    super('Maximum total size reached')
  }
}

export function useFileUploadManager(
  maxNumberOfFiles: number = MAX_NUMBER_OF_FILES,
  maxTotalSize: number = MAX_TOTAL_SIZE
): FileUploadManager {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const totalSize = useMemo(() => files.reduce((acc, file) => acc + file.file.size, 0), [files])
  const nFiles = useMemo(() => files.length, [files])

  const uploadFile = useCallback(
    (file: File) => {
      if (nFiles >= maxNumberOfFiles) {
        throw new MaxNumberOfFilesError()
      }
      if (totalSize + file.size > maxTotalSize) {
        throw new MaxTotalSizeError()
      }

      const id = uuidv4()
      const uploadedFile = {
        id,
        file
      }
      setFiles(prev => [...prev, uploadedFile])
      return uploadedFile
    },
    [nFiles, maxNumberOfFiles, totalSize, maxTotalSize, setFiles]
  )

  const removeFile = useCallback(
    (fileId: string) => {
      setFiles(prev => prev.filter(file => file.id !== fileId))
    },
    [setFiles]
  )

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [setFiles])

  return {
    files,
    uploadFile,
    removeFile,
    clearFiles
  }
}
