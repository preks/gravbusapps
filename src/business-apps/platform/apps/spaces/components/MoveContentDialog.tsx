/**
 * MoveContentDialog - Dialog for moving content into a space
 *
 * Allows selecting content type and target space
 */

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label
} from '@newwork/nw-design-system'
import { FolderInput, FileText, Table2, StickyNote, AlertCircle } from 'lucide-react'
import type { MoveContentInput } from '../types/space.types'

export interface MoveContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (input: MoveContentInput) => Promise<void>
  spaceId: string
  availableSpaces?: { id: string; name: string }[]
  'data-testid'?: string
}

type ContentType = 'note' | 'document' | 'spreadsheet'

const contentTypes: { type: ContentType; icon: typeof FileText; label: string; color: string }[] = [
  { type: 'document', icon: FileText, label: 'Document', color: 'gba:text-blue-600' },
  { type: 'spreadsheet', icon: Table2, label: 'Spreadsheet', color: 'gba:text-emerald-600' },
  { type: 'note', icon: StickyNote, label: 'Note', color: 'gba:text-amber-600' }
]

export const MoveContentDialog: React.FC<MoveContentDialogProps> = ({
  open,
  onOpenChange,
  onMove,
  spaceId,
  'data-testid': testId = 'move-content-dialog'
}) => {
  const [contentType, setContentType] = useState<ContentType>('document')
  const [entityId, setEntityId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = useCallback(() => {
    setContentType('document')
    setEntityId('')
  }, [])

  const handleMove = useCallback(async () => {
    if (!entityId.trim()) return

    setIsLoading(true)
    try {
      await onMove({
        contentType,
        entityId: entityId.trim(),
        targetSpaceId: spaceId
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }, [contentType, entityId, spaceId, onMove, resetForm, onOpenChange])

  const selectedType = contentTypes.find(t => t.type === contentType) || contentTypes[0]
  const SelectedIcon = selectedType.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <div className="gba:relative gba:h-24 gba:bg-muted/30 gba:overflow-hidden">
          <DialogHeader className="gba:absolute gba:bottom-4 gba:left-6 gba:right-6">
            <DialogTitle className="gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <FolderInput className="gba:w-5 gba:h-5 gba:text-primary" />
              Move Content
            </DialogTitle>
            <DialogDescription className="gba:text-muted-foreground">
              Add existing content to this space
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Content */}
        <div className="gba:p-6 gba:space-y-6">
          {/* Content Type Selection */}
          <div className="gba:space-y-3">
            <Label className="gba:text-sm gba:font-medium">Content Type</Label>
            <div className="gba:flex gba:gap-2 gba:p-1 gba:bg-muted/30 gba:rounded-xl">
              {contentTypes.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => setContentType(type)}
                  className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-2.5 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all ${
                    contentType === type
                      ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                      : 'gba:text-muted-foreground hover:gba:text-foreground'
                  }`}
                  data-testid={`${testId}-type-${type}`}
                >
                  <Icon className={`gba:w-4 gba:h-4 ${contentType === type ? color : ''}`} />
                  <span className="gba:hidden gba:sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Entity ID Input */}
          <div className="gba:space-y-2">
            <Label htmlFor="entity-id" className="gba:text-sm gba:font-medium">
              {selectedType.label} ID
            </Label>
            <div className="gba:relative">
              <div
                className={`gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-8 gba:h-8 gba:rounded-lg ${selectedType.bg} gba:flex gba:items-center gba:justify-center`}
              >
                <SelectedIcon className={`gba:w-4 gba:h-4 ${selectedType.color}`} />
              </div>
              <Input
                id="entity-id"
                placeholder={`Enter ${selectedType.label.toLowerCase()} ID`}
                value={entityId}
                onChange={e => setEntityId(e.target.value)}
                className="gba:h-11 gba:pl-14"
                data-testid={`${testId}-entity-input`}
              />
            </div>
          </div>

          {/* Info Note */}
          <div className="gba:flex gba:gap-3 gba:p-4 gba:rounded-xl gba:bg-info-secondary gba:border gba:border-info/20">
            <AlertCircle className="gba:w-5 gba:h-5 gba:text-info gba:flex-shrink-0 gba:mt-0.5" />
            <div className="gba:text-sm">
              <p className="gba:text-info-secondary-foreground gba:font-medium">Moving content</p>
              <p className="gba:text-info-secondary-foreground/80 gba:mt-1">
                When you move content to this space, it will be exclusively owned by the space and removed from your
                personal area.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="gba:flex gba:gap-3 gba:pt-2">
            <Button variant="outline" className="gba:flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              className="gba:flex-1 gba:gap-2 gba:shadow-lg gba:shadow-primary/20"
              onClick={handleMove}
              disabled={!entityId.trim() || isLoading}
              data-testid={`${testId}-move-button`}
            >
              {isLoading ? (
                <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-primary-foreground/30 gba:border-t-primary-foreground gba:rounded-full gba:animate-spin" />
              ) : (
                <FolderInput className="gba:w-4 gba:h-4" />
              )}
              Move to Space
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveContentDialog
