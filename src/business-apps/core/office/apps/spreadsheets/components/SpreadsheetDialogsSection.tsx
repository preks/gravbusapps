/**
 * SpreadsheetDialogsSection Component
 *
 * Contains all dialogs used in the spreadsheet viewer.
 */

import React, { memo } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, useTranslation } from '@newwork/nw-design-system'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetColumn } from '../types'
import { ManageColumnsDialog } from './ManageColumnsDialog'
import { VersionHistory, type VersionUserDisplay } from '../../../../../platform/apps/shared/components/VersionHistory'
import translations from '../_i18n'
import { CheckpointDialog } from '../../../../../platform/apps/shared/components/CheckpointDialog'
import { PublishDialog } from '../../../../../platform/apps/shared/components/PublishDialog'

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
  versionUserDisplayMap?: Record<string, VersionUserDisplay>
  versioning: {
    versions: unknown[]
    isLoading: boolean
    currentVersion?: { version: number }
    isSaving: boolean
    createCheckpoint: (description: string) => Promise<unknown>
  }
  handleRestoreVersion: (versionNumber: number) => Promise<boolean>

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
    versionUserDisplayMap,
    versioning,
    handleRestoreVersion,
    showCheckpointDialog,
    setShowCheckpointDialog,
    showPublishDialog,
    setShowPublishDialog,
    publishing,
    testId
  }) {
    const { t } = useTranslation(translations)

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
                onSubmit={handleUpdateRow}
                submitButtonText={t('edit-row-save')}
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
            onRestore={async versionNumber => {
              const restored = await handleRestoreVersion(versionNumber)
              if (!restored) {
                const restoreError = (versioning as { error?: string }).error
                toast.error(restoreError || t('shared-error-restore-version'))
              }
            }}
            onClose={() => setShowVersionHistory(false)}
            currentVersion={versioning.currentVersion?.version}
            showAutoSaves={false}
            userDisplayMap={versionUserDisplayMap}
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
            data-testid="spreadsheet-version-history"
          />
        )}

        {showCheckpointDialog && (
          <CheckpointDialog
            isOpen={showCheckpointDialog}
            onClose={() => setShowCheckpointDialog(false)}
            onSave={async description => {
              const checkpoint = await versioning.createCheckpoint(description)
              if (!checkpoint) {
                toast.error(t('toast-checkpoint-save-failed'))
                return false
              }
              return true
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
      </>
    )
  }
)
