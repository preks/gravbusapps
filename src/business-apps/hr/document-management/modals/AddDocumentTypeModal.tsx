import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button, Tag, Row, Col, Divider, Tabs } from 'antd';
import type { TabsProps } from 'antd';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

import useDocumentGroups, { DocumentGroup } from '../../hooks/useDocumentGroups'; // Import the new hook
import { BusinessAppContext } from '@/common/BusinessAppContext';
import { useContext } from 'react'; // To use context

interface AddDocumentTypeModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (values: any) => void;
  initialValues?: any;
  isEditing?: boolean;
  // accessToken: string; // Added prop for accessToken, or use context below
}

const fileTypes = [
  { label: 'PDF', value: 'pdf' },
  { label: 'DOC', value: 'doc' },
  { label: 'DOCX', value: 'docx' },
  { label: 'XLS', value: 'xls' },
  { label: 'XLSX', value: 'xlsx' },
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' },
];



const AddDocumentTypeModal: React.FC<AddDocumentTypeModalProps> = ({
  visible,
  onCancel,
  onOk,
  initialValues,
  isEditing = false,
}) => {
  const [form] = Form.useForm();
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const context = useContext(BusinessAppContext);
  if (!context) {
    // This should ideally not happen if the component is used within a provider
    // You might want to throw an error or handle it more gracefully depending on your app's structure
    console.error('BusinessAppContext not found. Ensure AddDocumentTypeModal is wrapped in a BusinessAppContext.Provider.');
    // Depending on requirements, you might return null, a loading indicator, or throw.
    // For now, let's throw an error to make it clear that the provider is missing.
    throw new Error('BusinessAppContext not found');
  }
  const { accessToken } = context;
  const { documentGroups, loading: documentGroupsLoading, error: documentGroupsError } = useDocumentGroups(accessToken || '');

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
      if (initialValues.fileTypes) {
        setSelectedFileTypes(initialValues.fileTypes);
      }

    } else if (visible) {
      form.resetFields();
      setSelectedFileTypes([]);
    }
  }, [visible, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk({
        ...values,
        fileTypes: selectedFileTypes,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const toggleFileType = (fileType: string) => {
    setSelectedFileTypes(prev => 
      prev.includes(fileType)
        ? prev.filter(type => type !== fileType)
        : [...prev, fileType]
    );
  };

  const renderBasicInfoTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Form.Item
          name="name"
          label="Document Type Name"
          rules={[{ required: true, message: 'Please enter document type name' }]}
        >
          <Input placeholder="e.g., Employee Contract" />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please enter a description' }]}
        >
          <TextArea rows={3} placeholder="Enter a brief description of this document type" />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="documentGroup" // This name is used to construct parentEntryId
          label="Module" // Renamed label
          rules={[{ required: true, message: 'Please select a module' }]}
        >
          <Select 
            placeholder="Select module"
            loading={documentGroupsLoading}
            disabled={documentGroupsLoading || !!documentGroupsError}
          >
            {documentGroups.map((group: DocumentGroup) => (
              <Option key={group.id} value={group.code}> 
                {group.value} 
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="gdprRelevant"
          label="GDPR Relevance"
          valuePropName="checked"
          className="mb-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">GDPR Relevant</div>
              <div className="text-xs text-gray-500">This document contains personal data</div>
            </div>
            <Switch className="bg-gray-300" />
          </div>
        </Form.Item>
      </Col>
    </Row>
  );

  const renderFileSettingsTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Form.Item
          name="isActive"
          label="Status"
          valuePropName="checked"
          className="mb-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Active</div>
              <div className="text-xs text-gray-500">Document type will be available for use</div>
            </div>
            <Switch defaultChecked />
          </div>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item label="Allowed File Types" required>
          <div className="flex flex-wrap gap-2">
            {fileTypes.map(type => (
              <Tag.CheckableTag
                key={type.value}
                checked={selectedFileTypes.includes(type.value)}
                onChange={() => toggleFileType(type.value)}
                className="px-3 py-1 border rounded-md"
              >
                {type.label}
              </Tag.CheckableTag>
            ))}
          </div>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="maxSize"
          label="Maximum File Size (MB)"
          rules={[{ required: true, message: 'Please enter maximum file size' }]}
        >
          <Input type="number" min={1} max={100} addonAfter="MB" />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderPermissionsTab = () => (
    <div className="py-4 text-center text-gray-500">
      Permissions configuration will be available soon.
    </div>
  );

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'Basic Info',
      children: renderBasicInfoTab(),
    },
    {
      key: '2',
      label: 'File Settings',
      children: renderFileSettingsTab(),
    },
    {
      key: '3',
      label: 'Permissions',
      children: renderPermissionsTab(),
    },
  ];

  return (
    <Modal
      title={isEditing ? 'Edit Document Type' : 'Add New Document Type'}
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          {isEditing ? 'Update' : 'Create'} Document Type
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: '',
          description: '',
          module: 'hr',
          documentGroup: 'group1',
          isActive: true,
          gdprRelevant: false,
          maxSize: 5,
        }}
      >
        <Tabs defaultActiveKey="1" items={items} />
      </Form>
    </Modal>
  );
};

export default AddDocumentTypeModal;
