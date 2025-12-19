/**
 * InstanceDeleteDialog Component
 * Confirmation dialog for deleting a flow engine instance
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
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { FlowEngineInstance } from '../../types/instance'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface InstanceDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  instance: FlowEngineInstance | null
  isDeleting: boolean
}

export const InstanceDeleteDialog: React.FC<InstanceDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  instance,
  isDeleting
}) => {
  if (!instance) return null

  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <AlertTriangle className="gba:h-5 gba:w-5 gba:text-destructive" />
            Delete Instance?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <Alert variant="destructive">
            <AlertDescription>
              <div className="gba:space-y-2">
                <p className="gba:font-medium">Are you sure you want to delete "{instance.name}"?</p>
                <div className="gba:text-sm gba:space-y-1">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xl">{instance.icon}</span>
                    <div>
                      <div>{instance.name}</div>
                      <div className="gba:text-xs gba:opacity-80">{instance.baseUrl}</div>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="gba:text-sm gba:text-muted-foreground gba:space-y-2">
            <p>After deletion:</p>
            <ul className="gba:list-disc gba:list-inside gba:space-y-1 gba:ml-2">
              <li>This instance will be removed from all selectors</li>
              <li>Any comparisons using this instance will fail</li>
              <li>Sync operations targeting this instance will not work</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            data-testid="instance-delete-confirm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Instance'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
