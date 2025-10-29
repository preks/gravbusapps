import { useCallback } from 'react'
// Modal removed - using state-based confirmation dialogs instead
import { toast } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { startProcess } from '@/common/utils/start-process'
import { useGetInvestmentDocumentsByOpportunityId } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { buildDocumentUrls } from '../utils/documentUrlUtils'

interface Document {
  id: string
  name?: string | null
  description?: string | null
  createdAt: string
  expirationDate?: string | null
  version?: number
  documentType?: {
    id: string
    value: string
    code?: string
  } | null
  documentGroup?: {
    id: string
    value: string
    code?: string
  } | null
  file?: string | null
  mimeType?: string | null
  fileSize?: number
  createdBy?: string | null
  parentDocument?: string | null
  folder?: boolean
  verified?: boolean
  verificationDate?: string | null
  authenticated?: boolean
  authenticationDate?: string | null
  mandatory?: boolean
}

interface DocumentFolder {
  name: string
  count: number
  documents: Document[]
  folderId?: string
  folderVersion?: number
  children?: DocumentFolder[]
}

interface UseDocumentOperationsProps {
  opportunityId: string
  context: BusinessAppContextProps
  documents: Document[]
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>
}

export const useDocumentOperations = ({
  opportunityId,
  context,
  documents,
  setDocuments
}: UseDocumentOperationsProps) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const { fetchInvestmentDocumentsByOpportunityId } = useGetInvestmentDocumentsByOpportunityId(context)

  const fetchDocuments = useCallback(async () => {
    if (!opportunityId || !context.accessToken) {
      return
    }

    try {
      const result = await fetchInvestmentDocumentsByOpportunityId(opportunityId)
      const raw = Array.isArray(result) ? result : []
      const mapped: Document[] = raw.map((d: any) => ({
        ...d,
        parentDocument: d?.parentDocument?.id ?? null
      }))
      setDocuments(mapped)
    } catch (err) {
      console.error('Error fetching opportunity documents:', err)
      throw err
    }
  }, [opportunityId, context.accessToken, fetchInvestmentDocumentsByOpportunityId, setDocuments])

  const openEditDocument = useCallback(
    (doc: Document) => {
      startProcess({
        domain: 'investments',
        processName: 'saveInvestmentDocument',
        payload: {
          opportunityId,
          investmentDocument: {
            id: doc.id,
            version: doc.version,
            name: doc.name,
            documentGroupRef: doc.documentGroup?.id,
            documentTypeRef: doc.documentType?.id,
            parentDocument: doc.parentDocument || undefined
          }
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [opportunityId]
  )

  const handleDeleteDocument = useCallback(
    (document: Document) => {
      if (document.id?.startsWith('mock-')) {
        setDocuments(prev => prev.filter(d => d.id !== document.id))
        toast.success('Document deleted (mock)')
        return
      }
      // Note: This function signature maintained for compatibility
      // but Modal.confirm replaced with state-based confirmation in the component
      console.warn(
        'handleDeleteDocument called but Modal.confirm removed. Use component state-based confirmation instead.'
      )
    },
    [restClient, context.accessToken, opportunityId, fetchDocuments, setDocuments]
  )

  const hasDescendantFiles = useCallback(
    (folderId: string): boolean => {
      if (!folderId) return false

      // Use a breadth-first search to traverse all descendants
      const toVisit: string[] = [folderId]
      const visited = new Set<string>()
      const maxIterations = 1000 // Safety limit to prevent infinite loops
      let iterations = 0

      while (toVisit.length > 0 && iterations < maxIterations) {
        const currentId = toVisit.shift()!

        if (visited.has(currentId)) {
          continue // Skip already visited to prevent cycles
        }
        visited.add(currentId)

        // Check all documents that have this folder as parent
        for (const doc of documents) {
          if (doc.parentDocument === currentId) {
            if (!doc.folder) {
              // Found a file as descendant
              return true
            } else {
              // Found a subfolder, add it to the queue
              if (!visited.has(doc.id)) {
                toVisit.push(doc.id)
              }
            }
          }
        }

        iterations++
      }

      return false
    },
    [documents]
  )

  const handleDeleteFolder = useCallback(
    (node: DocumentFolder) => {
      if (!node.folderId || node.folderVersion == null) return
      if (hasDescendantFiles(node.folderId)) {
        toast.warning('Cannot delete a folder that contains files. Move or delete files first.')
        return
      }
      if (node.folderId.startsWith('mock-')) {
        toast.warning('Cannot delete a folder that contains files.')
        return
      }
      // Note: This function signature maintained for compatibility
      // but Modal.confirm replaced with state-based confirmation in the component
      console.warn(
        'handleDeleteFolder called but Modal.confirm removed. Use component state-based confirmation instead.'
      )
    },
    [restClient, context.accessToken, opportunityId, fetchDocuments, hasDescendantFiles]
  )

  const handleView = useCallback(
    (document: Document) => {
      if (!document.file) {
        toast.warning('No file available to view')
        return
      }

      try {
        const { viewUrl } = buildDocumentUrls(document, opportunityId)
        window.open(viewUrl, '_blank', 'rel=noopener noreferrer')
      } catch (error) {
        console.error('Error building document URL for view:', error)
        toast.error('Failed to open document')
      }
    },
    [opportunityId]
  )

  const handleDownload = useCallback(
    (document: Document) => {
      if (!document.file) {
        toast.warning('No file available to download')
        return
      }

      try {
        const { downloadUrl, downloadFilename } = buildDocumentUrls(document, opportunityId)
        const link = window.document.createElement('a')
        link.href = downloadUrl
        link.download = downloadFilename
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
      } catch (error) {
        console.error('Error building document URL for download:', error)
        toast.error('Failed to download document')
      }
    },
    [opportunityId]
  )

  const persistParentDocumentUpdate = useCallback(
    async (docId: string, newParentId: string | null) => {
      try {
        await restClient.post(
          '/investments/saveInvestmentDocument',
          {
            changeMode: 'UPDATE',
            investmentDocument: {
              id: docId,
              version: documents.find(d => d.id === docId)?.version,
              parentDocument: newParentId,
              folder: documents.find(d => d.id === docId)?.folder || false, // Preserve folder status
              opportunity: opportunityId
            }
          },
          { headers: { Authorization: `Bearer ${context.accessToken}` } }
        )
        toast.success('Document moved')
      } catch (e: any) {
        console.error('Error moving document', e)
        setDocuments(prev =>
          prev.map(d =>
            d.id === docId ? { ...d, parentDocument: documents.find(d => d.id === docId)?.parentDocument || null } : d
          )
        )
        toast.error(e?.message || 'Failed to move document')
      }
    },
    [restClient, context.accessToken, opportunityId, documents, setDocuments]
  )

  return {
    fetchDocuments,
    openEditDocument,
    handleDeleteDocument,
    handleDeleteFolder,
    handleView,
    handleDownload,
    persistParentDocumentUpdate,
    hasDescendantFiles
  }
}

export default useDocumentOperations
