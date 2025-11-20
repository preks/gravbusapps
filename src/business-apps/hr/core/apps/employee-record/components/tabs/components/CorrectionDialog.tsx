'use client'

import React from 'react'
import { Button, Dialog, DialogContent, DialogTitle, Input } from '@newwork/nw-design-system'

export interface CorrectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CorrectionDialog: React.FC<CorrectionDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} data-testid="time-correction-dialog">
      <DialogContent>
        <DialogTitle>Request Correction</DialogTitle>
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault()
            onOpenChange(false)
          }}
        >
          <div className="gba:space-y-3">
            <Input data-testid="time-correction-date-input" placeholder="Date (YYYY-MM-DD)" />
            <div className="gba:flex gba:gap-2">
              <Input data-testid="time-correction-start-input" placeholder="Start (HH:mm)" />
              <Input data-testid="time-correction-end-input" placeholder="End (HH:mm)" />
            </div>
            <Input data-testid="time-correction-reason-input" placeholder="Reason" />
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              data-testid="time-correction-cancel-button"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="time-correction-submit-button">
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CorrectionDialog
