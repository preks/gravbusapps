import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea
} from '@newwork/nw-design-system'

interface DecisionReasonDialogProps {
  open: boolean
  title: string
  description: string
  label: string
  placeholder: string
  confirmLabel: string
  cancelLabel: string
  reason: string
  errorText?: string
  isSubmitting: boolean
  dataTestIdPrefix: string
  onReasonChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export const DecisionReasonDialog: React.FC<DecisionReasonDialogProps> = ({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  reason,
  errorText,
  isSubmitting,
  dataTestIdPrefix,
  onReasonChange,
  onOpenChange,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={`${dataTestIdPrefix}-dialog`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-2">
          <Label htmlFor={`${dataTestIdPrefix}-reason`} data-testid={`${dataTestIdPrefix}-reason-label`}>
            {label}
          </Label>
          <Textarea
            id={`${dataTestIdPrefix}-reason`}
            value={reason}
            onChange={event => onReasonChange(event.target.value)}
            placeholder={placeholder}
            className="gba:min-h-24"
            data-testid={`${dataTestIdPrefix}-reason-input`}
          />
          {errorText && (
            <p className="gba:text-sm gba:text-destructive" data-testid={`${dataTestIdPrefix}-reason-error`}>
              {errorText}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid={`${dataTestIdPrefix}-cancel-button`}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            data-testid={`${dataTestIdPrefix}-confirm-button`}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
