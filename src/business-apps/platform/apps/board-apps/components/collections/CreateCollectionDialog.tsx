import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label
} from '@newwork/nw-design-system'
import { FolderPlus } from 'lucide-react'

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' }
]

const ICON_OPTIONS = ['📋', '🎯', '🚀', '💼', '📊', '🏗️', '🎨', '📦', '⚡', '🔬', '🌐', '📱']

export interface CreateCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; description?: string; icon?: string; color?: string }) => void
  isSubmitting?: boolean
  'data-testid'?: string
}

export const CreateCollectionDialog: React.FC<CreateCollectionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  'data-testid': testId = 'create-collection-dialog'
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setSelectedColor(null)
      setSelectedIcon(null)
    }
  }, [open])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon || undefined,
      color: selectedColor || undefined
    })
  }, [name, description, selectedIcon, selectedColor, onSubmit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FolderPlus className="gba:w-5 gba:h-5 gba:text-primary" />
            New Collection
          </DialogTitle>
          <DialogDescription>
            Group related boards together. Share the collection to give people access to all boards inside.
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              placeholder="e.g. Marketing, Engineering, Q1 Planning..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) handleSubmit()
              }}
              autoFocus
              data-testid={`${testId}-name`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="collection-desc">Description (optional)</Label>
            <Textarea
              id="collection-desc"
              placeholder="What is this collection for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="gba:resize-none"
              rows={2}
              data-testid={`${testId}-desc`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label>Icon (optional)</Label>
            <div className="gba:flex gba:flex-wrap gba:gap-1.5">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon}
                  className={`gba:w-8 gba:h-8 gba:rounded-md gba:flex gba:items-center gba:justify-center gba:text-base gba:transition-all ${
                    selectedIcon === icon
                      ? 'gba:bg-primary/20 gba:ring-2 gba:ring-primary gba:scale-110'
                      : 'gba:bg-muted/50 gba:hover:bg-muted gba:hover:scale-105'
                  }`}
                  onClick={() => setSelectedIcon(selectedIcon === icon ? null : icon)}
                  type="button"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>Color (optional)</Label>
            <div className="gba:flex gba:flex-wrap gba:gap-1.5">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color.value}
                  className={`gba:w-7 gba:h-7 gba:rounded-full gba:transition-all ${
                    selectedColor === color.value
                      ? 'gba:ring-2 gba:ring-offset-2 gba:ring-primary gba:scale-110'
                      : 'gba:hover:scale-110'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(selectedColor === color.value ? null : color.value)}
                  title={color.label}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting} data-testid={`${testId}-submit`}>
            <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
            Create Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
