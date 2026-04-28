import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from '@newwork/nw-design-system'
import { flowbotClient, toFlowbotDomain } from '@/common/network/flowbot/FlowbotClient'
import type {
  TemplateTreeNode,
  OrganizeDocumentsPayload,
  SuggestStructurePayload,
  DocumentOrganizeResponse,
  OrganizationDecision,
  SuggestStructureResponse,
  ResponseWarning
} from '@/common/network/flowbot/FlowbotClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { updateDocumentLocation, deleteDocument } from '../utils/documentApi'
import {
  folderNodesToTemplateTree,
  buildFolderPathMap,
  collectAllPaths,
  findFoldersForCleanup,
  findFilesInFolderSubtrees,
  planManagedFolderDeletion,
  groupFoldersByDepth,
  MANAGED_FOLDER_MARKER
} from '../utils/organizeUtils'
import type { DocumentItem, ApiConfig, RestClient, AiOrganizeConfig } from '../types'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'

const REFRESH_SETTLE_DELAY_MS = 1500

type OrganizePhase = 'idle' | 'loading' | 'preview' | 'applying' | 'done' | 'error'

export interface OrganizeState {
  phase: OrganizePhase
  decisions: OrganizationDecision[]
  suggestedFolders: TemplateTreeNode[]
  warnings: ResponseWarning[]
  reasoning?: string
  errorMessage?: string
}

const INITIAL_STATE: OrganizeState = {
  phase: 'idle',
  decisions: [],
  suggestedFolders: [],
  warnings: []
}

interface UseDocumentOrganizeProps {
  documents: DocumentItem[]
  entityId: string
  accessToken?: string
  apiConfig?: ApiConfig
  restClient: RestClient
  aiOrganizeConfig?: AiOrganizeConfig
  onRefresh?: () => void
}

export function useDocumentOrganize({
  documents,
  entityId,
  accessToken,
  apiConfig,
  restClient,
  aiOrganizeConfig,
  onRefresh
}: UseDocumentOrganizeProps) {
  const [state, setState] = useState<OrganizeState>(INITIAL_STATE)
  const [dialogOpen, setDialogOpen] = useState(false)

  const documentsRef = useRef(documents)
  useEffect(() => {
    documentsRef.current = documents
  }, [documents])

  const fileDocuments = documents.filter(doc => !doc.folder && (doc.mimeType || doc.fileInfo))
  const hasDocuments = fileDocuments.length > 0

  const openDialog = useCallback(() => {
    setState(INITIAL_STATE)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setState(INITIAL_STATE)
  }, [])

  const buildDocumentInputs = useCallback(
    (selectedIds: string[]) =>
      fileDocuments
        .filter(doc => selectedIds.includes(doc.id))
        .map(doc => ({
          id: doc.id,
          name: doc.name || 'Untitled',
          mimeType: doc.mimeType,
          source: 'existing_entity_doc' as const
        })),
    [fileDocuments]
  )

  const organizeByTemplate = useCallback(
    async (selectedDocIds: string[], template: { folders: FolderNode[] }) => {
      if (!accessToken || !aiOrganizeConfig) return

      const domain = toFlowbotDomain(aiOrganizeConfig.domain)
      if (!domain) return

      flowbotClient.setAccessToken(accessToken)
      setState(prev => ({ ...prev, phase: 'loading' }))

      try {
        const templateTree = folderNodesToTemplateTree(template.folders)

        const payload: OrganizeDocumentsPayload = {
          domain,
          entityType: aiOrganizeConfig.entityType.toLowerCase(),
          entityId,
          templateTree,
          documents: buildDocumentInputs(selectedDocIds)
        }

        const response: DocumentOrganizeResponse = await flowbotClient.organizeDocuments(payload)

        setState({
          phase: 'preview',
          decisions: response.decisions,
          suggestedFolders: templateTree,
          warnings: response.warnings
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Organization failed'
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig, entityId]
  )

  const organizeByDescription = useCallback(
    async (selectedDocIds: string[], description: string) => {
      if (!accessToken || !aiOrganizeConfig) return

      const domain = toFlowbotDomain(aiOrganizeConfig.domain)
      if (!domain) return

      flowbotClient.setAccessToken(accessToken)
      setState(prev => ({ ...prev, phase: 'loading' }))

      try {
        const payload: SuggestStructurePayload = {
          domain,
          entityType: aiOrganizeConfig.entityType.toLowerCase(),
          entityId,
          documents: buildDocumentInputs(selectedDocIds),
          preferences: description
        }

        const response: SuggestStructureResponse = await flowbotClient.suggestDocumentStructure(payload)

        setState({
          phase: 'preview',
          decisions: response.document_assignments,
          suggestedFolders: response.proposed_template,
          warnings: response.warnings,
          reasoning: response.rationale.join('\n')
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Organization failed'
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig, entityId]
  )

  const applyDecisions = useCallback(async () => {
    if (!accessToken || !apiConfig) return

    setState(prev => ({ ...prev, phase: 'applying' }))

    try {
      const cleanupWarnings: string[] = []
      const selectedDocumentIds = new Set(state.decisions.map(d => d.document_id))
      const currentDocuments = documentsRef.current
      const hasDeleteCapability = Boolean(apiConfig.endpoints?.delete || apiConfig.endpoints?.update)

      // --- Phase 1: Evacuate selected files from old folders to root ---
      const foldersToClean = findFoldersForCleanup(currentDocuments)
      const { deletableFolderIds, preservedFolderIds } = planManagedFolderDeletion(
        currentDocuments,
        foldersToClean,
        selectedDocumentIds
      )

      if (preservedFolderIds.size > 0) {
        cleanupWarnings.push(
          getTranslationFromI18nKeyAndLabel(
            'document.ai.organize.cleanup.preserved',
            'Some folders were kept because they contain documents not included in this organization.'
          )
        )
      }

      if (foldersToClean.length > 0 && apiConfig.endpoints?.update && selectedDocumentIds.size > 0) {
        const folderIdsToClean = new Set(foldersToClean.map(f => f.id))
        const selectedFilesInManagedFolders = findFilesInFolderSubtrees(currentDocuments, folderIdsToClean).filter(
          file => selectedDocumentIds.has(file.id)
        )

        for (const file of selectedFilesInManagedFolders) {
          await updateDocumentLocation({
            documentId: file.id,
            document: file,
            parentDocument: null,
            entityId,
            apiConfig,
            accessToken,
            restClient
          })
        }

        if (selectedFilesInManagedFolders.length > 0 && onRefresh) {
          onRefresh()
          await new Promise(r => setTimeout(r, REFRESH_SETTLE_DELAY_MS))
        }
      }

      // --- Phase 2: Delete old folders (deepest-first, level by level) ---
      if (deletableFolderIds.size > 0 && hasDeleteCapability) {
        const freshFoldersToDelete = findFoldersForCleanup(documentsRef.current).filter(folder =>
          deletableFolderIds.has(folder.id)
        )
        const failedFolderDeletes: string[] = []

        const foldersByDepth = groupFoldersByDepth(freshFoldersToDelete, documentsRef.current)
        const sortedDepths = [...foldersByDepth.keys()].sort((a, b) => b - a)

        for (const depth of sortedDepths) {
          const foldersAtDepth = foldersByDepth.get(depth) ?? []

          for (const folder of foldersAtDepth) {
            try {
              await deleteDocument({
                documentId: folder.id,
                document: folder,
                entityId,
                apiConfig,
                accessToken,
                restClient
              })
            } catch {
              failedFolderDeletes.push(folder.name || folder.id)
              console.error('Failed to delete folder:', folder.name)
            }
          }

          if (onRefresh) {
            onRefresh()
            await new Promise(r => setTimeout(r, REFRESH_SETTLE_DELAY_MS))
          }
        }

        if (failedFolderDeletes.length > 0) {
          cleanupWarnings.push(
            getTranslationFromI18nKeyAndLabel(
              'document.ai.organize.cleanup.deleteFailed',
              'Some managed folders could not be deleted and were kept.'
            )
          )
        }
      }

      // --- Phase 3: Create new folder structure ---
      const allNeededPaths = collectAllPaths(state.suggestedFolders)
      const existingPathMap = buildFolderPathMap(documentsRef.current)
      const pathsToCreate = allNeededPaths.filter(p => !existingPathMap.has(p))

      if (pathsToCreate.length > 0 && apiConfig.endpoints?.create) {
        const pathsByDepth = new Map<number, string[]>()
        for (const p of pathsToCreate) {
          const depth = p.split('/').length - 1
          const list = pathsByDepth.get(depth) ?? []
          list.push(p)
          pathsByDepth.set(depth, list)
        }

        const sortedDepths = [...pathsByDepth.keys()].sort((a, b) => a - b)
        const createdPathMap = new Map<string, string>()

        for (const depth of sortedDepths) {
          const pathsAtDepth = pathsByDepth.get(depth) ?? []

          for (const folderPath of pathsAtDepth) {
            const segments = folderPath.split('/')
            const folderName = segments[segments.length - 1]
            const parentPath = segments.slice(0, -1).join('/')

            const parentId = parentPath
              ? (createdPathMap.get(parentPath) ?? existingPathMap.get(parentPath) ?? null)
              : null

            await restClient.post(
              apiConfig.endpoints.create,
              {
                [apiConfig.documentFieldName]: {
                  name: folderName,
                  folder: true,
                  [apiConfig.entityFieldName]: entityId,
                  ...(parentId && { parentDocument: parentId }),
                  description: MANAGED_FOLDER_MARKER,
                  recordState: 'active'
                }
              },
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )
          }

          if (onRefresh) {
            onRefresh()
            await new Promise(resolve => setTimeout(resolve, REFRESH_SETTLE_DELAY_MS))
          }

          const freshPathMap = buildFolderPathMap(documentsRef.current)
          for (const [path, id] of freshPathMap) {
            createdPathMap.set(path, id)
          }
        }
      }

      // --- Phase 4: Move documents per AI decisions ---
      if (state.decisions.length > 0 && apiConfig.endpoints?.update) {
        const finalPathMap = buildFolderPathMap(documentsRef.current)
        const freshDocs = documentsRef.current

        for (const decision of state.decisions) {
          const targetFolderId = finalPathMap.get(decision.target_folder_path)
          const doc = freshDocs.find(d => d.id === decision.document_id)

          if (!targetFolderId || !doc) continue

          await updateDocumentLocation({
            documentId: decision.document_id,
            document: doc,
            parentDocument: targetFolderId,
            entityId,
            apiConfig,
            accessToken,
            restClient
          })
        }
      }

      setState(prev => ({ ...prev, phase: 'done' }))
      toast.success(
        getTranslationFromI18nKeyAndLabel('document.ai.organize.success', 'Documents organized successfully')
      )
      cleanupWarnings.forEach(message => toast.warning(message))

      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply organization'
      setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      toast.error(message)
    }
  }, [accessToken, apiConfig, documents, entityId, restClient, state.suggestedFolders, state.decisions, onRefresh])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    state,
    dialogOpen,
    hasDocuments,
    fileDocuments,
    openDialog,
    closeDialog,
    organizeByTemplate,
    organizeByDescription,
    applyDecisions,
    reset
  }
}
