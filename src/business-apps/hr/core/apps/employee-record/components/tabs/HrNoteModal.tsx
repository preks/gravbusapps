import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
  Label
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

interface HrNoteModalProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  noteToEdit?: {
    id: string
    notes: string
  } | null
}

export const HrNoteModal: React.FC<HrNoteModalProps> = ({ employeeId, open, onOpenChange, onSuccess, noteToEdit }) => {
  const isEditMode = !!noteToEdit
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  // Set initial content when editing
  React.useEffect(() => {
    if (noteToEdit && open) {
      setContent(noteToEdit.notes || '')
    } else if (open) {
      setContent('')
    }
  }, [noteToEdit, open])

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!content.trim()) {
      console.warn('Cannot submit empty note')
      return
    }

    setLoading(true)
    console.log('Submitting note with payload:', {
      employeeNote: {
        notes: content.trim(),
        employee: employeeId
      }
    })

    try {
      const eventName = isEditMode ? 'updateEmployeeNote' : 'createEmployeeNote'

      const basePayload: any = {
        employeeNote: {
          notes: content.trim(),
          employee: employeeId
        }
      }

      // If editing, include the note ID
      if (isEditMode && noteToEdit) {
        basePayload.employeeNote.id = noteToEdit.id
      }

      await dispatchProcessContinueEvent(eventName, basePayload)
      console.log('Note submitted successfully')

      setContent('')
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl">
        <DialogHeader>
          <DialogTitle data-testid="add-note-modal-title">{isEditMode ? 'Edit Note' : 'Add Note'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Note Content */}
          <div className="gba:space-y-2">
            <Label htmlFor="content" data-testid="content-label">
              Note Content
            </Label>
            <Textarea
              id="content"
              placeholder="Enter your note..."
              value={content}
              onChange={e => setContent(e.target.value)}
              data-testid="content-textarea"
              className="gba:w-full"
              rows={6}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading} data-testid="cancel-button">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !content.trim()} data-testid="add-note-submit-button">
            {loading ? (isEditMode ? 'Updating...' : 'Adding...') : isEditMode ? 'Update Note' : '+ Add Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default HrNoteModal
