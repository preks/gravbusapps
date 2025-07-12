import React from 'react';
import { Modal } from 'antd';
import { FlowWizard } from './FlowWizard';

interface FlowWizardDialogProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (template: any) => void;
  'data-testid'?: string;
}

/**
 * Large dialog wrapper for the FlowWizard component
 */
export const FlowWizardDialog: React.FC<FlowWizardDialogProps> = ({
  visible,
  onClose,
  onComplete,
  'data-testid': testId = 'flow-wizard-dialog'
}) => {
  const handleComplete = (template: any) => {
    onComplete(template);
    onClose();
  };

  return (
    <Modal
      title="Create Workflow Template"
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ maxWidth: '1400px' }}
      bodyStyle={{ padding: 0, margin: 0 }}
      centered
      destroyOnClose
      maskClosable={false}
      data-testid={testId}
      className="gba:flow-wizard-dialog"
      styles={{
        body: { padding: 0, margin: 0 },
        content: { padding: 0 }
      }}
    >
      <div style={{ minHeight: '70vh', maxHeight: '80vh', overflow: 'auto', padding: 0, margin: 0 }}>
        <FlowWizard
          onComplete={handleComplete}
          onCancel={onClose}
          data-testid={`${testId}-wizard`}
        />
      </div>
    </Modal>
  );
}; 