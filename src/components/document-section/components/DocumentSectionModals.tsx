import React, { useMemo } from 'react'
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
  ActionMenu
} from '@newwork/nw-design-system'
import { FolderNotchIcon, DownloadSimpleIcon, EyeIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DocumentItem, ConfirmationModalState, NewFolderDialogState } from '../types'
import { useAppActionData } from '@/common/hooks/useAppActionData'

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
    'Update'
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
    'Delete'
  )

  // Build complete menu actions: custom actions + update + delete
  const enrichedMenuActions = useMemo(() => {
    const actions = []

    // Add custom actions (download, etc.) with icons
    customMenuActions.forEach(action => {
      if (action.key === 'download' && !action.icon) {
        actions.push({ ...action, icon: <DownloadSimpleIcon className="gba:h-4 gba:w-4" /> })
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
            label: action.label || 'Update',
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
            label: action.label || 'Delete',
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
  }, [customMenuActions, updateActionData?.combinedData, deleteActionData?.combinedData, setMenuOpen])

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
              {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
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
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('document.folder.create.title', 'Create New Folder')}
            </DialogTitle>
            <DialogDescription>
              {newFolderDialog.parentName
                ? getTranslationFromI18nKeyAndLabel(
                    'document.dialog.creatingIn',
                    'Creating folder in "{ $folderName }"'
                  ).replace('{ $folderName }', newFolderDialog.parentName)
                : getTranslationFromI18nKeyAndLabel('document.dialog.creatingRoot', 'Creating folder at root level')}
            </DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <label htmlFor="folder-name" className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('document.folder.name.label', 'Folder Name')}
              </label>
              <Input
                id="folder-name"
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'document.folder.name.placeholder',
                  'Enter folder name...'
                )}
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
                {getTranslationFromI18nKeyAndLabel('document.folder.parent.label', 'Parent Folder')}
              </label>
              <Select value={selectedParentFolder} onValueChange={setSelectedParentFolder}>
                <SelectTrigger data-testid="document-section-parent-folder-select">
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'document.folder.parent.placeholder',
                      'Select parent folder...'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root" data-testid="document-section-parent-root">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <FolderNotchIcon className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('document.folder.root', 'Root Level')}
                    </div>
                  </SelectItem>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id} data-testid={`document-section-parent-${folder.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <FolderNotchIcon className="gba:h-4 gba:w-4" />
                        {folder.name ||
                          getTranslationFromI18nKeyAndLabel('document.label.untitledFolder', 'Untitled Folder')}
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
              {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleCreateNewFolder}
              disabled={!newFolderName.trim()}
              data-testid="document-section-folder-create-button"
            >
              {getTranslationFromI18nKeyAndLabel('document.folder.create.action', 'Create Folder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
