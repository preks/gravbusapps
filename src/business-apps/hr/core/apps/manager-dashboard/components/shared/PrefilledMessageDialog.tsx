import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
  Textarea
} from '@newwork/nw-design-system'

interface PrefilledMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  recipientName: string
  defaultMessage: string
  confirmLabel?: string
  sending?: boolean
  onConfirm: (message: string) => Promise<void> | void
}

export const PrefilledMessageDialog: React.FC<PrefilledMessageDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  recipientName,
  defaultMessage,
  confirmLabel = 'Send message',
  sending = false,
  onConfirm
}) => {
  const [message, setMessage] = useState(defaultMessage)

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage)
    }
  }, [defaultMessage, open])

  const trimmed = message.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-2">
          <Label htmlFor="manager-dashboard-prefilled-message">
            Message to <span className="gba:font-medium">{recipientName}</span>
          </Label>
          <Textarea
            id="manager-dashboard-prefilled-message"
            value={message}
            onChange={event => setMessage(event.target.value)}
            rows={5}
            maxLength={1200}
            data-testid="manager-dashboard-prefilled-message-input"
          />
          <p className="gba:text-xs gba:text-muted-foreground">{trimmed.length}/1200</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void onConfirm(trimmed)
            }}
            disabled={sending || trimmed.length === 0}
          >
            {sending ? (
              <>
                <Spinner className="gba:mr-2 gba:h-4 gba:w-4" />
                Sending...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
