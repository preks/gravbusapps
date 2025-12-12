/**
 * SyncHistoryDetailsModal Component
 * Shows detailed information about a specific sync operation
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
  Badge,
  ScrollArea,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { SyncOperation } from '../../types/sync'
import { Check, X, Clock, AlertCircle, ArrowRight } from 'lucide-react'

interface SyncHistoryDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  syncOperation: SyncOperation | null
}

export const SyncHistoryDetailsModal: React.FC<SyncHistoryDetailsModalProps> = ({ isOpen, onClose, syncOperation }) => {
  if (!syncOperation) return null

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d)
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const successful = syncOperation.results?.filter(r => r.success).length || 0
  const failed = syncOperation.results?.filter(r => !r.success).length || 0

  const totalDuration = syncOperation.results?.reduce((sum, r) => sum + r.duration, 0) || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-4xl gba:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sync Operation Details</DialogTitle>
          <DialogDescription>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
              <span>{formatDate(syncOperation.timestamp)}</span>
              <Badge variant={syncOperation.status === 'completed' ? 'success' : 'destructive'}>
                {syncOperation.status}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="gba:max-h-[60vh] gba:pr-4">
          <div className="gba:space-y-6">
            {/* Sync Information */}
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-base">Sync Information</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div>
                    <div className="gba:text-sm gba:text-muted-foreground">Source Instance</div>
                    <div className="gba:font-medium gba:flex gba:items-center gba:gap-2">
                      {syncOperation.sourceInstance.icon} {syncOperation.sourceInstance.name}
                      <Badge variant="outline">{syncOperation.sourceInstance.environment}</Badge>
                    </div>
                  </div>
                  <div>
                    <div className="gba:text-sm gba:text-muted-foreground">Target Instance</div>
                    <div className="gba:font-medium gba:flex gba:items-center gba:gap-2">
                      {syncOperation.targetInstance.icon} {syncOperation.targetInstance.name}
                      <Badge variant="outline">{syncOperation.targetInstance.environment}</Badge>
                    </div>
                  </div>
                </div>

                <div className="gba:border-t gba:pt-3">
                  <div className="gba:text-sm gba:text-muted-foreground gba:mb-2">Sync Options</div>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {syncOperation.options.asDraft && <Badge variant="secondary">Synced as Draft</Badge>}
                    {syncOperation.options.skipIfActiveWorkflows && (
                      <Badge variant="secondary">Skip if Active Workflows</Badge>
                    )}
                    {syncOperation.options.validateDependencies && (
                      <Badge variant="secondary">Validate Dependencies</Badge>
                    )}
                    {syncOperation.options.dryRun && <Badge variant="warning">Dry Run</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            <div className="gba:grid gba:grid-cols-4 gba:gap-4">
              <Card>
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold">{syncOperation.templates.length}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">Total</div>
                </CardContent>
              </Card>
              <Card className="gba:border-success">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-success">{successful}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card className="gba:border-destructive">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-destructive">{failed}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold">{formatDuration(totalDuration)}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">Total Duration</div>
                </CardContent>
              </Card>
            </div>

            {/* Template Results */}
            <Card>
              <CardHeader>
                <CardTitle className="gba:text-base">Template Sync Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-2">
                  {syncOperation.templates.map(template => {
                    const result = syncOperation.results?.find(r => r.templateId === template.templateId)
                    const isSuccess = template.status === 'success'
                    const isFailed = template.status === 'failed'
                    const isSkipped = template.status === 'skipped'

                    return (
                      <div
                        key={template.templateId}
                        className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
                      >
                        {/* Status Icon */}
                        <div className="gba:flex-shrink-0 gba:mt-0.5">
                          {isSuccess && <Check className="gba:h-5 gba:w-5 gba:text-success" />}
                          {isFailed && <X className="gba:h-5 gba:w-5 gba:text-destructive" />}
                          {isSkipped && <Clock className="gba:h-5 gba:w-5 gba:text-muted-foreground" />}
                          {!isSuccess && !isFailed && !isSkipped && (
                            <AlertCircle className="gba:h-5 gba:w-5 gba:text-warning" />
                          )}
                        </div>

                        {/* Template Info */}
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:font-medium gba:truncate">{template.name}</div>
                          <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                            <span>v{template.sourceVersion}</span>
                            <ArrowRight className="gba:h-3 gba:w-3" />
                            <span>v{result?.newVersion || template.targetVersion || 'N/A'}</span>
                            {result && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(result.duration)}</span>
                              </>
                            )}
                          </div>
                          {result?.message && (
                            <div
                              className={`gba:text-sm gba:mt-1 ${
                                isSuccess
                                  ? 'gba:text-success'
                                  : isFailed
                                    ? 'gba:text-destructive'
                                    : 'gba:text-muted-foreground'
                              }`}
                            >
                              {result.message}
                            </div>
                          )}
                          {template.error && (
                            <div className="gba:text-sm gba:text-destructive gba:mt-1">Error: {template.error}</div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="gba:flex-shrink-0">
                          {isSuccess && <Badge variant="success">Success</Badge>}
                          {isFailed && <Badge variant="destructive">Failed</Badge>}
                          {isSkipped && <Badge variant="secondary">Skipped</Badge>}
                          {result?.action && (
                            <Badge variant="outline" className="gba:ml-2">
                              {result.action}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
