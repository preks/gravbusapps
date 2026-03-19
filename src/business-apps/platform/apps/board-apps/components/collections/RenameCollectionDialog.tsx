import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input
} from '@newwork/nw-design-system'
import { Pencil } from 'lucide-react'

export interface RenameCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onSubmit: (name: string) => void
  title?: string
  placeholder?: string
  'data-testid'?: string
}

export const RenameCollectionDialog: React.FC<RenameCollectionDialogProps> = ({
  open,
  onOpenChange,
  currentName,
  onSubmit,
  title = 'Rename Collection',
  placeholder = 'Name',
  'data-testid': testId = 'rename-collection-dialog'
}) => {
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(currentName)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [open, currentName])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed && trimmed !== currentName) {
      onSubmit(trimmed)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
              <Pencil className="gba:w-4 gba:h-4 gba:text-primary" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:py-4">
            <Input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={placeholder}
              autoFocus
              data-testid={`${testId}-input`}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid={`${testId}-cancel`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || name.trim() === currentName}
              data-testid={`${testId}-submit`}
            >
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
