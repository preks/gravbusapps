import React from 'react'
import { Modal } from 'antd'
import { FlowWizard } from './FlowWizard'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface FlowWizardDialogProps {
  visible: boolean
  onClose: () => void
  onComplete: (template: any) => void
  context?: BusinessAppContextProps
  'data-testid'?: string
}

export const FlowWizardDialog: React.FC<FlowWizardDialogProps> = ({
  visible,
  onClose,
  onComplete,
  context,
  'data-testid': testId = 'flow-wizard-dialog'
}) => {
  const handleComplete = (template: any) => {
    onComplete(template)
    onClose()
  }

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="95vw"
      style={{
        top: 20,
        maxHeight: 'calc(100vh - 40px)',
        padding: 0
      }}
      bodyStyle={{
        padding: 0,
        height: 'calc(100vh - 100px)',
        overflow: 'hidden'
      }}
      closable={false}
      destroyOnClose={true}
      data-testid={testId}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <FlowWizard onComplete={handleComplete} onCancel={onClose} context={context} data-testid={`${testId}-wizard`} />
      </div>
    </Modal>
  )
}
