import React from 'react'
import { Spinner, Alert, Button, useTranslation } from '@newwork/nw-design-system'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DocumentSectionProps } from './types'
import { useDocumentState } from './hooks/useDocumentState'
import { useDocumentTreeOperations } from './hooks/useDocumentTreeOperations'
import { useDocumentDragDrop } from './hooks/useDocumentDragDrop'
import { useDocumentActions } from './hooks/useDocumentActions'
import { useDocumentMenu } from './hooks/useDocumentMenu'
import { useConfirmationModal } from './hooks/useConfirmationModal'
import { useDocumentRowClick } from './hooks/useDocumentRowClick'
import { createDocumentTableColumns } from './components/DocumentTableColumns'
import { DocumentSectionToolbar } from './components/DocumentSectionToolbar'
import { DocumentSectionTable } from './components/DocumentSectionTable'
import { DocumentSectionModals } from './components/DocumentSectionModals'
import { useDocumentOrganize } from './hooks/useDocumentOrganize'
import { useDocumentSorting } from './hooks/useDocumentSorting'
import { OrganizeWithAiDialog } from './components/OrganizeWithAiDialog'
import { useFolderPrivacy } from './hooks/useFolderPrivacy'
import translations from './_i18n'

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  entityId,
  documents = [],
  isLoading = false,
  error = null,
  onRefresh,
  apiConfig,
  restClient,
  companyData,
  searchTerm: externalSearchTerm,
  onSearchChange,
  defaultViewMode,
  showViewModeToggle = true,
  showActionsColumn = true,
  enableColumnSorting = false,
  onFileClick,
  customActions = [],
  toolbarActions = [],
  uploadActionProps,
  createFolderActionProps,
  downloadActionProps,
  updateActionProps,
  deleteActionProps,
  privacyActionProps,
  accessToken,
  aiOrganizeConfig,
  'data-testid': dataTestId = 'document-section'
}) => {
  const { t } = useTranslation(translations)

  const state = useDocumentState({
    entityId,
    externalSearchTerm,
    onSearchChange,
    defaultViewMode
  })

  const selectedUploadFolderId =
    state.viewMode === 'tree' && state.selectedItems.length === 1
      ? documents.find(document => document.id === state.selectedItems[0] && document.folder)?.id
      : null
  const parentDocumentFieldName = apiConfig?.parentDocumentFieldName ?? 'parentDocument'
  const uploadExternalContextData =
    uploadActionProps && selectedUploadFolderId
      ? {
          ...uploadActionProps.externalContextData,
          parentDocument: selectedUploadFolderId,
          parentDocumentId: selectedUploadFolderId,
          [parentDocumentFieldName]: selectedUploadFolderId
        }
      : uploadActionProps?.externalContextData

  useProcessCompletion({
    onSuccess: () => {
      if (onRefresh) {
        onRefresh()
      }
    }
  })

  const uploadActionData = useAppActionData(
    uploadActionProps && accessToken
      ? {
          contextsArray: uploadActionProps.contextsArray,
          externalContextData: uploadExternalContextData,
          accessToken,
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: uploadActionProps.prefixDataTestId
        }
      : {
          contextsArray: [],
          accessToken: accessToken || '',
          deferMainContextRequestsUntilClick: false,
          prefixDataTestId: 'document-upload'
        },
    t('document-action-upload')
  )

  const treeOps = useDocumentTreeOperations({
    documents,
    viewMode: state.viewMode,
    searchTerm: state.searchTerm,
    expandedFolders: state.expandedFolders,
    setExpandedFolders: state.setExpandedFolders,
    onSearchChange
  })

  const actions = useDocumentActions({
    documents,
    filteredDocuments: treeOps.filteredDocuments,
    entityId,
    apiConfig,
    accessToken,
    restClient,
    onRefresh,
    uploadActionData,
    viewMode: state.viewMode,
    selectedItems: state.selectedItems,
    newFolderName: state.newFolderName,
    setNewFolderName: state.setNewFolderName,
    selectedParentFolder: state.selectedParentFolder,
    setSelectedParentFolder: state.setSelectedParentFolder,
    setNewFolderDialog: state.setNewFolderDialog,
    setExpandedFolders: state.setExpandedFolders,
    setConfirmationModal: state.setConfirmationModal,
    getFolderChildrenCount: treeOps.getFolderChildrenCount
  })

  const dragDrop = useDocumentDragDrop({
    documents,
    entityId,
    apiConfig,
    accessToken,
    restClient,
    onRefresh,
    draggedDocument: state.draggedDocument,
    setDraggedDocument: state.setDraggedDocument,
    setDropTarget: state.setDropTarget,
    setIsDroppingOnRoot: state.setIsDroppingOnRoot,
    setIsOverDropZone: state.setIsOverDropZone,
    mouseDownPos: state.mouseDownPos,
    setMouseDownPos: state.setMouseDownPos,
    setIsDragging: state.setIsDragging,
    isFolderDescendant: treeOps.isFolderDescendant,
    companyData // Pass company data for MDM operations
  })

  const confirmModal = useConfirmationModal({
    confirmationModal: state.confirmationModal,
    setConfirmationModal: state.setConfirmationModal
  })

  // Initialize folder privacy dialog state (roles read from selected document)
  const privacy = useFolderPrivacy()

  // Initialize menu
  const menu = useDocumentMenu({
    selectedDocument: state.selectedDocument,
    setSelectedDocument: state.setSelectedDocument,
    downloadActionProps,
    updateActionProps,
    deleteActionProps,
    privacyActionProps,
    customActions,
    accessToken,
    apiConfig,
    menuOpen: state.menuOpen,
    setMenuOpen: state.setMenuOpen,
    menuMountEl: state.menuMountEl,
    setMenuMountEl: state.setMenuMountEl,
    handleDownloadDocument: actions.handleDownloadDocument,
    handleCustomAction: actions.handleCustomAction,
    showConfirmation: actions.showConfirmation
  })

  const handleRowClick = useDocumentRowClick({
    isDragging: state.isDragging,
    filteredDocuments: treeOps.filteredDocuments,
    handleDownloadDocument: actions.handleDownloadDocument,
    onFileClick,
    toggleFolderExpansion: treeOps.toggleFolderExpansion,
    viewMode: state.viewMode,
    setSelectedItems: state.setSelectedItems
  })

  const aiOrganize = useDocumentOrganize({
    documents,
    entityId,
    accessToken,
    apiConfig,
    restClient,
    aiOrganizeConfig,
    onRefresh
  })

  const columns = createDocumentTableColumns({
    dataTestId,
    viewMode: state.viewMode,
    showActionsColumn,
    toggleFolderExpansion: treeOps.toggleFolderExpansion,
    getFolderChildrenCount: treeOps.getFolderChildrenCount,
    handleActionsButtonClick: menu.handleActionsButtonClick,
    t
  })

  const documentSorting = useDocumentSorting({
    documents: treeOps.displayDocuments,
    columns,
    enabled: enableColumnSorting
  })

  if (isLoading) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={dataTestId} className="gba:p-6">
        <Alert variant="destructive">
          <div>
            <div className="gba:font-medium">{t('document-error-loading-title')}</div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gba:mt-2">
                {t('document-action-retry')}
              </Button>
            )}
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid={dataTestId} className="gba:w-full">
      <div className="gba:space-y-4">
        {/* Toolbar */}
        <DocumentSectionToolbar
          dataTestId={dataTestId}
          viewMode={state.viewMode}
          setViewMode={state.setViewMode}
          selectedItems={state.selectedItems}
          setSelectedItems={state.setSelectedItems}
          filteredDocuments={treeOps.filteredDocuments}
          searchTerm={state.searchTerm}
          handleSearchChange={state.handleSearchChange}
          createFolderActionProps={createFolderActionProps}
          uploadActionProps={uploadActionProps}
          toolbarActions={toolbarActions}
          handleCreateFolder={actions.handleCreateFolder}
          handleUpload={actions.handleUpload}
          handleExpandAll={actions.handleExpandAll}
          handleCollapseAll={actions.handleCollapseAll}
          showAiOrganize={!!aiOrganizeConfig && aiOrganize.hasDocuments}
          onAiOrganize={aiOrganize.openDialog}
          showViewModeToggle={showViewModeToggle}
        />

        {/* Table */}
        <DocumentSectionTable
          dataTestId={dataTestId}
          viewMode={state.viewMode}
          displayDocuments={documentSorting.sortedDocuments}
          columns={columns}
          enableColumnSorting={enableColumnSorting}
          sortColumnId={documentSorting.sortColumnId}
          sortDirection={documentSorting.sortDirection}
          onSortChange={documentSorting.handleSortChange}
          draggedDocument={state.draggedDocument}
          dropTarget={state.dropTarget}
          isDroppingOnRoot={state.isDroppingOnRoot}
          isOverDropZone={state.isOverDropZone}
          selectedItems={state.selectedItems}
          handleRowClick={handleRowClick}
          handleMouseDown={dragDrop.handleMouseDown}
          handleMouseMove={dragDrop.handleMouseMove}
          handleMouseUp={dragDrop.handleMouseUp}
          handleDragStart={dragDrop.handleDragStart}
          handleDragOver={dragDrop.handleDragOver}
          handleDragLeave={dragDrop.handleDragLeave}
          handleDrop={dragDrop.handleDrop}
          handleDragEnd={dragDrop.handleDragEnd}
          handleDropZoneOver={dragDrop.handleDropZoneOver}
          handleDropZoneLeave={dragDrop.handleDropZoneLeave}
          handleDropZoneDrop={dragDrop.handleDropZoneDrop}
          handleRootDragOver={dragDrop.handleRootDragOver}
          handleRootDragLeave={dragDrop.handleRootDragLeave}
          handleRootDrop={dragDrop.handleRootDrop}
        />

        {/* Modals */}
        <DocumentSectionModals
          confirmationModal={state.confirmationModal}
          handleConfirmAction={confirmModal.handleConfirm}
          handleCancelAction={confirmModal.handleCancel}
          newFolderDialog={state.newFolderDialog}
          setNewFolderDialog={state.setNewFolderDialog}
          newFolderName={state.newFolderName}
          setNewFolderName={state.setNewFolderName}
          selectedParentFolder={state.selectedParentFolder}
          setSelectedParentFolder={state.setSelectedParentFolder}
          availableFolders={treeOps.availableFolders}
          handleCreateNewFolder={actions.handleCreateNewFolder}
          selectedDocument={state.selectedDocument}
          menuMountEl={state.menuMountEl}
          menuOpen={state.menuOpen}
          setMenuOpen={state.setMenuOpen}
          customMenuActions={menu.customMenuActions}
          updateActionProps={updateActionProps}
          deleteActionProps={deleteActionProps}
          privacyActionProps={privacyActionProps}
          accessToken={accessToken}
          // Folder privacy dialog
          privacyDialog={{
            open: privacy.dialog.open,
            folderName: privacy.dialog.folderName,
            documentId: privacy.dialog.documentId,
            documentVersion: privacy.dialog.documentVersion,
            roles: privacy.dialog.roles,
            loading: privacy.dialog.loading,
            saving: privacy.dialog.saving,
            onPrivacyClose: () => privacy.dialog.setOpen(false),
            onPrivacyAddRole: privacy.addRole,
            onPrivacyRemoveRole: privacy.removeRole,
            onPrivacySave: privacy.save
          }}
        />
      </div>

      {/* AI Organize Dialog */}
      {aiOrganizeConfig && accessToken && (
        <OrganizeWithAiDialog
          open={aiOrganize.dialogOpen}
          onClose={aiOrganize.closeDialog}
          fileDocuments={aiOrganize.fileDocuments}
          aiOrganizeConfig={aiOrganizeConfig}
          accessToken={accessToken}
          state={aiOrganize.state}
          onOrganizeByTemplate={aiOrganize.organizeByTemplate}
          onOrganizeByDescription={aiOrganize.organizeByDescription}
          onApply={aiOrganize.applyDecisions}
          onReset={aiOrganize.reset}
          dataTestId={`${dataTestId}-ai-organize`}
        />
      )}
    </div>
  )
}

export default DocumentSection
