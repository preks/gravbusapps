/**
 * SyncProgressModal Component
 * Displays real-time sync progress
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Progress
} from '@newwork/nw-design-system'
import { SyncOperation } from '../../types/sync'
import { Check, X, Loader2 } from 'lucide-react'

interface SyncProgressModalProps {
  isOpen: boolean
  onClose: () => void
  syncOperation: SyncOperation | null
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({ isOpen, onClose, syncOperation }) => {
  if (!syncOperation) return null

  const completedCount = syncOperation.templates.filter(
    t => t.status === 'success' || t.status === 'failed' || t.status === 'skipped'
  ).length

  const totalCount = syncOperation.templates.length
  const progressPercentage = (completedCount / totalCount) * 100

  const canClose = syncOperation.status === 'completed' || syncOperation.status === 'failed'

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{syncOperation.status === 'completed' ? 'Sync Complete' : 'Syncing Templates...'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Progress Bar */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:text-sm">
              <span className="gba:text-muted-foreground">Progress</span>
              <span className="gba:font-medium">
                {completedCount} / {totalCount} templates
              </span>
            </div>
            <Progress value={progressPercentage} />
          </div>

          {/* Template List */}
          <div className="gba:space-y-2 gba:max-h-96 gba:overflow-y-auto">
            {syncOperation.templates.map(template => (
              <div
                key={template.templateId}
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
              >
                {/* Status Icon */}
                {template.status === 'success' && (
                  <Check className="gba:h-5 gba:w-5 gba:text-success gba:flex-shrink-0" />
                )}
                {template.status === 'failed' && (
                  <X className="gba:h-5 gba:w-5 gba:text-destructive gba:flex-shrink-0" />
                )}
                {template.status === 'syncing' && (
                  <Loader2 className="gba:h-5 gba:w-5 gba:text-primary gba:animate-spin gba:flex-shrink-0" />
                )}
                {template.status === 'pending' && (
                  <div className="gba:h-5 gba:w-5 gba:border-2 gba:border-muted gba:rounded-full gba:flex-shrink-0" />
                )}
                {template.status === 'skipped' && (
                  <div className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:flex-shrink-0">—</div>
                )}

                {/* Template Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-medium gba:truncate">{template.name}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    v{template.sourceVersion}
                    {template.targetVersion && ` → v${template.targetVersion}`}
                  </div>
                  {template.error && <div className="gba:text-sm gba:text-destructive gba:mt-1">{template.error}</div>}
                </div>

                {/* Status Badge */}
                <div className="gba:text-sm gba:font-medium gba:flex-shrink-0">
                  {template.status === 'success' && <span className="gba:text-success">Success</span>}
                  {template.status === 'failed' && <span className="gba:text-destructive">Failed</span>}
                  {template.status === 'syncing' && <span className="gba:text-primary">Syncing...</span>}
                  {template.status === 'pending' && <span className="gba:text-muted-foreground">Pending</span>}
                  {template.status === 'skipped' && <span className="gba:text-muted-foreground">Skipped</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {syncOperation.status === 'completed' && syncOperation.results && (
            <div className="gba:p-4 gba:bg-muted gba:rounded-md gba:text-sm">
              <div className="gba:font-medium gba:mb-2">Summary</div>
              <div className="gba:space-y-1">
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">Successful:</span>
                  <span className="gba:text-success gba:font-medium">
                    {syncOperation.results.filter(r => r.success).length}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between">
                  <span className="gba:text-muted-foreground">Failed:</span>
                  <span className="gba:text-destructive gba:font-medium">
                    {syncOperation.results.filter(r => !r.success).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} disabled={!canClose}>
            {canClose ? 'Close' : 'Syncing...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
