/**
 * SpreadsheetDialogs Component
 *
 * Container for all dialogs used in the SpreadsheetAppViewer.
 * Includes edit row, manage columns, version history, checkpoint, publish, and comments dialogs.
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Card,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Columns, Eye, EyeOff, Trash2, Plus, Save } from 'lucide-react'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetColumn, ColumnType } from '../types'
import { VersionHistory } from '../../../../../platform/apps/shared/components/VersionHistory'
import { CheckpointDialog } from '../../../../../platform/apps/shared/components/CheckpointDialog'
import { PublishDialog } from '../../../../../platform/apps/shared/components/PublishDialog'
import { CommentPanel } from '../../../../../platform/apps/shared/components/CommentPanel'
import type { useVersioning } from '../../../../../platform/apps/shared/hooks/useVersioning'
import type { useComments } from '../../../../../platform/apps/shared/hooks/useComments'
import type { usePublishing } from '../../../../../platform/apps/shared/hooks/usePublishing'

export interface SpreadsheetDialogsProps {
  // Edit Row Dialog
  editingRow: Record<string, unknown> | null
  setEditingRow: (row: Record<string, unknown> | null) => void
  formFields: DynamicFormField[]
  onUpdateRow: (values: Record<string, unknown>) => void
  accessToken: string

  // Manage Columns Dialog
  isManageColumnsDialogOpen: boolean
  setIsManageColumnsDialogOpen: (open: boolean) => void
  editingColumns: SpreadsheetColumn[]
  setEditingColumns: React.Dispatch<React.SetStateAction<SpreadsheetColumn[]>>
  activeSheetColumns: SpreadsheetColumn[]
  onSaveColumns: (columns: SpreadsheetColumn[]) => void
  onAddColumn: () => void

  // Version History
  showVersionHistory: boolean
  setShowVersionHistory: (show: boolean) => void
  versioning: ReturnType<typeof useVersioning>
  onRestoreVersion: (versionNumber: number) => Promise<void>

  // Checkpoint Dialog
  showCheckpointDialog: boolean
  setShowCheckpointDialog: (show: boolean) => void

  // Publish Dialog
  showPublishDialog: boolean
  setShowPublishDialog: (show: boolean) => void
  publishing: ReturnType<typeof usePublishing>

  // Comments Panel
  showComments: boolean
  setShowComments: (show: boolean) => void
  comments: ReturnType<typeof useComments>
  userId?: string
  currentUserName: string
  currentUserAvatar?: string
}

export const SpreadsheetDialogs: React.FC<SpreadsheetDialogsProps> = ({
  editingRow,
  setEditingRow,
  formFields,
  onUpdateRow,
  accessToken,
  isManageColumnsDialogOpen,
  setIsManageColumnsDialogOpen,
  editingColumns,
  setEditingColumns,
  activeSheetColumns,
  onSaveColumns,
  onAddColumn,
  showVersionHistory,
  setShowVersionHistory,
  versioning,
  onRestoreVersion,
  showCheckpointDialog,
  setShowCheckpointDialog,
  showPublishDialog,
  setShowPublishDialog,
  publishing,
  showComments,
  setShowComments,
  comments,
  userId,
  currentUserName,
  currentUserAvatar
}) => {
  const columnsToEdit = editingColumns.length > 0 ? editingColumns : activeSheetColumns

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
              onSubmit={onUpdateRow}
              submitButtonText="Save Changes"
              showCard={false}
              accessToken={accessToken}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog
        open={isManageColumnsDialogOpen}
        onOpenChange={open => {
          if (open) {
            setEditingColumns(activeSheetColumns.map(c => ({ ...c })))
          } else {
            setEditingColumns([])
          }
          setIsManageColumnsDialogOpen(open)
        }}
      >
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Columns className="gba:w-5 gba:h-5" />
              Manage Columns
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
            {columnsToEdit.length === 0 ? (
              <p className="gba:text-muted-foreground gba:text-center gba:py-4">
                No custom columns. Click "Add Column" to create one.
              </p>
            ) : (
              columnsToEdit.map(column => {
                const updateColumnField = (field: keyof SpreadsheetColumn, value: unknown) => {
                  setEditingColumns(prev =>
                    prev.length > 0
                      ? prev.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                      : activeSheetColumns.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                  )
                }

                return (
                  <Card key={column.id} className="gba:p-4">
                    <div className="gba:space-y-4">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-label-${column.id}`}>Column Name</Label>
                          <Input
                            id={`column-label-${column.id}`}
                            value={column.label}
                            onChange={e => updateColumnField('label', e.target.value)}
                            placeholder="Column name"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-type-${column.id}`}>Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value: ColumnType) => updateColumnField('type', value)}
                          >
                            <SelectTrigger id={`column-type-${column.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="datetime">Date & Time</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="select">Single Select</SelectItem>
                              <SelectItem value="multiselect">Multi Select</SelectItem>
                              <SelectItem value="boolean">Checkbox</SelectItem>
                              <SelectItem value="calculated">Calculated</SelectItem>
                              <SelectItem value="reference">Reference</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant="secondary" className="gba:text-xs">
                            {column.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateColumnField('isVisible', !column.isVisible)}
                            className="gba:text-xs"
                          >
                            {column.isVisible ? (
                              <>
                                <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                                Hidden
                              </>
                            )}
                          </Button>
                        </div>
                        {columnsToEdit.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingColumns(prev =>
                                prev.length > 0
                                  ? prev.filter(c => c.id !== column.id)
                                  : activeSheetColumns.filter(c => c.id !== column.id)
                              )
                            }}
                            className="gba:text-destructive hover:gba:text-destructive"
                          >
                            <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageColumnsDialogOpen(false)
                onAddColumn()
              }}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Column
            </Button>
            <Button
              onClick={() => {
                const finalColumns = editingColumns.length > 0 ? editingColumns : activeSheetColumns
                onSaveColumns(finalColumns)
                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              <Save className="gba:w-4 gba:h-4 gba:mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History */}
      {showVersionHistory && (
        <VersionHistory
          versions={versioning.versions}
          isLoading={versioning.isLoading}
          onRestore={onRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
          currentVersion={versioning.currentVersion?.version}
          showAutoSaves={false}
          data-testid="spreadsheet-version-history"
        />
      )}

      {/* Checkpoint Dialog */}
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

      {/* Publish Dialog */}
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

      {/* Comment Panel */}
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
          currentUserId={userId}
          currentUserName={currentUserName || 'User'}
          currentUserAvatar={currentUserAvatar}
          accessToken={accessToken}
          headerHeight={100}
          data-testid="spreadsheet-comment-panel"
        />
      )}
    </>
  )
}
