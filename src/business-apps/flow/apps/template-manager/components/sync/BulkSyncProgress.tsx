/**
 * BulkSyncProgress Component
 * Displays real-time progress for bulk sync operations
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Progress,
  Card,
  CardContent
} from '@newwork/nw-design-system'
import { SyncOperation } from '../../types/sync'
import { Check, X, Loader2, Clock, AlertCircle } from 'lucide-react'

interface BulkSyncProgressProps {
  isOpen: boolean
  onClose: () => void
  syncOperation: SyncOperation | null
  onRefreshComparison?: () => void
}

export const BulkSyncProgress: React.FC<BulkSyncProgressProps> = ({
  isOpen,
  onClose,
  syncOperation,
  onRefreshComparison
}) => {
  if (!syncOperation) return null

  const completedCount = syncOperation.templates.filter(
    t => t.status === 'success' || t.status === 'failed' || t.status === 'skipped'
  ).length

  const totalCount = syncOperation.templates.length
  const progressPercentage = (completedCount / totalCount) * 100

  const successCount = syncOperation.templates.filter(t => t.status === 'success').length
  const failedCount = syncOperation.templates.filter(t => t.status === 'failed').length
  const skippedCount = syncOperation.templates.filter(t => t.status === 'skipped').length
  const pendingCount = syncOperation.templates.filter(t => t.status === 'pending').length
  const syncingCount = syncOperation.templates.filter(t => t.status === 'syncing').length

  const canClose = syncOperation.status === 'completed' || syncOperation.status === 'failed'
  const isCompleted = syncOperation.status === 'completed'

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isCompleted ? 'Bulk Sync Complete' : 'Syncing Templates...'}</DialogTitle>
          <DialogDescription>
            {isCompleted
              ? `Synchronized ${successCount} of ${totalCount} templates successfully.`
              : `Syncing ${totalCount} templates. Please wait...`}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Overall Progress */}
          <div className="gba:space-y-3">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium">Overall Progress</span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {completedCount} / {totalCount} completed
              </span>
            </div>
            <Progress value={progressPercentage} className="gba:h-2" />
          </div>

          {/* Summary Cards */}
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-5 gba:gap-3">
            {syncingCount > 0 && (
              <Card className="gba:border-primary">
                <CardContent className="gba:p-4 gba:text-center">
                  <Loader2 className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-primary gba:animate-spin" />
                  <div className="gba:text-2xl gba:font-bold gba:text-primary">{syncingCount}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Syncing</div>
                </CardContent>
              </Card>
            )}

            {pendingCount > 0 && (
              <Card className="gba:border-muted">
                <CardContent className="gba:p-4 gba:text-center">
                  <Clock className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
                  <div className="gba:text-2xl gba:font-bold gba:text-muted-foreground">{pendingCount}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
            )}

            <Card className="gba:border-success">
              <CardContent className="gba:p-4 gba:text-center">
                <Check className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-success" />
                <div className="gba:text-2xl gba:font-bold gba:text-success">{successCount}</div>
                <div className="gba:text-xs gba:text-muted-foreground">Success</div>
              </CardContent>
            </Card>

            {failedCount > 0 && (
              <Card className="gba:border-destructive">
                <CardContent className="gba:p-4 gba:text-center">
                  <X className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-destructive" />
                  <div className="gba:text-2xl gba:font-bold gba:text-destructive">{failedCount}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
            )}

            {skippedCount > 0 && (
              <Card className="gba:border-warning">
                <CardContent className="gba:p-4 gba:text-center">
                  <AlertCircle className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-warning" />
                  <div className="gba:text-2xl gba:font-bold gba:text-warning">{skippedCount}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Skipped</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Template List */}
          <div className="gba:space-y-2 gba:max-h-96 gba:overflow-y-auto gba:pr-2">
            {syncOperation.templates.map(template => (
              <div
                key={template.templateId}
                className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:transition-colors"
                data-status={template.status}
              >
                {/* Status Icon */}
                <div className="gba:flex-shrink-0">
                  {template.status === 'success' && <Check className="gba:h-5 gba:w-5 gba:text-success" />}
                  {template.status === 'failed' && <X className="gba:h-5 gba:w-5 gba:text-destructive" />}
                  {template.status === 'syncing' && (
                    <Loader2 className="gba:h-5 gba:w-5 gba:text-primary gba:animate-spin" />
                  )}
                  {template.status === 'pending' && <Clock className="gba:h-5 gba:w-5 gba:text-muted-foreground" />}
                  {template.status === 'skipped' && <AlertCircle className="gba:h-5 gba:w-5 gba:text-warning" />}
                </div>

                {/* Template Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-medium gba:truncate">{template.name}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">
                    v{template.sourceVersion}
                    {template.targetVersion && ` → v${template.targetVersion}`}
                  </div>
                  {template.error && (
                    <div className="gba:text-sm gba:text-destructive gba:mt-1 gba:line-clamp-2">{template.error}</div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="gba:flex-shrink-0 gba:min-w-20 gba:text-right">
                  {template.status === 'success' && (
                    <span className="gba:text-sm gba:font-medium gba:text-success">Success</span>
                  )}
                  {template.status === 'failed' && (
                    <span className="gba:text-sm gba:font-medium gba:text-destructive">Failed</span>
                  )}
                  {template.status === 'syncing' && (
                    <span className="gba:text-sm gba:font-medium gba:text-primary">Syncing...</span>
                  )}
                  {template.status === 'pending' && (
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Pending</span>
                  )}
                  {template.status === 'skipped' && (
                    <span className="gba:text-sm gba:font-medium gba:text-warning">Skipped</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Statistics */}
          {isCompleted && (
            <Card className="gba:bg-muted">
              <CardContent className="gba:p-4">
                <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4 gba:text-sm">
                  <div>
                    <div className="gba:text-muted-foreground">Total</div>
                    <div className="gba:text-lg gba:font-semibold">{totalCount}</div>
                  </div>
                  <div>
                    <div className="gba:text-muted-foreground">Successful</div>
                    <div className="gba:text-lg gba:font-semibold gba:text-success">{successCount}</div>
                  </div>
                  <div>
                    <div className="gba:text-muted-foreground">Failed</div>
                    <div className="gba:text-lg gba:font-semibold gba:text-destructive">{failedCount}</div>
                  </div>
                  <div>
                    <div className="gba:text-muted-foreground">Skipped</div>
                    <div className="gba:text-lg gba:font-semibold gba:text-warning">{skippedCount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gba:flex gba:gap-2">
          {isCompleted && onRefreshComparison && (
            <Button onClick={onRefreshComparison} variant="outline">
              Refresh Comparison
            </Button>
          )}
          <Button onClick={onClose} disabled={!canClose} variant={isCompleted ? 'default' : 'outline'}>
            {canClose ? 'Close' : 'Syncing...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
