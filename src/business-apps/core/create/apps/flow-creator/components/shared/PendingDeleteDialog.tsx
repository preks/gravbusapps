import React, { useMemo } from 'react'
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
import { AlertTriangle } from 'lucide-react'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'

interface PendingDeleteDialogProps {
  'data-testid'?: string
}

export const PendingDeleteDialog: React.FC<PendingDeleteDialogProps> = ({
  'data-testid': testId = 'flow-studio-pending-delete'
}) => {
  const pendingDelete = useFlowStudioStore(s => s.pendingDelete)
  const confirmPendingDelete = useFlowStudioStore(s => s.confirmPendingDelete)
  const cancelPendingDelete = useFlowStudioStore(s => s.cancelPendingDelete)

  const copy = useMemo(() => {
    if (!pendingDelete) return null
    if (pendingDelete.kind === 'node') {
      return {
        title: 'Remove step',
        message: `Are you sure you want to remove the step "${pendingDelete.label}"? This will also remove its connections.`,
        confirm: 'Remove'
      }
    }
    const branchCount = pendingDelete.edgeIds?.length ?? 1
    const stepCount = pendingDelete.affectedNodeIds?.length ?? 0
    const stepCopy = stepCount === 1 ? 'step' : 'steps'
    const branchCopy = branchCount === 1 ? 'branch' : 'branches'
    return {
      title: branchCount > 1 ? 'Remove branches' : 'Remove branch',
      message:
        stepCount > 0
          ? `Removing this ${branchCopy} will also remove ${stepCount} ${stepCopy} on that path. Continue?`
          : `Are you sure you want to remove this ${branchCopy} ${pendingDelete.label ? `(${pendingDelete.label})` : ''}?`,
      confirm: 'Remove'
    }
  }, [pendingDelete])

  return (
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => !open && cancelPendingDelete()}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-full gba:bg-destructive-secondary">
              <AlertTriangle className="gba:w-5 gba:h-5 gba:text-destructive-secondary-foreground" />
            </div>
            <AlertDialogTitle data-testid={`${testId}-title`}>{copy?.title ?? 'Remove'}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription data-testid={`${testId}-message`} className="gba:text-sm gba:text-muted-foreground">
          {copy?.message ?? ''}
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelPendingDelete} data-testid={`${testId}-cancel`}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmPendingDelete}
            className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive"
            data-testid={`${testId}-confirm`}
          >
            {copy?.confirm ?? 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
