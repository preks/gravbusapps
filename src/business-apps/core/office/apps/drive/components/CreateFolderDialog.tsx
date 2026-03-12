import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input
} from '@newwork/nw-design-system'
import { Folder } from 'lucide-react'

export interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => Promise<void>
  t: (key: string) => string
  'data-testid'?: string
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  t,
  'data-testid': testId = 'drive-create-folder'
}) => {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (open) setName('')
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isCreating) return
    setIsCreating(true)
    try {
      await onConfirm(name.trim())
      onOpenChange(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Folder className="gba:w-5 gba:h-5 gba:text-primary" />
            {t('create-folder-title')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('create-folder-placeholder')}
            autoFocus
            data-testid={`${testId}-input`}
          />
          <DialogFooter className="gba:mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating} data-testid={`${testId}-confirm`}>
              {t('create-folder-confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
