/**
 * SpreadsheetDialogsSection Component
 *
 * Contains all dialogs used in the spreadsheet viewer.
 */

import React, { memo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetColumn } from '../types'
import { ManageColumnsDialog } from './ManageColumnsDialog'
import { VersionHistory } from '../../shared/components/VersionHistory'
import { CheckpointDialog } from '../../shared/components/CheckpointDialog'
import { PublishDialog } from '../../shared/components/PublishDialog'
import { CommentPanel } from '../../shared/components/CommentPanel'

export interface SpreadsheetDialogsSectionProps {
  // Edit Row Dialog
  editingRow: Record<string, unknown> | null
  setEditingRow: (row: Record<string, unknown> | null) => void
  formFields: DynamicFormField[]
  handleUpdateRow: (values: Record<string, unknown>) => void
  accessToken: string

  // Manage Columns Dialog
  isManageColumnsDialogOpen: boolean
  setIsManageColumnsDialogOpen: (open: boolean) => void
  columns: SpreadsheetColumn[]
  editingColumns: SpreadsheetColumn[]
  setEditingColumns: React.Dispatch<React.SetStateAction<SpreadsheetColumn[]>>
  handleAddColumn: () => void
  onSaveColumns: (columns: SpreadsheetColumn[]) => void

  // Version History
  showVersionHistory: boolean
  setShowVersionHistory: (show: boolean) => void
  versioning: {
    versions: unknown[]
    isLoading: boolean
    currentVersion?: { version: number }
    isSaving: boolean
    createCheckpoint: (description: string) => Promise<unknown>
  }
  handleRestoreVersion: (versionNumber: number) => Promise<void>

  // Checkpoint Dialog
  showCheckpointDialog: boolean
  setShowCheckpointDialog: (show: boolean) => void

  // Publish Dialog
  showPublishDialog: boolean
  setShowPublishDialog: (show: boolean) => void
  publishing: {
    isPublishing: boolean
    publish: (notes: string, createCheckpoint: boolean) => Promise<unknown>
  }

  // Comments Panel
  showComments: boolean
  setShowComments: (show: boolean) => void
  comments: {
    comments: unknown[]
    unresolvedCount: number
    isLoading: boolean

    createComment: (params: any) => Promise<unknown>
    updateComment: (id: string, data: { content: string }) => Promise<unknown>
    resolveComment: (id: string) => Promise<unknown>
    deleteComment: (id: string) => Promise<unknown>
  }
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string

  testId: string
}

export const SpreadsheetDialogsSection: React.FC<SpreadsheetDialogsSectionProps> = memo(
  function SpreadsheetDialogsSection({
    editingRow,
    setEditingRow,
    formFields,
    handleUpdateRow,
    accessToken,
    isManageColumnsDialogOpen,
    setIsManageColumnsDialogOpen,
    columns,
    editingColumns,
    setEditingColumns,
    handleAddColumn,
    onSaveColumns,
    showVersionHistory,
    setShowVersionHistory,
    versioning,
    handleRestoreVersion,
    showCheckpointDialog,
    setShowCheckpointDialog,
    showPublishDialog,
    setShowPublishDialog,
    publishing,
    showComments,
    setShowComments,
    comments,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    testId
  }) {
    return (
      <>
        {/* Edit Row Dialog */}
        <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
          <DialogContent className="gba:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Row</DialogTitle>
            </DialogHeader>
            {editingRow && (
              <DynamicFormGenerator
                schema={formFields}
                initialValues={editingRow}
                onSubmit={handleUpdateRow}
                submitButtonText="Save Changes"
                showCard={false}
                accessToken={accessToken}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Columns Dialog */}
        <ManageColumnsDialog
          isOpen={isManageColumnsDialogOpen}
          onOpenChange={setIsManageColumnsDialogOpen}
          columns={columns}
          editingColumns={editingColumns}
          setEditingColumns={setEditingColumns}
          onAddColumn={handleAddColumn}
          onSave={onSaveColumns}
          data-testid={`${testId}-manage-columns-dialog`}
        />

        {/* Versioning Dialogs */}
        {showVersionHistory && (
          <VersionHistory
            versions={versioning.versions}
            isLoading={versioning.isLoading}
            onRestore={handleRestoreVersion}
            onClose={() => setShowVersionHistory(false)}
            currentVersion={versioning.currentVersion?.version}
            showAutoSaves={false}
            data-testid="spreadsheet-version-history"
          />
        )}

        {showCheckpointDialog && (
          <CheckpointDialog
            isOpen={showCheckpointDialog}
            onClose={() => setShowCheckpointDialog(false)}
            onSave={async description => {
              await versioning.createCheckpoint(description)
            }}
            isSaving={versioning.isSaving}
            data-testid="spreadsheet-checkpoint-dialog"
          />
        )}

        {showPublishDialog && (
          <PublishDialog
            isOpen={showPublishDialog}
            onClose={() => setShowPublishDialog(false)}
            onPublish={async (publishNotes, createCheckpoint) => {
              await publishing.publish(publishNotes, createCheckpoint)
            }}
            isPublishing={publishing.isPublishing}
            entityType="spreadsheet"
            data-testid="spreadsheet-publish-dialog"
          />
        )}

        {showComments && (
          <CommentPanel
            comments={comments.comments}
            unresolvedCount={comments.unresolvedCount}
            isLoading={comments.isLoading}
            onCreateComment={async (content, parentId, userName, userAvatar) => {
              await comments.createComment({
                type: parentId ? 'document' : 'cell',
                content,
                parentId,
                createdByName: userName,
                createdByAvatar: userAvatar
              })
            }}
            onUpdateComment={async (commentId, content) => {
              await comments.updateComment(commentId, { content })
            }}
            onResolveComment={async commentId => {
              await comments.resolveComment(commentId)
            }}
            onDeleteComment={async commentId => {
              await comments.deleteComment(commentId)
            }}
            onClose={() => setShowComments(false)}
            currentUserId={currentUserId}
            currentUserName={currentUserName || 'User'}
            currentUserAvatar={currentUserAvatar || undefined}
            accessToken={accessToken}
            headerHeight={100}
            data-testid="spreadsheet-comment-panel"
          />
        )}
      </>
    )
  }
)
