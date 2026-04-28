import React from 'react'
import { Spinner, Alert, Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
import { OrganizeWithAiDialog } from './components/OrganizeWithAiDialog'

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
  customActions = [],
  toolbarActions = [],
  uploadActionProps,
  createFolderActionProps,
  downloadActionProps,
  updateActionProps,
  deleteActionProps,
  accessToken,
  aiOrganizeConfig,
  'data-testid': dataTestId = 'document-section'
}) => {
  // Listen for process completion events to refresh documents after update/delete flows
  useProcessCompletion({
    onSuccess: () => {
      if (onRefresh) {
        onRefresh()
      }
    }
  })

  // Set up AppAction data hooks for programmatic triggering (upload only - non-document-specific)
  const uploadActionData = useAppActionData(
    uploadActionProps && accessToken
      ? {
          contextsArray: uploadActionProps.contextsArray,
          externalContextData: uploadActionProps.externalContextData,
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
    'Upload'
  )

  // Initialize all state management
  const state = useDocumentState({
    entityId,
    externalSearchTerm,
    onSearchChange
  })

  // Initialize tree operations
  const treeOps = useDocumentTreeOperations({
    documents,
    viewMode: state.viewMode,
    searchTerm: state.searchTerm,
    expandedFolders: state.expandedFolders,
    setExpandedFolders: state.setExpandedFolders,
    onSearchChange
  })

  // Initialize document actions
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

  // Initialize drag and drop
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

  // Initialize confirmation modal handlers
  const confirmModal = useConfirmationModal({
    confirmationModal: state.confirmationModal,
    setConfirmationModal: state.setConfirmationModal
  })

  // Initialize menu
  const menu = useDocumentMenu({
    selectedDocument: state.selectedDocument,
    setSelectedDocument: state.setSelectedDocument,
    downloadActionProps,
    updateActionProps,
    deleteActionProps,
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

  // Initialize row click handler
  const handleRowClick = useDocumentRowClick({
    isDragging: state.isDragging,
    filteredDocuments: treeOps.filteredDocuments,
    handleDownloadDocument: actions.handleDownloadDocument,
    toggleFolderExpansion: treeOps.toggleFolderExpansion,
    viewMode: state.viewMode,
    setSelectedItems: state.setSelectedItems
  })

  // Initialize AI document organization
  const aiOrganize = useDocumentOrganize({
    documents,
    entityId,
    accessToken,
    apiConfig,
    restClient,
    aiOrganizeConfig,
    onRefresh
  })

  // Create table columns
  const columns = createDocumentTableColumns({
    dataTestId,
    viewMode: state.viewMode,
    toggleFolderExpansion: treeOps.toggleFolderExpansion,
    getFolderChildrenCount: treeOps.getFolderChildrenCount,
    handleActionsButtonClick: menu.handleActionsButtonClick
  })

  // Loading state
  if (isLoading) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div data-testid={dataTestId} className="gba:p-6">
        <Alert variant="destructive">
          <div>
            <div className="gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('document.error.loading.title', 'Error Loading Documents')}
            </div>
            <div className="gba:text-sm gba:mt-1">{error}</div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="gba:mt-2">
                {getTranslationFromI18nKeyAndLabel('document.action.retry', 'Retry')}
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
        />

        {/* Table */}
        <DocumentSectionTable
          dataTestId={dataTestId}
          viewMode={state.viewMode}
          displayDocuments={treeOps.displayDocuments}
          columns={columns}
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
          accessToken={accessToken}
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
