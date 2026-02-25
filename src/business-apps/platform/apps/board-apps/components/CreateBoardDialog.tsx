/**
 * CreateBoardDialog - dialog for creating a new board.
 * Extracted from BoardsHub for the 300-line file limit.
 */

import React from 'react'
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@newwork/nw-design-system'

export interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (name: string) => void
  onSubmit: () => void
  'data-testid'?: string
}

export const CreateBoardDialog: React.FC<CreateBoardDialogProps> = ({
  open,
  onOpenChange,
  name,
  onNameChange,
  onSubmit,
  'data-testid': testId = 'create-board-dialog'
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="gba:py-3">
          <Label htmlFor="board-name">Name</Label>
          <Input
            id="board-name"
            placeholder="My Board"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && name.trim()) onSubmit()
            }}
            data-testid={`${testId}-name`}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={!name.trim()} data-testid={`${testId}-submit`}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
