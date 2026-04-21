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
  SelectValue,
  useTranslation
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
import translations from '../_i18n'

const getEditableColumns = (columns: SpreadsheetColumn[], fallbackColumns: SpreadsheetColumn[]) =>
  columns.length > 0 ? columns : fallbackColumns

const updateColumnFieldById = (
  columns: SpreadsheetColumn[],
  columnId: string,
  field: keyof SpreadsheetColumn,
  value: unknown
) => columns.map(c => (c.id === columnId ? { ...c, [field]: value } : c))

const removeColumnById = (columns: SpreadsheetColumn[], columnId: string) => columns.filter(c => c.id !== columnId)

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
  const { t } = useTranslation(translations)
  const columnsToEdit = editingColumns.length > 0 ? editingColumns : activeSheetColumns

  return (
    <>
      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('edit-row-title')}</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <DynamicFormGenerator
              schema={formFields}
              initialValues={editingRow}
              onSubmit={onUpdateRow}
              submitButtonText={t('edit-row-save')}
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
              {t('manage-columns-title')}
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
            {columnsToEdit.length === 0 ? (
              <p className="gba:text-muted-foreground gba:text-center gba:py-4">{t('manage-columns-empty')}</p>
            ) : (
              columnsToEdit.map(column => {
                const updateColumnField = (field: keyof SpreadsheetColumn, value: unknown) => {
                  setEditingColumns(prev => {
                    const editableColumns = getEditableColumns(prev, activeSheetColumns)
                    return updateColumnFieldById(editableColumns, column.id, field, value)
                  })
                }

                return (
                  <Card key={column.id} className="gba:p-4">
                    <div className="gba:space-y-4">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-label-${column.id}`}>{t('manage-columns-column-name')}</Label>
                          <Input
                            id={`column-label-${column.id}`}
                            value={column.label}
                            onChange={e => updateColumnField('label', e.target.value)}
                            placeholder={t('manage-columns-column-name-placeholder')}
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-type-${column.id}`}>{t('manage-columns-data-type')}</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value: ColumnType) => updateColumnField('type', value)}
                          >
                            <SelectTrigger id={`column-type-${column.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">{t('manage-columns-type-text')}</SelectItem>
                              <SelectItem value="number">{t('manage-columns-type-number')}</SelectItem>
                              <SelectItem value="currency">{t('manage-columns-type-currency')}</SelectItem>
                              <SelectItem value="percentage">{t('manage-columns-type-percentage')}</SelectItem>
                              <SelectItem value="date">{t('manage-columns-type-date')}</SelectItem>
                              <SelectItem value="datetime">{t('manage-columns-type-datetime')}</SelectItem>
                              <SelectItem value="email">{t('manage-columns-type-email')}</SelectItem>
                              <SelectItem value="phone">{t('manage-columns-type-phone')}</SelectItem>
                              <SelectItem value="url">{t('manage-columns-type-url')}</SelectItem>
                              <SelectItem value="select">{t('manage-columns-type-select')}</SelectItem>
                              <SelectItem value="multiselect">{t('manage-columns-type-multiselect')}</SelectItem>
                              <SelectItem value="boolean">{t('manage-columns-type-boolean')}</SelectItem>
                              <SelectItem value="calculated">{t('manage-columns-type-calculated')}</SelectItem>
                              <SelectItem value="reference">{t('manage-columns-type-reference')}</SelectItem>
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
                                {t('manage-columns-visible')}
                              </>
                            ) : (
                              <>
                                <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                                {t('manage-columns-hidden')}
                              </>
                            )}
                          </Button>
                        </div>
                        {columnsToEdit.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingColumns(prev => {
                                const editableColumns = getEditableColumns(prev, activeSheetColumns)
                                return removeColumnById(editableColumns, column.id)
                              })
                            }}
                            className="gba:text-destructive hover:gba:text-destructive"
                          >
                            <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                            {t('manage-columns-delete')}
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
              {t('manage-columns-cancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageColumnsDialogOpen(false)
                onAddColumn()
              }}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('manage-columns-add-column')}
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
              {t('manage-columns-save')}
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
          messages={{
            title: t('version-history-title'),
            compareMode: t('version-history-compare-mode'),
            cancelCompare: t('version-history-cancel-compare'),
            compareSelected: t('version-history-compare-selected'),
            loading: t('version-history-loading'),
            empty: t('version-history-empty'),
            versionLabel: (num: number) => t('version-history-version', { num }),
            current: t('version-history-current'),
            checkpoint: t('version-history-checkpoint'),
            autosave: t('version-history-autosave'),
            restoreTitle: t('version-history-restore-title'),
            restoreConfirm: (num: number) => t('version-history-restore-confirm', { num }),
            compareHint: t('version-history-compare-hint'),
            unknownUser: t('version-history-unknown-user')
          }}
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
          messages={{
            title: t('checkpoint-title'),
            descriptionLabel: t('checkpoint-description-label'),
            descriptionPlaceholder: t('checkpoint-description-placeholder'),
            descriptionHint: t('checkpoint-description-hint'),
            cancel: t('checkpoint-cancel'),
            save: t('checkpoint-save'),
            saving: t('checkpoint-saving')
          }}
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
          messages={{
            title: t('publish-title', { entity: t('publish-entity-spreadsheet') }),
            alert: t('publish-alert', { entity: t('publish-entity-spreadsheet') }),
            notesLabel: t('publish-notes-label'),
            notesPlaceholder: t('publish-notes-placeholder'),
            notesHint: t('publish-notes-hint'),
            createCheckpointLabel: t('publish-create-checkpoint'),
            cancel: t('publish-cancel'),
            confirm: t('publish-confirm'),
            publishing: t('publish-publishing')
          }}
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
          messages={{
            title: t('shared-comment-panel-title'),
            unresolvedCount: t('shared-comment-unresolved'),
            unresolvedTab: t('shared-comment-unresolved-tab'),
            resolvedTab: t('shared-comment-resolved-tab'),
            allCaughtUp: t('shared-comment-all-caught-up'),
            allResolved: t('shared-comment-all-resolved'),
            noResolved: t('shared-comment-no-resolved'),
            resolvedHere: t('shared-comment-resolved-here'),
            loading: t('shared-comment-loading'),
            addPlaceholder: t('shared-comment-placeholder')
          }}
          threadMessages={{
            reply: t('shared-comment-reply'),
            edit: t('shared-comment-edit'),
            resolve: t('shared-comment-resolve'),
            delete: t('shared-comment-delete'),
            resolved: t('shared-comment-resolved'),
            confirmDelete: t('shared-comment-confirm-delete'),
            editPlaceholder: t('shared-comment-edit-placeholder'),
            replyPlaceholder: t('shared-comment-reply-placeholder')
          }}
          editorMessages={{
            cancel: t('shared-comment-cancel'),
            send: t('shared-comment-send'),
            sending: t('shared-comment-sending'),
            sendHint: t('shared-comment-send-hint')
          }}
          onClose={() => setShowComments(false)}
          currentUserId={userId}
          currentUserName={currentUserName || t('editor-user-fallback')}
          currentUserAvatar={currentUserAvatar}
          accessToken={accessToken}
          headerHeight={100}
          data-testid="spreadsheet-comment-panel"
        />
      )}
    </>
  )
}
