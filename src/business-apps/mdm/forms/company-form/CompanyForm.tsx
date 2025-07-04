import React from 'react';
import { Form, Input, Modal } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { Company } from '../../apps/organizational-data/types';

export interface CompanyFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  isVisible: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
  editingCompany: Company | null;
  form: any;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  prefixDataTestId,
  isVisible,
  onCancel,
  onSave,
  editingCompany,
  form
}) => {
  return (
    <Modal
      title={editingCompany ? 'Edit Company' : 'Add Company'}
      open={isVisible}
      onOk={onSave}
      onCancel={onCancel}
      width={600}
      okText="Save"
      cancelText="Cancel"
      data-testid={`${prefixDataTestId || ''}-CompanyForm-Modal`}
    >
      <Form
        form={form}
        layout="vertical"
        className="gba:mt-4"
        data-testid={`${prefixDataTestId || ''}-CompanyForm-Form`}
      >
        <Form.Item
          name="name"
          label="Company Name"
          rules={[{ required: true, message: 'Please enter company name' }]}
        >
          <Input placeholder="e.g., NEWWORK SE, XING GmbH" />
        </Form.Item>
        
        <Form.Item
          name="code"
          label="Company Code"
          rules={[{ required: true, message: 'Please enter company code' }]}
        >
          <Input placeholder="e.g., NWSE, XING" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea 
            placeholder="Describe this company and its business activities"
            rows={3}
          />
        </Form.Item>

        <Form.Item name="parentNodeId" label="Parent Company" hidden>
          <Input disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CompanyForm;
