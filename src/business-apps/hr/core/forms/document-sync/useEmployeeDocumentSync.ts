import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useFileClient } from '@/common/network/files/useFileClient'
import { PROCESSES_BASE_URL } from '@/common/utils/serviceResolver'

const GET_EMPLOYEE_DOCUMENTS_BY_IDS = `
  query GetEmployeeDocumentsByIds($ids: [uuid!]!) {
    EmployeeDocument(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
      id
      version
      employeeId
      documentGroup
      type
      name
      file
      mimeType
      fileSize
    }
  }
`

export interface EmployeeDocumentRecord {
  id: string
  version: number
  employeeId: string
  documentGroup?: string | null
  type: string
  name: string
  file: string
  mimeType: string
  fileSize?: number | null
}

export interface ManagedDocumentFile {
  localId: string
  employeeDocumentId?: string
  fileId?: string
  name: string
  mimeType?: string
  size?: number
  url?: string
  originFileObj?: File
}

interface SyncOptions {
  accessToken?: string
  employeeId?: string
  existingDocumentIds?: string[]
  enabled?: boolean
  appName?: string
  folderPath?: string
  accessScope?: 'tenant' | 'public'
  uploadFieldName?: string
}

interface SyncSubmitOptions {
  documentGroup?: string | null
  documentType?: string | null
  documentName?: string | null
  description?: string | null
  validTo?: string | null
  deleteFirst?: boolean
}

interface SyncSubmitResult {
  documentIds: string[]
  primaryDocumentId: string | null
  primaryDocumentRecord: EmployeeDocumentRecord | null
  removedDocumentIds: string[]
  uploadedDocumentIds: string[]
  uploadedDocumentRecords: EmployeeDocumentRecord[]
}

interface EmployeeDocumentCreateResponse {
  employeeDocument?: EmployeeDocumentRecord
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function buildUrl(entry: ManagedDocumentFile): string {
  return entry.url || ''
}

function toInitialFile(entry: ManagedDocumentFile) {
  return {
    id: entry.localId,
    name: entry.name || 'file',
    size: entry.size || 0,
    type: entry.mimeType || '',
    url: buildUrl(entry)
  }
}

async function createEmployeeDocument(
  accessToken: string,
  payload: Record<string, unknown>
): Promise<EmployeeDocumentRecord | null> {
  const endpoint = `${PROCESSES_BASE_URL}/employee/employeeDocuments`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ employeeDocument: payload })
  })

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as EmployeeDocumentCreateResponse
  return json?.employeeDocument ?? null
}

async function updateEmployeeDocument(
  accessToken: string,
  payload: Record<string, unknown>
): Promise<EmployeeDocumentRecord | null> {
  const endpoint = `${PROCESSES_BASE_URL}/employee/employeeDocuments`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ employeeDocument: payload })
  })

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as EmployeeDocumentCreateResponse
  return json?.employeeDocument ?? null
}

async function deleteEmployeeDocument(accessToken: string, record: EmployeeDocumentRecord): Promise<boolean> {
  const endpoint = `${PROCESSES_BASE_URL}/employee/deleteEmployeeDocument`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      employeeDocument: {
        id: record.id,
        version: record.version,
        employeeId: record.employeeId,
        type: record.type,
        name: record.name,
        file: record.file,
        mimeType: record.mimeType
      }
    })
  })
  return response.ok
}

export function useEmployeeDocumentSync({
  accessToken,
  employeeId,
  existingDocumentIds = [],
  enabled = true,
  appName = 'employee-profile',
  folderPath,
  accessScope = 'tenant',
  uploadFieldName = 'fileContent'
}: SyncOptions) {
  const graphQLClient = useGraphQLClient(accessToken)
  const fileClient = useFileClient({ accessToken } as any)

  const [isLoadingInitialFiles, setIsLoadingInitialFiles] = useState(false)
  const [hasInitialDocumentCandidates, setHasInitialDocumentCandidates] = useState(false)
  const [isResolvingInitialDocuments, setIsResolvingInitialDocuments] = useState(false)
  const [hasResolvedInitialDocuments, setHasResolvedInitialDocuments] = useState(false)
  const [managedFiles, setManagedFiles] = useState<ManagedDocumentFile[]>([])
  const [initialFiles, setInitialFiles] = useState<ManagedDocumentFile[]>([])
  const [documentRecordsById, setDocumentRecordsById] = useState<Record<string, EmployeeDocumentRecord>>({})
  const objectUrlsRef = useRef<string[]>([])
  const existingDocumentIdsSignature = useMemo(
    () =>
      existingDocumentIds
        .filter(isNonEmptyString)
        .sort((a, b) => a.localeCompare(b))
        .join('|'),
    [existingDocumentIds]
  )
  const hasInitialDocumentHint = existingDocumentIdsSignature.length > 0

  const resolvedFolderPath = useMemo(() => {
    if (isNonEmptyString(folderPath)) {
      return folderPath
    }
    if (isNonEmptyString(employeeId)) {
      return `/documents/${employeeId}`
    }
    return '/documents'
  }, [employeeId, folderPath])

  const cleanupObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
    objectUrlsRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      cleanupObjectUrls()
    }
  }, [cleanupObjectUrls])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      cleanupObjectUrls()

      const normalizedIds = existingDocumentIdsSignature
        ? existingDocumentIdsSignature.split('|').filter(isNonEmptyString)
        : []
      if (!enabled || !accessToken || !normalizedIds.length) {
        if (isMounted) {
          setInitialFiles([])
          setManagedFiles([])
          setDocumentRecordsById({})
          setIsLoadingInitialFiles(false)
          setHasInitialDocumentCandidates(false)
          setIsResolvingInitialDocuments(false)
          setHasResolvedInitialDocuments(false)
        }
        return
      }

      try {
        if (isMounted) {
          setHasResolvedInitialDocuments(false)
          setIsResolvingInitialDocuments(true)
        }
        const response = await graphQLClient.request<{ EmployeeDocument?: EmployeeDocumentRecord[] }>(
          GET_EMPLOYEE_DOCUMENTS_BY_IDS,
          { ids: normalizedIds }
        )
        const records = response?.EmployeeDocument || []
        const hasRecords = records.length > 0

        if (isMounted) {
          setHasInitialDocumentCandidates(hasRecords)
          setIsLoadingInitialFiles(hasRecords)
        }

        const nextById = records.reduce(
          (acc, record) => {
            acc[record.id] = record
            return acc
          },
          {} as Record<string, EmployeeDocumentRecord>
        )

        const nextManaged: ManagedDocumentFile[] = []
        for (const record of records) {
          let fileBlob: Blob | null = null
          try {
            fileBlob = await fileClient.getFile(
              {
                accessScope,
                fileId: record.file
              },
              {
                appName,
                folderPath: resolvedFolderPath
              }
            )
          } catch {
            try {
              if (isNonEmptyString(accessToken)) {
                fileBlob = await fileClient.downloadFileByPath(record.file, accessToken)
              }
            } catch {
              fileBlob = null
            }
          }

          const url = fileBlob && fileBlob.size > 0 ? URL.createObjectURL(fileBlob) : ''
          if (url) {
            objectUrlsRef.current.push(url)
          }

          nextManaged.push({
            localId: record.id,
            employeeDocumentId: record.id,
            fileId: record.file,
            name: record.name || 'file',
            mimeType: record.mimeType || '',
            size: Number(record.fileSize || 0),
            url
          })
        }

        if (isMounted) {
          setDocumentRecordsById(nextById)
          setInitialFiles(nextManaged)
          setManagedFiles(nextManaged)
        }
      } catch {
        if (isMounted) {
          setDocumentRecordsById({})
          setInitialFiles([])
          setManagedFiles([])
          setHasInitialDocumentCandidates(false)
        }
      } finally {
        if (isMounted) {
          setIsLoadingInitialFiles(false)
          setIsResolvingInitialDocuments(false)
          setHasResolvedInitialDocuments(true)
        }
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [
    accessScope,
    accessToken,
    appName,
    cleanupObjectUrls,
    enabled,
    existingDocumentIdsSignature,
    graphQLClient,
    resolvedFolderPath,
    fileClient
  ])

  const initialByLocalId = useMemo(
    () =>
      initialFiles.reduce(
        (acc, file) => {
          acc[file.localId] = file
          return acc
        },
        {} as Record<string, ManagedDocumentFile>
      ),
    [initialFiles]
  )

  const onFilesChange = useCallback(
    (files: any[]) => {
      const normalized: ManagedDocumentFile[] = (files || []).map((fileObj: any) => {
        const uploadedFile =
          fileObj?.file instanceof File
            ? (fileObj.file as File)
            : fileObj?.originFileObj instanceof File
              ? (fileObj.originFileObj as File)
              : null

        if (uploadedFile) {
          return {
            localId: safeString(fileObj.id, safeString(fileObj.uid, `${Date.now()}`)),
            name: uploadedFile.name,
            mimeType: uploadedFile.type,
            size: uploadedFile.size,
            originFileObj: uploadedFile
          }
        }

        const candidateId = safeString(fileObj.id, safeString(fileObj.uid, ''))
        const existing = initialByLocalId[candidateId]
        if (existing) {
          return existing
        }

        return {
          localId: candidateId || `${Date.now()}`,
          employeeDocumentId: safeString(fileObj.employeeDocumentId) || undefined,
          fileId: safeString(fileObj.fileId) || undefined,
          name: safeString(fileObj.name, 'file'),
          mimeType: safeString(fileObj.type, safeString(fileObj.mimeType)),
          size: Number(fileObj.size || 0),
          url: safeString(fileObj.url, safeString(fileObj.path))
        }
      })

      setManagedFiles(normalized)
    },
    [initialByLocalId]
  )

  const syncDocuments = useCallback(
    async ({
      documentGroup = null,
      documentType = null,
      documentName = null,
      description = null,
      validTo = null,
      deleteFirst = true
    }: SyncSubmitOptions): Promise<SyncSubmitResult> => {
      if (!employeeId || !accessToken) {
        return {
          documentIds: [],
          primaryDocumentId: null,
          primaryDocumentRecord: null,
          removedDocumentIds: [],
          uploadedDocumentIds: [],
          uploadedDocumentRecords: []
        }
      }

      const initialIds = initialFiles
        .map(file => file.employeeDocumentId)
        .filter((id): id is string => isNonEmptyString(id))
      const currentIds = managedFiles
        .filter(file => !file.originFileObj)
        .map(file => file.employeeDocumentId)
        .filter((id): id is string => isNonEmptyString(id))
      const removedDocumentIds = initialIds.filter(id => !currentIds.includes(id))
      const filesToUpload = managedFiles.filter(file => file.originFileObj instanceof File)

      const deletedIds: string[] = []
      const deleteRemovedDocuments = async () => {
        for (const docId of removedDocumentIds) {
          const record = documentRecordsById[docId]
          if (!record) {
            continue
          }
          try {
            const deleted = await deleteEmployeeDocument(accessToken, record)
            if (deleted) {
              deletedIds.push(docId)
            }
          } catch {
            // best effort delete to avoid blocking the main form submit flow
          }
        }
      }

      if (deleteFirst && removedDocumentIds.length > 0) {
        await deleteRemovedDocuments()
      }

      const updatedDocumentRecords: EmployeeDocumentRecord[] = []
      const retainedExistingIds = currentIds.filter(id => initialIds.includes(id))
      for (const retainedId of retainedExistingIds) {
        const retainedRecord = documentRecordsById[retainedId]
        if (!retainedRecord) {
          continue
        }

        const nextDocumentGroup = isNonEmptyString(documentGroup) ? documentGroup : retainedRecord.documentGroup || null
        const nextDocumentType = isNonEmptyString(documentType) ? documentType : retainedRecord.type
        const shouldUpdateMetadata =
          nextDocumentType !== retainedRecord.type ||
          (nextDocumentGroup || null) !== (retainedRecord.documentGroup || null)

        if (!shouldUpdateMetadata) {
          continue
        }

        try {
          const updated = await updateEmployeeDocument(accessToken, {
            id: retainedRecord.id,
            version: retainedRecord.version,
            employeeId: retainedRecord.employeeId,
            documentGroup: nextDocumentGroup,
            type: nextDocumentType,
            name: retainedRecord.name,
            file: retainedRecord.file,
            mimeType: retainedRecord.mimeType,
            fileSize: retainedRecord.fileSize ?? null
          })

          if (updated?.id) {
            updatedDocumentRecords.push(updated)
          }
        } catch {
          // keep submit resilient; do not block payload submission for metadata-only update failures
        }
      }

      const uploadedDocumentRecords: EmployeeDocumentRecord[] = []
      for (const fileEntry of filesToUpload) {
        const uploadedFile = fileEntry.originFileObj
        if (!uploadedFile) {
          continue
        }

        try {
          const uploadResponse = await fileClient.uploadFile(
            uploadedFile,
            { accessScope },
            {
              appName,
              folderPath: resolvedFolderPath,
              mimeType: uploadedFile.type || 'application/octet-stream'
            },
            uploadFieldName
          )

          const created = await createEmployeeDocument(accessToken, {
            employeeId,
            documentGroup,
            type: documentType,
            description: description || '',
            name: documentName || uploadResponse?.fileInfo?.fileMetadata?.originalFileName || uploadedFile.name,
            file: uploadResponse?.fileInfo?.fileId,
            mimeType: uploadResponse?.fileInfo?.fileMetadata?.mimeType || uploadedFile.type,
            fileSize: uploadedFile.size,
            validFrom: new Date().toISOString(),
            validTo: validTo || null
          })

          if (created?.id) {
            uploadedDocumentRecords.push(created)
          }
        } catch {
          // keep submit resilient; payload can still proceed without a new document id
        }
      }

      if (!deleteFirst && removedDocumentIds.length > 0) {
        await deleteRemovedDocuments()
      }

      const retainedIds = currentIds
      const uploadedIds = uploadedDocumentRecords.map(record => record.id)
      const allIds = [...retainedIds, ...uploadedIds]
      const latestRecordsById = {
        ...documentRecordsById,
        ...updatedDocumentRecords.reduce(
          (acc, record) => {
            acc[record.id] = record
            return acc
          },
          {} as Record<string, EmployeeDocumentRecord>
        ),
        ...uploadedDocumentRecords.reduce(
          (acc, record) => {
            acc[record.id] = record
            return acc
          },
          {} as Record<string, EmployeeDocumentRecord>
        )
      }
      const primaryDocumentId = allIds.length > 0 ? allIds[allIds.length - 1] : null
      const primaryDocumentRecord =
        uploadedDocumentRecords.find(record => record.id === primaryDocumentId) ||
        updatedDocumentRecords.find(record => record.id === primaryDocumentId) ||
        (primaryDocumentId ? latestRecordsById[primaryDocumentId] || null : null)

      return {
        documentIds: allIds,
        primaryDocumentId,
        primaryDocumentRecord,
        removedDocumentIds: deletedIds,
        uploadedDocumentIds: uploadedIds,
        uploadedDocumentRecords
      }
    },
    [
      employeeId,
      accessToken,
      initialFiles,
      managedFiles,
      documentRecordsById,
      fileClient,
      accessScope,
      appName,
      resolvedFolderPath,
      uploadFieldName
    ]
  )

  const initialUploadFiles = useMemo(
    () => managedFiles.filter(file => !file.originFileObj).map(toInitialFile),
    [managedFiles]
  )
  const shouldShowInitialDocumentLoading =
    hasInitialDocumentHint && (!hasResolvedInitialDocuments || isResolvingInitialDocuments || isLoadingInitialFiles)
  const hasAnyFiles = managedFiles.length > 0
  const hasPendingNewUpload = managedFiles.some(file => file.originFileObj instanceof File)
  const initialDocumentIdsNormalized = initialFiles
    .map(file => file.employeeDocumentId)
    .filter((id): id is string => isNonEmptyString(id))
  const retainedDocumentIdsNormalized = managedFiles
    .filter(file => !file.originFileObj)
    .map(file => file.employeeDocumentId)
    .filter((id): id is string => isNonEmptyString(id))
  const hasRemovedInitialFiles = initialDocumentIdsNormalized.some(id => !retainedDocumentIdsNormalized.includes(id))

  return {
    managedFiles,
    setManagedFiles,
    initialUploadFiles,
    isLoadingInitialFiles,
    hasInitialDocumentCandidates,
    isResolvingInitialDocuments,
    shouldShowInitialDocumentLoading,
    onFilesChange,
    syncDocuments,
    hasAnyFiles,
    hasPendingNewUpload,
    hasRemovedInitialFiles
  }
}
