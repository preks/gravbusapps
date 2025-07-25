import React from 'react';
import { Modal } from 'antd';
import { FlowWizard } from './FlowWizard';
import { useWizardStore } from '../../hooks/useWizardStore';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

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
  const { isEditMode } = useWizardStore();
  
  const handleComplete = (template: any) => {
    onComplete(template);
    onClose();
  };

  const dialogTitle = isEditMode 
    ? getTranslationFromI18nKeyAndLabel('flow.creator.editWorkflow', 'Edit Workflow Template')
    : getTranslationFromI18nKeyAndLabel('flow.creator.createWorkflow', 'Create Workflow Template');

  return (
    <Modal
      title={dialogTitle}
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