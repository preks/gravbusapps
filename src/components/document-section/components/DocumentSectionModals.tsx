import { useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ActionMenu,
  useTranslation
} from '@newwork/nw-design-system'
import { FolderNotchIcon, DownloadSimpleIcon, EyeIcon } from '@phosphor-icons/react'
import { DocumentItem, ConfirmationModalState, NewFolderDialogState } from '../types'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import translations from '../_i18n'

interface DocumentMenuAction {
  key: string
  label: ReactNode
  icon?: ReactNode | null
  onClick: () => void
}

interface DocumentSectionModalsProps {
  // Confirmation modal
  readonly confirmationModal: ConfirmationModalState
  readonly handleConfirmAction: () => Promise<void>
  readonly handleCancelAction: () => void
  // New folder dialog
  readonly newFolderDialog: NewFolderDialogState
  readonly setNewFolderDialog: (dialog: NewFolderDialogState) => void
  readonly newFolderName: string
  readonly setNewFolderName: (name: string) => void
  readonly selectedParentFolder: string
  readonly setSelectedParentFolder: (folder: string) => void
  readonly availableFolders: DocumentItem[]
  readonly handleCreateNewFolder: () => Promise<void>
  // Menu
  readonly selectedDocument: DocumentItem | null
  readonly menuMountEl: HTMLElement | null
  readonly menuOpen: boolean
  readonly setMenuOpen: (open: boolean) => void
  readonly customMenuActions: any[]
  // AppAction props for update/delete
  readonly updateActionProps?: {
    contextsArray: any[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  readonly deleteActionProps?: {
    contextsArray: any[]
    buildExternalContextData: (document: DocumentItem) => Record<string, any>
    prefixDataTestId: string
  }
  readonly accessToken?: string
}

export function DocumentSectionModals({
  confirmationModal,
  handleConfirmAction,
  handleCancelAction,
  newFolderDialog,
  setNewFolderDialog,
  newFolderName,
  setNewFolderName,
  selectedParentFolder,
  setSelectedParentFolder,
  availableFolders,
  handleCreateNewFolder,
  selectedDocument,
  menuMountEl,
  menuOpen,
  setMenuOpen,
  customMenuActions,
  updateActionProps,
  deleteActionProps,
  accessToken
}: DocumentSectionModalsProps) {
  const { t } = useTranslation(translations)
  const updateActionLabel = t('document-action-update')
  const deleteActionLabel = t('document-action-delete')

  // Get update action data from flow registry
  const updateActionData = useAppActionData(
    updateActionProps && selectedDocument && accessToken
      ? {
          contextsArray: updateActionProps.contextsArray,
          externalContextData: updateActionProps.buildExternalContextData(selectedDocument),
          accessToken,
          deferMainContextRequestsUntilClick: false, // Load immediately when menu opens
          prefixDataTestId: `${updateActionProps.prefixDataTestId}-${selectedDocument.id}`
        }
      : {
          contextsArray: [],
          accessToken: accessToken || '',
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: 'document-update'
        },
    updateActionLabel
  )

  // Get delete action data from flow registry
  const deleteActionData = useAppActionData(
    deleteActionProps && selectedDocument && accessToken
      ? {
          contextsArray: deleteActionProps.contextsArray,
          externalContextData: deleteActionProps.buildExternalContextData(selectedDocument),
          accessToken,
          deferMainContextRequestsUntilClick: false, // Load immediately when menu opens
          prefixDataTestId: `${deleteActionProps.prefixDataTestId}-${selectedDocument.id}`
        }
      : {
          contextsArray: [],
          accessToken: accessToken || '',
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: 'document-delete'
        },
    deleteActionLabel
  )

  // Build complete menu actions: custom actions + update + delete
  const enrichedMenuActions = useMemo(() => {
    const actions: DocumentMenuAction[] = []

    // Add custom actions (download, etc.) with icons
    customMenuActions.forEach(action => {
      if (action.key === 'download' && !action.icon) {
        actions.push({ ...action, icon: <DownloadSimpleIcon className="gba:h-4 gba:w-4" /> })
      } else if (action.icon === null) {
        actions.push(action)
      } else if (action.icon) {
        actions.push(action)
      } else {
        actions.push({ ...action, icon: <EyeIcon className="gba:h-4 gba:w-4" /> })
      }
    })

    // Add update actions from flow registry
    if (updateActionData?.combinedData && updateActionData.combinedData.length > 0) {
      updateActionData.combinedData.forEach(action => {
        if (action?.onClick) {
          actions.push({
            key: `update-${actions.length}`,
            label: action.label || updateActionLabel,
            icon: action.icon,
            onClick: () => {
              setMenuOpen(false)
              action.onClick?.()
            }
          })
        }
      })
    }

    // Add delete actions from flow registry
    if (deleteActionData?.combinedData && deleteActionData.combinedData.length > 0) {
      deleteActionData.combinedData.forEach(action => {
        if (action?.onClick) {
          actions.push({
            key: `delete-${actions.length}`,
            label: action.label || deleteActionLabel,
            icon: action.icon,
            onClick: () => {
              setMenuOpen(false)
              action.onClick?.()
            }
          })
        }
      })
    }

    return actions
  }, [
    customMenuActions,
    updateActionData?.combinedData,
    deleteActionData?.combinedData,
    setMenuOpen,
    updateActionLabel,
    deleteActionLabel
  ])

  return (
    <>
      {/* Custom three dots menu portal */}
      {selectedDocument &&
        menuMountEl &&
        menuOpen &&
        createPortal(
          <ActionMenu
            actions={enrichedMenuActions}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            data-testid="document-section-action-menu"
          >
            <div />
          </ActionMenu>,
          menuMountEl
        )}

      {/* Confirmation Modal */}
      <Dialog open={confirmationModal.open} onOpenChange={open => !open && handleCancelAction()}>
        <DialogContent data-testid="document-section-confirmation-modal">
          <DialogHeader>
            <DialogTitle>{confirmationModal.title}</DialogTitle>
            <DialogDescription>{confirmationModal.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAction} data-testid="document-section-cancel-button">
              {t('common-cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmAction} data-testid="document-section-confirm-button">
              {confirmationModal.actionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={newFolderDialog.open}
        onOpenChange={open => {
          if (!open) {
            setNewFolderDialog({ open: false, parentId: null })
            setSelectedParentFolder('')
          }
        }}
      >
        <DialogContent data-testid="document-section-new-folder-modal">
          <DialogHeader>
            <DialogTitle>{t('document-folder-create-title')}</DialogTitle>
            <DialogDescription>
              {newFolderDialog.parentName
                ? t('document-dialog-creating-in', { folderName: newFolderDialog.parentName })
                : t('document-dialog-creating-root')}
            </DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <label htmlFor="folder-name" className="gba:text-sm gba:font-medium">
                {t('document-folder-name-label')}
              </label>
              <Input
                id="folder-name"
                placeholder={t('document-folder-name-placeholder')}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                data-testid="document-section-folder-name-input"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreateNewFolder()
                  }
                }}
              />
            </div>

            <div className="gba:space-y-2">
              <label htmlFor="parent-folder" className="gba:text-sm gba:font-medium">
                {t('document-folder-parent-label')}
              </label>
              <Select value={selectedParentFolder} onValueChange={setSelectedParentFolder}>
                <SelectTrigger data-testid="document-section-parent-folder-select">
                  <SelectValue placeholder={t('document-folder-parent-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root" data-testid="document-section-parent-root">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <FolderNotchIcon className="gba:h-4 gba:w-4" />
                      {t('document-folder-root')}
                    </div>
                  </SelectItem>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id} data-testid={`document-section-parent-${folder.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <FolderNotchIcon className="gba:h-4 gba:w-4" />
                        {folder.name || t('document-label-untitled-folder')}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderDialog({ open: false, parentId: null })
                setSelectedParentFolder('')
              }}
              data-testid="document-section-folder-cancel-button"
            >
              {t('common-cancel')}
            </Button>
            <Button
              onClick={handleCreateNewFolder}
              disabled={!newFolderName.trim()}
              data-testid="document-section-folder-create-button"
            >
              {t('document-folder-create-action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
