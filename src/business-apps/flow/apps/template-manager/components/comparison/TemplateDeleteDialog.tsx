/**
 * TemplateDeleteDialog Component
 * Confirmation dialog for deleting templates from instances
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  RadioGroup,
  RadioGroupItem,
  Label,
  Textarea
} from '@newwork/nw-design-system'
import { TemplateComparison } from '../../types/comparison'
import { FlowEngineInstance } from '../../types/instance'
import { Trash2, AlertTriangle } from 'lucide-react'

interface TemplateDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  comparison: TemplateComparison
  sourceInstance: FlowEngineInstance
  targetInstance: FlowEngineInstance
  onDelete: (templateId: string, deleteFrom: 'source' | 'target' | 'both', reason: string) => Promise<void>
}

export const TemplateDeleteDialog: React.FC<TemplateDeleteDialogProps> = ({
  isOpen,
  onClose,
  comparison,
  sourceInstance,
  targetInstance,
  onDelete
}) => {
  const [deleteFrom, setDeleteFrom] = useState<'source' | 'target' | 'both'>('source')
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const hasSource = comparison.source !== null
  const hasTarget = comparison.target !== null
  const hasBoth = hasSource && hasTarget

  // Auto-select the only available option
  React.useEffect(() => {
    if (!hasBoth) {
      if (hasSource && !hasTarget) {
        setDeleteFrom('source')
      } else if (hasTarget && !hasSource) {
        setDeleteFrom('target')
      }
    }
  }, [hasSource, hasTarget, hasBoth])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(comparison.templateId, deleteFrom, reason)
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Trash2 className="gba:h-5 gba:w-5 gba:text-destructive" />
            Delete Template
          </DialogTitle>
          <DialogDescription>
            You are about to delete "{comparison.name}" (ID: {comparison.templateId})
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="gba:h-4 gba:w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. The template will be permanently deleted from the
              selected instance(s).
            </AlertDescription>
          </Alert>

          {/* Delete Location Selection */}
          <div className="gba:space-y-3">
            <Label className="gba:text-base gba:font-semibold">Delete from:</Label>
            <RadioGroup value={deleteFrom} onValueChange={value => setDeleteFrom(value as typeof deleteFrom)}>
              {/* Source Option */}
              {hasSource && (
                <div className="gba:flex gba:items-start gba:space-x-2 gba:p-3 gba:border gba:rounded-md">
                  <RadioGroupItem value="source" id="delete-source" />
                  <div className="gba:flex-1">
                    <Label htmlFor="delete-source" className="gba:cursor-pointer gba:font-medium">
                      {sourceInstance.icon} {sourceInstance.name}
                    </Label>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                      Version: {comparison.source?.version}
                      {comparison.source?.isDraft && ' (Draft)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Target Option */}
              {hasTarget && (
                <div className="gba:flex gba:items-start gba:space-x-2 gba:p-3 gba:border gba:rounded-md">
                  <RadioGroupItem value="target" id="delete-target" />
                  <div className="gba:flex-1">
                    <Label htmlFor="delete-target" className="gba:cursor-pointer gba:font-medium">
                      {targetInstance.icon} {targetInstance.name}
                    </Label>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                      Version: {comparison.target?.version}
                      {comparison.target?.isDraft && ' (Draft)'}
                    </p>
                  </div>
                </div>
              )}

              {/* Both Option (only if template exists in both) */}
              {hasBoth && (
                <div className="gba:flex gba:items-start gba:space-x-2 gba:p-3 gba:border gba:rounded-md gba:border-destructive">
                  <RadioGroupItem value="both" id="delete-both" />
                  <div className="gba:flex-1">
                    <Label htmlFor="delete-both" className="gba:cursor-pointer gba:font-medium gba:text-destructive">
                      Both Instances
                    </Label>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                      Delete from {sourceInstance.name} and {targetInstance.name}
                    </p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Reason Input */}
          <div className="gba:space-y-2">
            <Label htmlFor="delete-reason" className="gba:text-base gba:font-semibold">
              Reason for deletion <span className="gba:text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="e.g., Template is obsolete and replaced by v2"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="gba:resize-none"
              data-testid="template-delete-reason-input"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              Please provide a reason for deleting this template for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !reason.trim()}>
            {isDeleting ? 'Deleting...' : 'Delete Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
