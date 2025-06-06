'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Card, Table, Tag, Space, Modal, Form, Input, Select, Checkbox } from 'antd';
import type { TableProps, FormProps } from 'antd';
import { DocumentType, Module, Role } from './types';
import useDocumentTypes from '../hooks/useDocumentTypes';

const { Option } = Select;
const { TextArea } = Input;

const modules: Module[] = [
  { id: 'hr', name: 'Human Resources', description: 'Human Resources Department' },
  { id: 'finance', name: 'Finance', description: 'Finance and Accounting' },
  { id: 'it', name: 'IT', description: 'Information Technology' },
  { id: 'operations', name: 'Operations', description: 'Business Operations' },
];

const roles: Role[] = [
  { id: 'admin', name: 'Administrator', description: 'Full system access' },
  { id: 'manager', name: 'Manager', description: 'Department management' },
  { id: 'employee', name: 'Employee', description: 'Standard user access' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access' },
  { id: 'hr_specialist', name: 'HR Specialist', description: 'HR department specialist' },
  { id: 'accountant', name: 'Accountant', description: 'Finance department access' },
];

const fileTypes = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'JPG', 'PNG'];

const DocumentTypes: React.FC = () => {
  const { t } = useTranslation('documentManagement');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [form] = Form.useForm();
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id || '');
  
  const {
    documentTypes,
    loading,
    fetchDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
  } = useDocumentTypes();
  
  // Fetch document types on component mount
  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  // Handle form submission
  const handleSubmit: FormProps['onFinish'] = async (values) => {
    try {
      const documentTypeData = {
        ...values,
        rolePermissions: {
          [selectedRole]: {
            upload: values.upload || false,
            download: values.download || false,
            view: values.view || false,
            edit: values.edit || false,
            delete: values.delete || false,
          },
        },
      };

      if (editingType) {
        // Update existing document type
        await updateDocumentType(editingType.id, documentTypeData);
      } else {
        // Create new document type
        await createDocumentType(documentTypeData);
      }
      
      setIsModalOpen(false);
      form.resetFields();
      setEditingType(null);
    } catch (error) {
      console.error('Error saving document type:', error);
      // Error handling is done in the hook
    }
  };

  const showModal = (type?: DocumentType) => {
    if (type) {
      setEditingType(type);
      form.setFieldsValue({
        ...type,
        role: Object.keys(type.rolePermissions)[0] || roles[0]?.id,
      });
      setSelectedRole(Object.keys(type.rolePermissions)[0] || roles[0]?.id);
    } else {
      setEditingType(null);
      form.resetFields();
      setSelectedRole(roles[0]?.id || '');
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingType(null);
  };

  // Handle delete document type
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('deleteDocumentType'),
      content: t('deleteDocumentTypeConfirmation'),
      okText: t('yes'),
      okType: 'danger',
      cancelText: t('no'),
      onOk: () => deleteDocumentType(id),
    });
  };

  // Handle role change in the form
  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    // If we have an editing type and it has permissions for this role, set them
    if (editingType?.rolePermissions[roleId]) {
      form.setFieldsValue({
        ...editingType.rolePermissions[roleId],
      });
    } else {
      // Reset permissions for new role
      form.setFieldsValue({
        upload: false,
        download: false,
        view: false,
        edit: false,
        delete: false,
      });
    }
  };

  const columns: TableProps<DocumentType>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (moduleId) => {
        const module = modules.find(m => m.id === moduleId);
        return module ? module.name : moduleId;
      },
    },
    {
      title: 'File Types',
      dataIndex: 'fileTypes',
      key: 'fileTypes',
      render: (types: string[]) => (
        <Space size={[0, 8]} wrap>
          {types.slice(0, 3).map((type) => (
            <Tag key={type} color="blue">
              {type}
            </Tag>
          ))}
          {types.length > 3 && <Tag>+{types.length - 3} more</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'GDPR',
      dataIndex: 'gdprRelevant',
      key: 'gdpr',
      render: (gdprRelevant) => (
        <Tag color={gdprRelevant ? 'red' : 'default'}>
          {gdprRelevant ? 'GDPR' : 'Non-GDPR'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            title="Edit"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Document Types</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
        >
          New Document Type
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={documentTypes} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingType ? 'Edit Document Type' : 'Create New Document Type'}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isActive: true,
            gdprRelevant: false,
            securityLevel: 'internal',
            maxSize: 10,
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., Employee Contract" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <TextArea rows={3} placeholder="A brief description of this document type" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="module"
              label="Module"
              rules={[{ required: true, message: 'Please select a module' }]}
            >
              <Select placeholder="Select a module">
                {modules.map((module) => (
                  <Option key={module.id} value={module.id}>
                    {module.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="securityLevel"
              label="Security Level"
              rules={[{ required: true, message: 'Please select a security level' }]}
            >
              <Select>
                <Option value="public">Public</Option>
                <Option value="internal">Internal</Option>
                <Option value="confidential">Confidential</Option>
                <Option value="restricted">Restricted</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="fileTypes"
            label="Allowed File Types"
            rules={[{ required: true, message: 'Please select at least one file type' }]}
          >
            <Select mode="multiple" placeholder="Select allowed file types">
              {fileTypes.map((type) => (
                <Option key={type} value={type}>
                  {type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxSize"
            label="Maximum File Size (MB)"
            rules={[{ required: true, message: 'Please enter a maximum file size' }]}
          >
            <Input type="number" min={1} max={100} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="isActive"
              valuePropName="checked"
              className="mb-0"
            >
              <Checkbox>Active</Checkbox>
            </Form.Item>

            <Form.Item
              name="gdprRelevant"
              valuePropName="checked"
              className="mb-0"
            >
              <Checkbox>GDPR Relevant</Checkbox>
            </Form.Item>
          </div>

          <div className="border-t border-gray-200 my-6 pt-4">
            <h3 className="text-lg font-medium mb-4">Role Permissions</h3>
            
            <Form.Item
              name="role"
              label="Role"
              className="mb-4"
            >
              <Select onChange={handleRoleChange} value={selectedRole}>
                {roles.map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Form.Item name="view" valuePropName="checked">
                <Checkbox>View</Checkbox>
              </Form.Item>
              <Form.Item name="upload" valuePropName="checked">
                <Checkbox>Upload</Checkbox>
              </Form.Item>
              <Form.Item name="download" valuePropName="checked">
                <Checkbox>Download</Checkbox>
              </Form.Item>
              <Form.Item name="edit" valuePropName="checked">
                <Checkbox>Edit</Checkbox>
              </Form.Item>
              <Form.Item name="delete" valuePropName="checked">
                <Checkbox>Delete</Checkbox>
              </Form.Item>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingType ? 'Update' : 'Create'} Document Type
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentTypes;
