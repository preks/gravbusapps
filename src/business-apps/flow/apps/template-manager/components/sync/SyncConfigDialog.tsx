/**
 * SyncConfigDialog Component
 * Dialog for configuring template sync options
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
  Checkbox
} from '@newwork/nw-design-system'
import { TemplateComparison } from '../../types/comparison'
import { SyncMode, SyncOptions } from '../../types/sync'

interface SyncConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  comparison: TemplateComparison | null
  onSync: (mode: SyncMode, options: SyncOptions) => void
}

export const SyncConfigDialog: React.FC<SyncConfigDialogProps> = ({ isOpen, onClose, comparison, onSync }) => {
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

  if (!comparison) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync Template: {comparison.name}</DialogTitle>
          <DialogDescription>
            Configure how this template should be synchronized to the target instance.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-6 gba:py-4">
          {/* Sync Mode */}
          <div className="gba:space-y-3">
            <Label>Sync Mode</Label>
            <RadioGroup value={syncMode} onValueChange={value => setSyncMode(value as SyncMode)}>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="create_version" id="create_version" />
                <Label htmlFor="create_version" className="gba:font-normal gba:cursor-pointer">
                  Create new version (Recommended)
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="overwrite" id="overwrite" />
                <Label htmlFor="overwrite" className="gba:font-normal gba:cursor-pointer gba:text-destructive">
                  Overwrite existing version (Dangerous)
                </Label>
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <RadioGroupItem value="draft" id="draft" />
                <Label htmlFor="draft" className="gba:font-normal gba:cursor-pointer">
                  Sync as draft
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="gba:space-y-3">
            <Label>Options</Label>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id="validateDeps"
                checked={validateDependencies}
                onCheckedChange={checked => setValidateDependencies(checked as boolean)}
              />
              <Label htmlFor="validateDeps" className="gba:font-normal gba:cursor-pointer">
                Validate dependencies
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox id="asDraft" checked={asDraft} onCheckedChange={checked => setAsDraft(checked as boolean)} />
              <Label htmlFor="asDraft" className="gba:font-normal gba:cursor-pointer">
                Sync as draft
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id="skipActive"
                checked={skipIfActiveWorkflows}
                onCheckedChange={checked => setSkipIfActiveWorkflows(checked as boolean)}
              />
              <Label htmlFor="skipActive" className="gba:font-normal gba:cursor-pointer">
                Skip if active workflows exist
              </Label>
            </div>

            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox id="dryRun" checked={dryRun} onCheckedChange={checked => setDryRun(checked as boolean)} />
              <Label htmlFor="dryRun" className="gba:font-normal gba:cursor-pointer">
                Dry run (validate only)
              </Label>
            </div>
          </div>

          {/* Warning for dangerous operations */}
          {syncMode === 'overwrite' && (
            <div className="gba:p-4 gba:bg-destructive-secondary gba:text-destructive-secondary-foreground gba:rounded-md gba:text-sm">
              <strong>Warning:</strong> Overwriting an existing version may affect active workflows and cannot be
              undone. Use with caution.
            </div>
          )}

          {/* Template info */}
          <div className="gba:p-4 gba:bg-muted gba:rounded-md gba:text-sm gba:space-y-1">
            <div className="gba:flex gba:justify-between">
              <span className="gba:text-muted-foreground">Source Version:</span>
              <span className="gba:font-medium">{comparison.source ? `v${comparison.source.version}` : 'N/A'}</span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span className="gba:text-muted-foreground">Target Version:</span>
              <span className="gba:font-medium">{comparison.target ? `v${comparison.target.version}` : 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSync}>{dryRun ? 'Validate' : 'Sync Now'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
