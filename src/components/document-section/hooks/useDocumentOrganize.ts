import { useState, useCallback } from 'react'
import { toast } from '@newwork/nw-design-system'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'
import type {
  DocumentOrganizeResponse,
  OrganizationDecision,
  SuggestStructureResponse
} from '@/common/network/flowbot/FlowbotClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { DocumentItem, ApiConfig, RestClient, AiOrganizeConfig } from '../types'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'

type OrganizePhase = 'idle' | 'loading' | 'preview' | 'applying' | 'done' | 'error'

interface OrganizeState {
  phase: OrganizePhase
  decisions: OrganizationDecision[]
  suggestedFolders: FolderNode[]
  warnings: string[]
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

  const fileDocuments = documents.filter(doc => !doc.folder && doc.mimeType)
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
          parentFolder: doc.parentDocument
        })),
    [fileDocuments]
  )

  const organizeByTemplate = useCallback(
    async (selectedDocIds: string[], template: { folders: FolderNode[] }) => {
      if (!accessToken) return

      flowbotClient.setAccessToken(accessToken)
      setState(prev => ({ ...prev, phase: 'loading' }))

      try {
        const response: DocumentOrganizeResponse = await flowbotClient.organizeDocuments({
          documents: buildDocumentInputs(selectedDocIds),
          template,
          entityType: aiOrganizeConfig?.entityType,
          domain: aiOrganizeConfig?.domain
        })

        setState({
          phase: 'preview',
          decisions: response.decisions,
          suggestedFolders: response.suggestedFolders as FolderNode[],
          warnings: response.warnings
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Organization failed'
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig]
  )

  const organizeByDescription = useCallback(
    async (selectedDocIds: string[], description: string) => {
      if (!accessToken) return

      flowbotClient.setAccessToken(accessToken)
      setState(prev => ({ ...prev, phase: 'loading' }))

      try {
        const suggestResponse: SuggestStructureResponse = await flowbotClient.suggestDocumentStructure({
          documents: buildDocumentInputs(selectedDocIds),
          description,
          entityType: aiOrganizeConfig?.entityType,
          domain: aiOrganizeConfig?.domain
        })

        const organizeResponse: DocumentOrganizeResponse = await flowbotClient.organizeDocuments({
          documents: buildDocumentInputs(selectedDocIds),
          template: { folders: suggestResponse.suggestedStructure as FolderNode[] },
          description,
          entityType: aiOrganizeConfig?.entityType,
          domain: aiOrganizeConfig?.domain
        })

        setState({
          phase: 'preview',
          decisions: organizeResponse.decisions,
          suggestedFolders: organizeResponse.suggestedFolders as FolderNode[],
          warnings: [...suggestResponse.warnings, ...organizeResponse.warnings],
          reasoning: suggestResponse.reasoning
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Organization failed'
        setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      }
    },
    [accessToken, buildDocumentInputs, aiOrganizeConfig]
  )

  const applyDecisions = useCallback(async () => {
    if (!accessToken || !apiConfig) return

    setState(prev => ({ ...prev, phase: 'applying' }))

    try {
      const existingFolderNames = new Set(documents.filter(d => d.folder).map(d => d.name?.toLowerCase()))
      const foldersToCreate = state.suggestedFolders.filter(f => !existingFolderNames.has(f.name.toLowerCase()))

      if (foldersToCreate.length > 0 && apiConfig.endpoints?.create) {
        for (const folder of foldersToCreate) {
          await restClient.post(
            apiConfig.endpoints.create,
            {
              [apiConfig.documentFieldName]: {
                name: folder.name,
                folder: true,
                [apiConfig.entityFieldName]: entityId,
                description: `Folder: ${folder.name}`,
                recordState: 'active'
              }
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
        }
      }

      setState(prev => ({ ...prev, phase: 'done' }))
      toast.success(
        getTranslationFromI18nKeyAndLabel('document.ai.organize.success', 'Documents organized successfully')
      )

      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply organization'
      setState(prev => ({ ...prev, phase: 'error', errorMessage: message }))
      toast.error(message)
    }
  }, [accessToken, apiConfig, documents, entityId, restClient, state.suggestedFolders, onRefresh])

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
