import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'

interface DeleteEntityDialogProps {
  open: boolean
  entityName: string
  namespace: string
  isDeleting: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  'data-testid'?: string
}

export const DeleteEntityDialog: React.FC<DeleteEntityDialogProps> = ({
  open,
  entityName,
  namespace,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
  'data-testid': testId = 'delete-entity-dialog'
}) => (
  <AlertDialog open={open} onOpenChange={openState => !isDeleting && onOpenChange(openState)}>
    <AlertDialogContent data-testid={testId}>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete entity</AlertDialogTitle>
        <AlertDialogDescription>
          Delete {entityName} from namespace {namespace}. This removes its custom data definition and deployed table
          when promoted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive" data-testid={`${testId}-error`}>
          <AlertDescription className="gba:text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting} data-testid={`${testId}-cancel`}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={isDeleting}
          onClick={event => {
            event.preventDefault()
            onConfirm()
          }}
          className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive"
          data-testid={`${testId}-confirm`}
        >
          {isDeleting && <Spinner size="sm" className="gba:mr-1" />}
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
