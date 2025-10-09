import React, { useState } from 'react'
import { Modal, message } from 'antd'
import FeedbackFormComponent from './FeedbackFormComponent'
import { useFeedbackForm } from '../context/FeedbackFormContext'
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
  onSubmit = async () => {},
  title = 'Feedback Form',
  width = 800
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleSubmit = async () => {
    setConfirmLoading(true)
    try {
      await onSubmit({} as FeedbackFormValues) // The actual values will come from context
      message.success('Feedback submitted successfully')
      onCancel()
    } catch (error) {
      message.error('Failed to submit feedback')
    } finally {
      setConfirmLoading(false)
    }
  }

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
