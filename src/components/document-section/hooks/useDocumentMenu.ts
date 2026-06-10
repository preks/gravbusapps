import { useMemo, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { DocumentItem, ApiConfig } from '../types'
import { MENU_CLEANUP_DELAY_MS } from '../constants'
import translations from '../_i18n'

interface UseDocumentMenuProps {
  selectedDocument: DocumentItem | null
  setSelectedDocument: (doc: DocumentItem | null) => void
  downloadActionProps?: {
    contextsArray: any[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  updateActionProps?: {
    contextsArray: any[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  deleteActionProps?: {
    contextsArray: any[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  customActions?: Array<{
    key: string
    label: string | ((document: DocumentItem) => string)
    icon?: React.ReactNode
    apiEndpoint?: string
    payload?: (documentId: string, document: DocumentItem, entityId: string) => any
    onClick?: (
      documentId: string,
      document: DocumentItem,
      entityId: string,
      accessToken?: string
    ) => void | Promise<void>
    confirmMessage?: string | ((document: DocumentItem) => string)
  }>
  accessToken?: string
  apiConfig?: ApiConfig
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  menuMountEl: HTMLElement | null
  setMenuMountEl: (el: HTMLElement | null) => void
  handleDownloadDocument: (document: DocumentItem) => Promise<void>
  handleCustomAction: (action: any, documentId: string) => Promise<void>
  showConfirmation: (title: string, message: string, action: () => Promise<void>, actionLabel?: string) => void
}

export function useDocumentMenu({
  selectedDocument,
  setSelectedDocument,
  downloadActionProps,
  updateActionProps,
  deleteActionProps,
  customActions = [],
  accessToken,
  apiConfig,
  menuOpen,
  setMenuOpen,
  menuMountEl,
  setMenuMountEl,
  handleDownloadDocument,
  handleCustomAction,
  showConfirmation
}: UseDocumentMenuProps) {
  const { t } = useTranslation(translations)

  // Handle three-dots click to open custom menu
  const handleActionsButtonClick = (document: DocumentItem, event: React.MouseEvent) => {
    event.stopPropagation()

    // Create menu mount point relative to the clicked button
    try {
      const buttonElement = event.currentTarget as HTMLElement
      // cleanup previous mount
      if (menuMountEl?.parentElement) {
        menuMountEl.remove()
      }

      const mount = globalThis.document.createElement('div')
      mount.style.position = 'absolute'
      mount.style.right = '0px'
      mount.style.top = 'calc(100% + 6px)'
      mount.style.zIndex = '10000'

      // Position relative to button
      buttonElement.style.position = 'relative'
      buttonElement.appendChild(mount)

      setMenuMountEl(mount)
      setMenuOpen(true)
      setSelectedDocument(document)
    } catch (error) {
      console.error('Error creating menu mount:', error)
      setMenuOpen(true)
      setSelectedDocument(document)
    }
  }

  // Custom menu actions for the three dots menu (fully dynamic)
  const customMenuActions = useMemo(() => {
    if (!selectedDocument) return []

    const actions = []

    // Add download action if available (only for files, not folders)
    if (downloadActionProps && selectedDocument.fileInfo && !selectedDocument.folder) {
      actions.push({
        key: 'download',
        label: t('document-action-download'),
        onClick: () => {
          // Trigger download action
          handleDownloadDocument(selectedDocument)
          setMenuOpen(false)
        }
      })
    }

    // NOTE: Update and delete actions are now rendered using useAppActionData hooks
    // in DocumentSectionModals.tsx, not as plain menu items here

    // Add custom actions from configuration (deprecated but still supported for backward compatibility)
    if (customActions && customActions.length > 0 && accessToken && apiConfig) {
      const customActionItems = customActions.map(action => {
        const actionLabel = typeof action.label === 'function' ? action.label(selectedDocument) : action.label

        return {
          key: action.key,
          label: actionLabel,
          onClick: async () => {
            setMenuOpen(false)

            if (action.confirmMessage) {
              const confirmMessage =
                typeof action.confirmMessage === 'function'
                  ? action.confirmMessage(selectedDocument)
                  : action.confirmMessage

              showConfirmation(
                t('document-action-confirm-title', { action: actionLabel }),
                confirmMessage,
                () => handleCustomAction(action, selectedDocument.id),
                actionLabel
              )
            } else {
              await handleCustomAction(action, selectedDocument.id)
            }
          },
          icon: action.icon
        }
      })

      actions.push(...customActionItems)
    }

    return actions
  }, [
    selectedDocument,
    downloadActionProps,
    customActions,
    accessToken,
    apiConfig,
    handleDownloadDocument,
    handleCustomAction,
    showConfirmation,
    setMenuOpen,
    t
  ])

  // Cleanup mount element when menu closes
  useEffect(() => {
    if (!menuOpen && menuMountEl) {
      // Clean up the mount element after a short delay to allow animations
      const cleanupTimer = setTimeout(() => {
        if (menuMountEl.parentElement) {
          menuMountEl.remove()
        }
        setMenuMountEl(null)
        setSelectedDocument(null)
      }, MENU_CLEANUP_DELAY_MS)

      return () => clearTimeout(cleanupTimer)
    }
  }, [menuOpen, menuMountEl, setMenuMountEl, setSelectedDocument])

  return {
    handleActionsButtonClick,
    customMenuActions,
    // Pass through props for AppActionMenu rendering
    updateActionProps,
    deleteActionProps,
    accessToken
  }
}
