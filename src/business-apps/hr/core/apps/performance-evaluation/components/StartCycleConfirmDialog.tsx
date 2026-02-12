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
import type { PerformanceCycle } from '../types'

interface StartCycleConfirmDialogProps {
  open: boolean
  cycle: PerformanceCycle | null
  onConfirm: () => void
  onCancel: () => void
}

export const StartCycleConfirmDialog: React.FC<StartCycleConfirmDialogProps> = ({
  open,
  cycle,
  onConfirm,
  onCancel
}) => {
  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent data-testid="performance-evaluation-start-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start Performance Evaluation</AlertDialogTitle>
          <AlertDialogDescription>
            {cycle
              ? `Are you sure you want to start the performance evaluation for "${cycle.name}"? This will initiate the evaluation flow.`
              : 'Are you sure you want to start this performance evaluation?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="performance-evaluation-start-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid="performance-evaluation-start-confirm-button">
            Start Evaluation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
