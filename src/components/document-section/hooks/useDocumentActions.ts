import { toast, useTranslation } from '@newwork/nw-design-system'
import { handleDocumentClick } from '@/common/utils/documentClickHandler'
import {
  DocumentItem,
  ConfirmationModalState,
  NewFolderDialogState,
  RestClient,
  ApiConfig,
  AppActionData
} from '../types'
import translations from '../_i18n'

interface UseDocumentActionsProps {
  documents: DocumentItem[]
  filteredDocuments: DocumentItem[]
  entityId: string
  apiConfig?: ApiConfig
  accessToken?: string
  restClient: RestClient
  onRefresh?: () => void
  uploadActionData: AppActionData
  // State from useDocumentState
  viewMode: 'tree' | 'list'
  selectedItems: string[]
  newFolderName: string
  setNewFolderName: (name: string) => void
  selectedParentFolder: string
  setSelectedParentFolder: (folder: string) => void
  setNewFolderDialog: (dialog: NewFolderDialogState) => void
  setExpandedFolders: (folders: Set<string>) => void
  setConfirmationModal: (modal: ConfirmationModalState) => void
  getFolderChildrenCount: (folderId: string) => number
}

export function useDocumentActions({
  documents,
  filteredDocuments,
  entityId,
  apiConfig,
  accessToken,
  restClient,
  onRefresh,
  uploadActionData,
  viewMode,
  selectedItems,
  newFolderName,
  setNewFolderName,
  selectedParentFolder,
  setSelectedParentFolder,
  setNewFolderDialog,
  setExpandedFolders,
  setConfirmationModal,
  getFolderChildrenCount
}: UseDocumentActionsProps) {
  const { t } = useTranslation(translations)

  // Get the target parent for new folder/upload operations
  const getTargetParentId = (): string | null => {
    if (viewMode !== 'tree' || selectedItems.length === 0) {
      return null // Root level
    }

    // If single folder is selected, use it as parent
    if (selectedItems.length === 1) {
      const selectedDoc = filteredDocuments.find(doc => doc.id === selectedItems[0])
      if (selectedDoc?.folder) {
        return selectedDoc.id
      }
    }

    return null // Default to root level
  }

  // Context-aware folder creation
  const handleCreateFolder = () => {
    const targetParentId = getTargetParentId()
    const parentDoc = targetParentId ? filteredDocuments.find(doc => doc.id === targetParentId) : null

    setNewFolderDialog({
      open: true,
      parentId: targetParentId,
      parentName: parentDoc?.name || undefined
    })
    setNewFolderName('')
    setSelectedParentFolder(targetParentId || 'root')
  }

  // Create new folder via API
  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !accessToken || !apiConfig) {
      toast.error(t('document-toast-error-folder-name-required'))
      return
    }

    if (!apiConfig.endpoints?.create) {
      toast.error(t('document-toast-error-create-endpoint-not-configured'))
      return
    }

    try {
      // Use selected parent folder instead of the initial context
      const finalParentId = selectedParentFolder === 'root' ? null : selectedParentFolder
      const parentDocumentFieldName = apiConfig.parentDocumentFieldName ?? 'parentDocument'

      const payload = {
        [apiConfig.documentFieldName]: {
          name: newFolderName.trim(),
          folder: true, // This is the key field that must be set to true for folders
          [apiConfig.entityFieldName]: entityId,
          ...(finalParentId && { [parentDocumentFieldName]: finalParentId }), // Use configured hierarchy field
          recordState: 'active'
        }
      }

      await restClient.post(apiConfig.endpoints.create, payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      toast.success(t('document-toast-folder-created'))
      setNewFolderDialog({ open: false, parentId: null })
      setNewFolderName('')
      setSelectedParentFolder('')

      // Refresh the documents list
      if (onRefresh) {
        onRefresh()
      }
    } catch (e: any) {
      console.error('Error creating folder:', e)
      toast.error(e?.message || t('document-toast-error-create-folder-failed'))
    }
  }

  // Context-aware file upload
  const handleUpload = () => {
    const firstAction = uploadActionData.combinedData[0]

    if (firstAction) {
      // You could potentially modify the external context data here to include parent info
      firstAction.onClick?.()
    }
  }

  // Expand all folders in tree view
  const handleExpandAll = () => {
    const allFolderIds = filteredDocuments
      .filter(doc => doc.folder && getFolderChildrenCount(doc.id) > 0) // Only expand folders with children
      .map(doc => doc.id)
    setExpandedFolders(new Set(allFolderIds))
  }

  // Collapse all folders in tree view
  const handleCollapseAll = () => {
    setExpandedFolders(new Set())
  }

  // Handle document download
  const handleDownloadDocument = async (document: DocumentItem) => {
    await handleDocumentClick(document, accessToken)
  }

  // Generic action handler for custom actions
  const handleCustomAction = async (action: any, documentId: string) => {
    if (!accessToken || !apiConfig) {
      console.error('Access token or API config not available')
      return
    }

    let actionLabel = t('document-action-confirm')

    try {
      // Find the document
      const document = documents.find(doc => doc.id === documentId)
      if (!document) {
        console.error('Document not found:', documentId)
        toast.error(t('document-toast-error-document-not-found'))
        return
      }

      actionLabel = typeof action.label === 'function' ? action.label(document) : action.label

      // Handle custom onClick function (this will handle update action)
      if (action.onClick) {
        await action.onClick(documentId, document, entityId, accessToken)
        return
      }

      // Handle API call
      if (action.apiEndpoint) {
        let payload

        if (action.payload) {
          // Use custom payload function
          payload = action.payload(documentId, document, entityId)
        } else {
          // Default payload structure
          payload = {
            [apiConfig.documentFieldName]: {
              id: documentId,
              version: document.version,
              [apiConfig.entityFieldName]: entityId
            }
          }
        }

        await restClient.post(action.apiEndpoint, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        toast.success(t('document-toast-action-completed', { action: actionLabel }))

        // Refresh the documents list
        if (onRefresh) {
          onRefresh()
        }
      }
    } catch (e: any) {
      console.error('Error executing action:', action.key, e)
      const errorMessage = t('document-toast-error-action-failed', { action: actionLabel.toLowerCase() })
      toast.error(e?.message || errorMessage)
    }
  }

  // Confirmation modal handlers
  const showConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
    actionLabel: string = t('document-action-confirm')
  ) => {
    setConfirmationModal({
      open: true,
      title,
      message,
      action,
      actionLabel
    })
  }

  return {
    getTargetParentId,
    handleCreateFolder,
    handleCreateNewFolder,
    handleUpload,
    handleExpandAll,
    handleCollapseAll,
    handleDownloadDocument,
    handleCustomAction,
    showConfirmation
  }
}
