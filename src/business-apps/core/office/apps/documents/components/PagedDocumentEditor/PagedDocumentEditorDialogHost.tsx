import type { ComponentProps, Dispatch, SetStateAction } from 'react'
import type { DocumentFormatting } from '../../types'
import type { PageLayoutPaginationConfig } from '../../utils/pageLayoutUtils'
import { VersionHistory } from '@/business-apps/platform/apps/shared/components/VersionHistory'
import { CheckpointDialog } from '@/business-apps/platform/apps/shared/components/CheckpointDialog'
import { PublishDialog } from '@/business-apps/platform/apps/shared/components/PublishDialog'
import PageSetupDialog from './PageSetupDialog'
import { InsertImageDialog } from './InsertImageDialog'
import { InsertTableDialog } from './InsertTableDialog'
import { SignatureDialog } from './SignatureDialog'
import { PageNumbersDialog } from './PageNumbersDialog'
import { LinkDialog } from './LinkDialog'

export interface PagedDocumentEditorDialogHostProps {
  documentId?: string
  showVersionHistory: boolean
  versions: ComponentProps<typeof VersionHistory>['versions']
  versionUserDisplayMap: ComponentProps<typeof VersionHistory>['userDisplayMap']
  versionLoading: boolean
  currentVersion: ComponentProps<typeof VersionHistory>['currentVersion']
  onRestoreVersion: ComponentProps<typeof VersionHistory>['onRestore']
  onCloseVersionHistory: () => void
  showCheckpointDialog: boolean
  onCloseCheckpointDialog: () => void
  onSaveCheckpoint: ComponentProps<typeof CheckpointDialog>['onSave']
  isSavingCheckpoint: boolean
  showPublishDialog: boolean
  onClosePublishDialog: () => void
  onPublish: ComponentProps<typeof PublishDialog>['onPublish']
  isPublishing: boolean
  showPageSetupDialog: boolean
  setShowPageSetupDialog: Dispatch<SetStateAction<boolean>>
  layoutFormatting: DocumentFormatting
  onApplyPageSetup: (formatting: DocumentFormatting) => void
  showInsertImageDialog: boolean
  setShowInsertImageDialog: Dispatch<SetStateAction<boolean>>
  activeEditor: ComponentProps<typeof InsertImageDialog>['editor']
  imageDialogMode: ComponentProps<typeof InsertImageDialog>['mode']
  uploadImage: ComponentProps<typeof InsertImageDialog>['uploadImage']
  imageUploadContext: ComponentProps<typeof InsertImageDialog>['uploadContext']
  paginationConfig?: PageLayoutPaginationConfig | null
  onSubmitImage?: ComponentProps<typeof InsertImageDialog>['onSubmitImage']
  showInsertTableDialog: boolean
  setShowInsertTableDialog: Dispatch<SetStateAction<boolean>>
  showInsertSignatureDialog: boolean
  setShowInsertSignatureDialog: Dispatch<SetStateAction<boolean>>
  signatureDialogAccessToken: string | null
  onInsertSignature: ComponentProps<typeof SignatureDialog>['onInsertSignature']
  hasEditor: boolean
  pageNumbersDialogOpen: boolean
  setPageNumbersDialogOpen: Dispatch<SetStateAction<boolean>>
  onApplyPageNumbers: ComponentProps<typeof PageNumbersDialog>['onApply']
  showLinkDialog: boolean
  setShowLinkDialog: Dispatch<SetStateAction<boolean>>
  linkDialogMode: ComponentProps<typeof LinkDialog>['mode']
  linkDialogInitialValues: ComponentProps<typeof LinkDialog>['initialValues']
  onApplyLink: ComponentProps<typeof LinkDialog>['onApply']
  onRemoveLink?: ComponentProps<typeof LinkDialog>['onRemoveLink']
}

export function PagedDocumentEditorDialogHost({
  documentId,
  showVersionHistory,
  versions,
  versionUserDisplayMap,
  versionLoading,
  currentVersion,
  onRestoreVersion,
  onCloseVersionHistory,
  showCheckpointDialog,
  onCloseCheckpointDialog,
  onSaveCheckpoint,
  isSavingCheckpoint,
  showPublishDialog,
  onClosePublishDialog,
  onPublish,
  isPublishing,
  showPageSetupDialog,
  setShowPageSetupDialog,
  layoutFormatting,
  onApplyPageSetup,
  showInsertImageDialog,
  setShowInsertImageDialog,
  activeEditor,
  imageDialogMode,
  uploadImage,
  imageUploadContext,
  paginationConfig = null,
  onSubmitImage,
  showInsertTableDialog,
  setShowInsertTableDialog,
  showInsertSignatureDialog,
  setShowInsertSignatureDialog,
  signatureDialogAccessToken,
  onInsertSignature,
  hasEditor,
  pageNumbersDialogOpen,
  setPageNumbersDialogOpen,
  onApplyPageNumbers,
  showLinkDialog,
  setShowLinkDialog,
  linkDialogMode,
  linkDialogInitialValues,
  onApplyLink,
  onRemoveLink
}: Readonly<PagedDocumentEditorDialogHostProps>) {
  return (
    <>
      {documentId && showVersionHistory && (
        <VersionHistory
          versions={versions}
          isLoading={versionLoading}
          userDisplayMap={versionUserDisplayMap}
          onRestore={onRestoreVersion}
          onClose={onCloseVersionHistory}
          currentVersion={currentVersion}
          showAutoSaves={false}
          data-testid="document-version-history"
        />
      )}

      {documentId && showCheckpointDialog && (
        <CheckpointDialog
          isOpen={showCheckpointDialog}
          onClose={onCloseCheckpointDialog}
          onSave={onSaveCheckpoint}
          isSaving={isSavingCheckpoint}
          data-testid="document-checkpoint-dialog"
        />
      )}

      {documentId && showPublishDialog && (
        <PublishDialog
          isOpen={showPublishDialog}
          onClose={onClosePublishDialog}
          onPublish={onPublish}
          isPublishing={isPublishing}
          entityType="document"
          data-testid="document-publish-dialog"
        />
      )}

      {showPageSetupDialog && (
        <PageSetupDialog
          open={showPageSetupDialog}
          onOpenChange={setShowPageSetupDialog}
          formatting={layoutFormatting}
          onApply={onApplyPageSetup}
          data-testid="document-page-setup-dialog"
        />
      )}

      {showInsertImageDialog && activeEditor && (
        <InsertImageDialog
          open={showInsertImageDialog}
          onOpenChange={setShowInsertImageDialog}
          editor={activeEditor}
          mode={imageDialogMode}
          uploadImage={uploadImage}
          uploadContext={imageUploadContext}
          paginationConfig={paginationConfig}
          onSubmitImage={onSubmitImage}
          data-testid="document-insert-image-dialog"
        />
      )}

      {showInsertTableDialog && activeEditor && (
        <InsertTableDialog
          open={showInsertTableDialog}
          onOpenChange={setShowInsertTableDialog}
          editor={activeEditor}
          data-testid="document-insert-table-dialog"
        />
      )}

      {showInsertSignatureDialog && activeEditor && (
        <SignatureDialog
          open={showInsertSignatureDialog}
          onOpenChange={setShowInsertSignatureDialog}
          editor={activeEditor}
          accessToken={signatureDialogAccessToken}
          onInsertSignature={onInsertSignature}
          data-testid="document-insert-signature-dialog"
        />
      )}

      {hasEditor && (
        <PageNumbersDialog
          open={pageNumbersDialogOpen}
          onOpenChange={setPageNumbersDialogOpen}
          pages={layoutFormatting.pages}
          onApply={onApplyPageNumbers}
          data-testid="document-page-numbers-dialog"
        />
      )}

      {showLinkDialog && (
        <LinkDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          mode={linkDialogMode}
          initialValues={linkDialogInitialValues}
          onApply={onApplyLink}
          onRemoveLink={onRemoveLink}
          data-testid="document-link-dialog"
        />
      )}
    </>
  )
}
