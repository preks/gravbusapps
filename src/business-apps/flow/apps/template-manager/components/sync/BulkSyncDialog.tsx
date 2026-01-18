/**
 * BulkSyncDialog Component
 * Dialog for configuring bulk template sync options
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Label,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { TemplateComparison } from '../../types/comparison'
import { SyncMode, SyncOptions } from '../../types/sync'
import { AlertTriangle, Info } from 'lucide-react'

interface BulkSyncDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedComparisons: TemplateComparison[]
  onSync: (mode: SyncMode, options: SyncOptions) => void
}

export const BulkSyncDialog: React.FC<BulkSyncDialogProps> = ({ isOpen, onClose, selectedComparisons, onSync }) => {
  const [syncMode, setSyncMode] = useState<SyncMode>('create_version')
  const [validateDependencies, setValidateDependencies] = useState(false)
  const [asDraft, setAsDraft] = useState(false)
  const [skipIfActiveWorkflows, setSkipIfActiveWorkflows] = useState(true)
  const [dryRun, setDryRun] = useState(false)

  const handleSync = () => {
    const options: SyncOptions = {
      validateDependencies,
      asDraft,
      skipIfActiveWorkflows,
      dryRun
    }
    onSync(syncMode, options)
  }

  const templateCount = selectedComparisons.length
  const hasNewTemplates = selectedComparisons.some(c => c.status === 'NEW_IN_SOURCE')
  const hasUpdates = selectedComparisons.some(
    c => c.status === 'SOURCE_AHEAD' || c.status === 'VERSION_DRIFT' || c.status === 'CONTENT_DRIFT'
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Sync: {templateCount} Templates</DialogTitle>
          <DialogDescription>
            Configure sync options for all selected templates. Each template will be synced individually with these
            settings.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Summary */}
          <Alert>
            <Info className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <div className="gba:space-y-1">
                <div>
                  <strong>Total templates:</strong> {templateCount}
                </div>
                {hasNewTemplates && (
                  <div>
                    <strong>New templates:</strong>{' '}
                    {selectedComparisons.filter(c => c.status === 'NEW_IN_SOURCE').length}
                  </div>
                )}
                {hasUpdates && (
                  <div>
                    <strong>Updates:</strong>{' '}
                    {
                      selectedComparisons.filter(
                        c => c.status === 'SOURCE_AHEAD' || c.status === 'VERSION_DRIFT' || c.status === 'CONTENT_DRIFT'
                      ).length
                    }
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Sync Mode */}
          <div className="gba:space-y-3">
            <Label>Sync Mode</Label>
            <RadioGroup value={syncMode} onValueChange={value => setSyncMode(value as SyncMode)}>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="create_version" id="bulk_create_version" />
                <Label htmlFor="bulk_create_version" className="gba:font-normal gba:cursor-pointer">
                  Create new version (Recommended for bulk sync)
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="overwrite" id="bulk_overwrite" />
                <Label htmlFor="bulk_overwrite" className="gba:font-normal gba:cursor-pointer gba:text-destructive">
                  Overwrite existing version (Dangerous - use with caution)
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="draft" id="bulk_draft" />
                <Label htmlFor="bulk_draft" className="gba:font-normal gba:cursor-pointer">
                  Sync as draft (Requires manual publishing)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="gba:space-y-3">
            <Label>Sync Options</Label>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id="bulk_skipIfActiveWorkflows"
                checked={skipIfActiveWorkflows}
                onCheckedChange={checked => setSkipIfActiveWorkflows(!!checked)}
              />
              <Label htmlFor="bulk_skipIfActiveWorkflows" className="gba:font-normal gba:cursor-pointer">
                Skip templates with active workflows (Recommended)
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox id="bulk_asDraft" checked={asDraft} onCheckedChange={checked => setAsDraft(!!checked)} />
              <Label htmlFor="bulk_asDraft" className="gba:font-normal gba:cursor-pointer">
                Mark all as draft
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id="bulk_validateDependencies"
                checked={validateDependencies}
                onCheckedChange={checked => setValidateDependencies(!!checked)}
              />
              <Label htmlFor="bulk_validateDependencies" className="gba:font-normal gba:cursor-pointer">
                Validate dependencies (Phase 3 feature)
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox id="bulk_dryRun" checked={dryRun} onCheckedChange={checked => setDryRun(!!checked)} />
              <Label htmlFor="bulk_dryRun" className="gba:font-normal gba:cursor-pointer">
                Dry run (Test without making changes)
              </Label>
            </div>
          </div>

          {/* Warning for overwrite mode */}
          {syncMode === 'overwrite' && (
            <Alert variant="destructive">
              <AlertTriangle className="gba:h-4 gba:w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Overwrite mode will replace existing versions in the target instance. This may
                affect active workflows. Consider using "Create new version" instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Dry run info */}
          {dryRun && (
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription>
                Dry run mode will validate the sync without making any changes to the target instance.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSync}>{dryRun ? 'Test Sync' : `Sync ${templateCount} Templates`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
