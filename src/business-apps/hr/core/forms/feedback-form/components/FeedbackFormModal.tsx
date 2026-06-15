import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import FeedbackFormComponent from './FeedbackFormComponent'
import { FeedbackFormValues } from '../types'

interface FeedbackFormModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit?: (values: FeedbackFormValues) => Promise<void>
  title?: string
  width?: number
}

const FeedbackFormModal: React.FC<FeedbackFormModalProps> = ({
  visible,
  onCancel,
  title = 'Feedback Form'
}) => {
  const handleCancel = () => {
    onCancel()
  }

  return (
    <Dialog open={visible} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="gba:max-w-3xl" data-testid="feedback-form-modal">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FeedbackFormComponent />
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackFormModal
