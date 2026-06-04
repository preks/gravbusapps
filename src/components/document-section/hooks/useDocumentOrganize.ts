import { useState, useCallback, useRef, useEffect } from 'react'
import { toast, useTranslation } from '@newwork/nw-design-system'
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
import translations from '../_i18n'

const REFRESH_SETTLE_DELAY_MS = 1500

type OrganizeFlowbotDomain = OrganizeDocumentsPayload['domain']

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

function toOrganizeFlowbotDomain(domain?: string): OrganizeFlowbotDomain | undefined {
  const flowbotDomain = toFlowbotDomain(domain)

  if (flowbotDomain === 'crm' || flowbotDomain === 'irm') {
    return flowbotDomain
  }

  return undefined
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

interface OrganizeApplyContext {
  accessToken: string
  apiConfig: ApiConfig
  restClient: RestClient
  entityId: string
  onRefresh?: () => void
}

async function refreshAndWait(onRefresh?: () => void): Promise<void> {
  if (!onRefresh) {
    return
  }

  onRefresh()
  await new Promise(resolve => setTimeout(resolve, REFRESH_SETTLE_DELAY_MS))
}

async function evacuateSelectedFilesFromManagedFolders(
  currentDocuments: DocumentItem[],
  selectedDocumentIds: Set<string>,
  folderIdsToClean: Set<string>,
  context: OrganizeApplyContext
): Promise<void> {
  if (folderIdsToClean.size === 0 || selectedDocumentIds.size === 0 || !context.apiConfig.endpoints?.update) {
    return
  }

  const selectedFilesInManagedFolders = findFilesInFolderSubtrees(currentDocuments, folderIdsToClean).filter(file =>
    selectedDocumentIds.has(file.id)
  )

  for (const file of selectedFilesInManagedFolders) {
    await updateDocumentLocation({
      documentId: file.id,
      document: file,
      parentDocument: null,
      entityId: context.entityId,
      apiConfig: context.apiConfig,
      accessToken: context.accessToken,
      restClient: context.restClient
    })
  }

  if (selectedFilesInManagedFolders.length > 0) {
    await refreshAndWait(context.onRefresh)
  }
}

async function deleteManagedFoldersByDepth(
  folderIdsToDelete: Set<string>,
  documentsRef: React.MutableRefObject<DocumentItem[]>,
  context: OrganizeApplyContext
): Promise<string[]> {
  if (folderIdsToDelete.size === 0 || !(context.apiConfig.endpoints?.delete || context.apiConfig.endpoints?.update)) {
    return []
  }

  const freshFoldersToDelete = findFoldersForCleanup(documentsRef.current).filter(folder =>
    folderIdsToDelete.has(folder.id)
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
          entityId: context.entityId,
          apiConfig: context.apiConfig,
          accessToken: context.accessToken,
          restClient: context.restClient
        })
      } catch {
        failedFolderDeletes.push(folder.name || folder.id)
        console.error('Failed to delete folder:', folder.name)
      }
    }

    await refreshAndWait(context.onRefresh)
  }

  return failedFolderDeletes
}

async function createMissingFolderStructure(
  suggestedFolders: TemplateTreeNode[],
  documentsRef: React.MutableRefObject<DocumentItem[]>,
  context: OrganizeApplyContext
): Promise<void> {
  const allNeededPaths = collectAllPaths(suggestedFolders)
  const existingPathMap = buildFolderPathMap(documentsRef.current)
  const pathsToCreate = allNeededPaths.filter(path => !existingPathMap.has(path))

  if (pathsToCreate.length === 0 || !context.apiConfig.endpoints?.create) {
    return
  }

  const pathsByDepth = groupPathsByDepth(pathsToCreate)
  const sortedDepths = [...pathsByDepth.keys()].sort((a, b) => a - b)
  const createdPathMap = new Map<string, string>()

  for (const depth of sortedDepths) {
    const pathsAtDepth = pathsByDepth.get(depth) ?? []

    for (const folderPath of pathsAtDepth) {
      await createFolderPath(folderPath, createdPathMap, existingPathMap, context)
    }

    await refreshAndWait(context.onRefresh)
    mergeCreatedPathMap(createdPathMap, documentsRef.current)
  }
}

function groupPathsByDepth(paths: string[]): Map<number, string[]> {
  const pathsByDepth = new Map<number, string[]>()

  for (const path of paths) {
    const depth = path.split('/').length - 1
    const list = pathsByDepth.get(depth) ?? []
    list.push(path)
    pathsByDepth.set(depth, list)
  }

  return pathsByDepth
}

async function createFolderPath(
  folderPath: string,
  createdPathMap: Map<string, string>,
  existingPathMap: Map<string, string>,
  context: OrganizeApplyContext
): Promise<void> {
  const createEndpoint = context.apiConfig.endpoints?.create
  if (!createEndpoint) {
    return
  }

  const segments = folderPath.split('/')
  const folderName = segments[segments.length - 1]
  const parentPath = segments.slice(0, -1).join('/')
  const parentId = parentPath ? (createdPathMap.get(parentPath) ?? existingPathMap.get(parentPath) ?? null) : null

  await context.restClient.post(
    createEndpoint,
    {
      [context.apiConfig.documentFieldName]: {
        name: folderName,
        folder: true,
        [context.apiConfig.entityFieldName]: context.entityId,
        ...(parentId && { parentDocument: parentId }),
        description: MANAGED_FOLDER_MARKER,
        recordState: 'active'
      }
    },
    { headers: { Authorization: `Bearer ${context.accessToken}` } }
  )
}

function mergeCreatedPathMap(createdPathMap: Map<string, string>, documents: DocumentItem[]): void {
  const freshPathMap = buildFolderPathMap(documents)

  for (const [path, id] of freshPathMap) {
    createdPathMap.set(path, id)
  }
}

async function moveDocumentsPerAiDecisions(
  decisions: OrganizationDecision[],
  documentsRef: React.MutableRefObject<DocumentItem[]>,
  context: OrganizeApplyContext
): Promise<void> {
  if (decisions.length === 0 || !context.apiConfig.endpoints?.update) {
    return
  }

  const finalPathMap = buildFolderPathMap(documentsRef.current)
  const freshDocs = documentsRef.current

  for (const decision of decisions) {
    const targetFolderId = finalPathMap.get(decision.target_folder_path)
    const doc = freshDocs.find(document => document.id === decision.document_id)

    if (!targetFolderId || !doc) {
      continue
    }

    await updateDocumentLocation({
      documentId: decision.document_id,
      document: doc,
      parentDocument: targetFolderId,
      entityId: context.entityId,
      apiConfig: context.apiConfig,
      accessToken: context.accessToken,
      restClient: context.restClient
    })
  }
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
  const { t } = useTranslation(translations)
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

      const domain = toOrganizeFlowbotDomain(aiOrganizeConfig.domain)
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
        const message = err instanceof Error ? err.message : t('document-ai-organize-error')
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig, entityId, t]
  )

  const organizeByDescription = useCallback(
    async (selectedDocIds: string[], description: string) => {
      if (!accessToken || !aiOrganizeConfig) return

      const domain = toOrganizeFlowbotDomain(aiOrganizeConfig.domain)
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
        const message = err instanceof Error ? err.message : t('document-ai-organize-error')
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig, entityId, t]
  )

  const applyDecisions = useCallback(async () => {
    if (!accessToken || !apiConfig) return

    setState(prev => ({ ...prev, phase: 'applying' }))

    try {
      const cleanupWarnings: string[] = []
      const selectedDocumentIds = new Set(state.decisions.map(d => d.document_id))
      const currentDocuments = documentsRef.current
      const applyContext: OrganizeApplyContext = {
        accessToken,
        apiConfig,
        restClient,
        entityId,
        onRefresh
      }

      const foldersToClean = findFoldersForCleanup(currentDocuments)
      const { deletableFolderIds, preservedFolderIds } = planManagedFolderDeletion(
        currentDocuments,
        foldersToClean,
        selectedDocumentIds
      )

      if (preservedFolderIds.size > 0) {
        cleanupWarnings.push(t('document-ai-organize-cleanup-preserved'))
      }

      await evacuateSelectedFilesFromManagedFolders(
        currentDocuments,
        selectedDocumentIds,
        new Set(foldersToClean.map(folder => folder.id)),
        applyContext
      )

      const failedFolderDeletes = await deleteManagedFoldersByDepth(deletableFolderIds, documentsRef, applyContext)
      if (failedFolderDeletes.length > 0) {
        cleanupWarnings.push(t('document-ai-organize-cleanup-delete-failed'))
      }

      await createMissingFolderStructure(state.suggestedFolders, documentsRef, applyContext)
      await moveDocumentsPerAiDecisions(state.decisions, documentsRef, applyContext)

      setState(prev => ({ ...prev, phase: 'done' }))
      toast.success(t('document-ai-organize-success'))
      cleanupWarnings.forEach(message => toast.warning(message))

      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('document-ai-organize-apply-failed')
      setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      toast.error(message)
    }
  }, [accessToken, apiConfig, documents, entityId, restClient, state.suggestedFolders, state.decisions, onRefresh, t])

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
