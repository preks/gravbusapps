import { useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { FileManagerEntityRef, isFileDocument } from '../types'
import type { DocumentNode } from '../types'

export type DocumentApp = 'crm' | 'irm'

export interface UseDocumentMutationsArgs {
  accessToken?: string
  entity: FileManagerEntityRef
  getAllDocuments: () => DocumentNode[] // to check folder descendants
  setDocuments: (updater: (prev: DocumentNode[]) => DocumentNode[]) => void // optimistic updates
  app?: DocumentApp
}

export const useDocumentMutations = ({
  accessToken,
  entity,
  getAllDocuments,
  setDocuments,
  app = 'crm'
}: UseDocumentMutationsArgs) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const endpoint = app === 'crm' ? '/customer-relations/saveCrmDocument' : '/investments/saveInvestmentDocument'
  const key = app === 'crm' ? 'crmDocument' : 'investmentDocument'

  const renameFolder = useCallback(
    async (folderId: string, version: number, name: string) => {
      await restClient.post(
        endpoint,
        {
          changeMode: 'UPDATE',
          [key]: { id: folderId, version, name, [entity.type]: entity.id }
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    },
    [restClient, accessToken, entity, endpoint, key]
  )

  const deleteNode = useCallback(
    async (id: string, version: number) => {
      await restClient.post(
        endpoint,
        {
          changeMode: 'DELETE',
          [key]: { id, version, [entity.type]: entity.id }
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    },
    [restClient, accessToken, entity, endpoint, key]
  )

  const hasDescendantFiles = useCallback(
    (startFolderId: string): boolean => {
      const docs = getAllDocuments()
      if (!startFolderId) return false
      const toVisit: string[] = [startFolderId]
      const visited = new Set<string>()
      const safety = 5000
      while (toVisit.length && visited.size < safety) {
        const currentId = toVisit.pop() as string
        visited.add(currentId)
        for (const d of docs) {
          if (d.parentDocument === currentId) {
            if (isFileDocument(d)) return true
            toVisit.push(d.id)
          }
        }
      }
      return false
    },
    [getAllDocuments]
  )

  const moveNode = useCallback(
    async (id: string, version: number, newParentId: string | null) => {
      await restClient.post(
        endpoint,
        {
          changeMode: 'UPDATE',
          [key]: { id, version, parentDocument: newParentId ?? '', [entity.type]: entity.id }
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    },
    [restClient, accessToken, entity, endpoint, key]
  )

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      await restClient.post(
        endpoint,
        {
          changeMode: 'INSERT',
          [key]: {
            name,
            format: 'FOLDER',
            parentDocument: parentId ?? '',
            [entity.type]: entity.id,
            version: 0
          }
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    },
    [restClient, accessToken, entity, endpoint, key]
  )

  const optimisticMove = useCallback(
    (id: string, newParentId: string | null) => {
      setDocuments(prev => prev.map(d => (d.id === id ? { ...d, parentDocument: newParentId } : d)))
    },
    [setDocuments]
  )

  return {
    renameFolder,
    deleteNode,
    hasDescendantFiles,
    moveNode,
    optimisticMove,
    createFolder
  }
}
