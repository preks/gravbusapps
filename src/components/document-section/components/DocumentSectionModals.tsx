import React from 'react'
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
  SelectValue
} from '@newwork/nw-design-system'
import { Folder, Download, Eye } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { DocumentItem, ConfirmationModalState, NewFolderDialogState } from '../types'

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
  accessToken
}: DocumentSectionModalsProps) {
  // Add icons to menu actions
  const enrichedMenuActions = customMenuActions.map(action => {
    if (action.key === 'download' && !action.icon) {
      return { ...action, icon: <Download className="gba:h-4 gba:w-4" /> }
    }
    if (!action.icon) {
      return { ...action, icon: <Eye className="gba:h-4 gba:w-4" /> }
    }
    return action
  })

  return (
    <>
      {/* Custom three dots menu portal */}
      {selectedDocument &&
        menuMountEl &&
        menuOpen &&
        createPortal(
          <AppAction
            mode="button"
            accessToken={accessToken}
            customActions={enrichedMenuActions}
            emptyState="enable"
            lazyLoad={false}
            prefixDataTestId="document-section"
            data-testid="document-section-action-menu"
            onDropdownOpen={() => setMenuOpen(true)}
          >
            <button
              type="button"
              aria-label={getTranslationFromI18nKeyAndLabel('document.aria.openActions', 'Open actions')}
            />
          </AppAction>,
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
                      <Folder className="gba:h-4 gba:w-4" />
                      {getTranslationFromI18nKeyAndLabel('document.folder.root', 'Root Level')}
                    </div>
                  </SelectItem>
                  {availableFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id} data-testid={`document-section-parent-${folder.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Folder className="gba:h-4 gba:w-4" />
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
