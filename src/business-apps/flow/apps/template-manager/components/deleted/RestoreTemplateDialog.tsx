/**
 * RestoreTemplateDialog Component
 * Confirmation dialog for restoring soft-deleted templates
 */

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { DeletedTemplateWithName } from '../../hooks/useDeletedTemplates'
import { RotateCcw, Info } from 'lucide-react'

interface RestoreTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  template: DeletedTemplateWithName | null
  onConfirm: () => void
  isRestoring: boolean
}

export const RestoreTemplateDialog: React.FC<RestoreTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
  onConfirm,
  isRestoring
}) => {
  if (!template) return null

  // Format date as dd.mm.yyyy HH:mm
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="gba:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="gba:flex gba:items-center gba:gap-2">
            <RotateCcw className="gba:h-5 gba:w-5 gba:text-primary" />
            Restore Template
          </AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to restore "{template.name}"?</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="gba:space-y-3 gba:py-4">
          <div className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
            <Info className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:space-y-1">
              <p className="gba:text-muted-foreground">
                <strong>Template ID:</strong> {template.templateId}
              </p>
              <p className="gba:text-muted-foreground">
                <strong>Version:</strong> {template.version}
              </p>
              <p className="gba:text-muted-foreground">
                <strong>Deleted:</strong> {formatDate(template.deletedAt)}
              </p>
              <p className="gba:text-muted-foreground">
                <strong>Deleted by:</strong> {template.deletedByName}
              </p>
              <p className="gba:text-muted-foreground">
                <strong>Reason:</strong> {template.deletionReason}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isRestoring} data-testid="confirm-restore-button">
            {isRestoring ? 'Restoring...' : 'Restore Template'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
