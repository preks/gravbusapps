import React from 'react'
import { Modal } from 'antd'
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
  title = 'Feedback Form',
  width = 800
}) => {
  const handleCancel = () => {
    onCancel()
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={width}
      destroyOnHidden={false}
      data-testid="feedback-form-modal"
    >
      <FeedbackFormComponent />
    </Modal>
  )
}

export default FeedbackFormModal
