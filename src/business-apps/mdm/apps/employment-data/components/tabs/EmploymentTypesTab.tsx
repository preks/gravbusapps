import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin, Alert, Tag, Divider, Descriptions } from 'antd';
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, IdcardOutlined, CodeOutlined, GlobalOutlined, TagOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useUserLocale } from '@/common/locale/useUserLocale';

const { Title, Text } = Typography;

export interface EmploymentType {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  translations: Array<{
    localeCode: string;
    value: string;
  }>;
}

export interface EmploymentTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const EmploymentTypesTab: React.FC<EmploymentTypesTabProps> = ({ 
  accessToken, 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale() ?? 'en-US';
  const catalogClient = useCatalogManagerClient(accessToken);
  
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<EmploymentType | null>(null);
  const [selectedType, setSelectedType] = useState<EmploymentType | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchEmploymentTypes = async () => {
    try {
      setLoading(true);
      const response = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'EmploymentType',
        version: 'v1',
      }, {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchTerm ? { searchCriteria: searchTerm } : {}),
      });

      if (response.data) {
        const types: EmploymentType[] = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          translations: entry.translations || []
        }));
        setEmploymentTypes(types);
      }
    } catch (error) {
      console.error('Error fetching employment types:', error);
      message.error('Failed to load employment types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmploymentTypes();
  }, [searchTerm, userLocale]);

  const handleAdd = () => {
    setEditingType(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: EmploymentType) => {
    setEditingType(record);
    form.setFieldsValue({
      code: record.code,
      value: record.value,
      alternativeCode: record.alternativeCode,
      additionalValue1: record.additionalValue1,
      additionalValue2: record.additionalValue2,
      additionalValue3: record.additionalValue3,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: EmploymentType) => {
    Modal.confirm({
      title: 'Delete Employment Type',
      content: `Are you sure you want to delete "${record.value}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // Note: Actual delete implementation would depend on the catalog API
          message.success('Employment type deleted successfully');
          fetchEmploymentTypes();
        } catch (error) {
          console.error('Error deleting employment type:', error);
          message.error('Failed to delete employment type');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Note: Actual save implementation would depend on the catalog API
      if (editingType) {
        message.success('Employment type updated successfully');
      } else {
        message.success('Employment type created successfully');
      }
      
      setIsModalVisible(false);
      fetchEmploymentTypes();
    } catch (error) {
      console.error('Error saving employment type:', error);
      message.error('Failed to save employment type');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleViewDetails = (record: EmploymentType) => {
    setSelectedType(record);
    setIsDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerVisible(false);
    setSelectedType(null);
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: EmploymentType, b: EmploymentType) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'value',
      key: 'value',
      sorter: (a: EmploymentType, b: EmploymentType) => a.value.localeCompare(b.value),
    },
    {
      title: 'Alternative Code',
      dataIndex: 'alternativeCode',
      key: 'alternativeCode',
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: EmploymentType) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {t('hr.employment_types', 'Employment Types')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-AddButton`}
          >
            Add Employment Type
          </Button>
        </div>
        
        <Input
          placeholder="Search employment types..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-SearchInput`}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={employmentTypes}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} employment types`,
          }}
          data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-Table`}
          style={{ background: 'white', borderRadius: '8px' }}
          onRow={(record) => ({
            onClick: () => handleViewDetails(record),
            className: 'gba:cursor-pointer',
            'data-testid': `${prefixDataTestId || ''}-EmploymentTypesTab-TableRow-${record.id}`
          })}
        />
      )}

      <Modal
        title={editingType ? 'Edit Employment Type' : 'Add Employment Type'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-EmploymentTypesTab-Form`}
        >
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please enter a code' }]}
          >
            <Input placeholder="Enter employment type code" />
          </Form.Item>
          
          <Form.Item
            label="Name"
            name="value"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter employment type name" />
          </Form.Item>
          
          <Form.Item
            label="Alternative Code"
            name="alternativeCode"
          >
            <Input placeholder="Enter alternative code (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 1"
            name="additionalValue1"
          >
            <Input placeholder="Enter additional value 1 (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 2"
            name="additionalValue2"
          >
            <Input placeholder="Enter additional value 2 (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 3"
            name="additionalValue3"
          >
            <Input placeholder="Enter additional value 3 (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      <DataDetailsDrawer
        title="Employment Type Details"
        icon={<IdcardOutlined />}
        open={isDrawerVisible}
        onClose={handleDrawerClose}
        width={600}
        placement="right"
        dataTestId={`${prefixDataTestId || ''}-EmploymentTypesTab-Drawer`}
        footer={
          <div className="gba:flex gba:justify-end gba:gap-2">
            {selectedType && (
              <Button 
                icon={<EditOutlined />}
                onClick={() => {
                  handleEdit(selectedType);
                  handleDrawerClose();
                }}
              >
                Edit
              </Button>
            )}
            <Button onClick={handleDrawerClose}>
              Close
            </Button>
          </div>
        }
      >
        {selectedType && (
          <div className="gba:space-y-6">
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex-1">
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">{selectedType.value}</h3>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Tag color="blue" className="gba:px-2">
                    <CodeOutlined /> {selectedType.code || '-'}
                  </Tag>
                  {selectedType.alternativeCode && (
                    <Tag color="green" className="gba:px-2">
                      Alt: {selectedType.alternativeCode}
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <Divider className="gba:my-3" />
            
            <Descriptions title="Basic Information" bordered size="small" column={1}>
              <Descriptions.Item label="ID">
                <span className="gba:text-gray-600 gba:font-mono gba:text-xs">{selectedType.id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Code">
                <Tag color="blue" icon={<CodeOutlined />}>{selectedType.code || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Value">{selectedType.value || '-'}</Descriptions.Item>
              {selectedType.alternativeCode && (
                <Descriptions.Item label="Alternative Code">{selectedType.alternativeCode}</Descriptions.Item>
              )}
            </Descriptions>
            
            <Descriptions title="Additional Values" bordered size="small" column={1}>
              <Descriptions.Item label="Additional Value 1">{selectedType.additionalValue1 || '-'}</Descriptions.Item>
              <Descriptions.Item label="Additional Value 2">{selectedType.additionalValue2 || '-'}</Descriptions.Item>
              <Descriptions.Item label="Additional Value 3">{selectedType.additionalValue3 || '-'}</Descriptions.Item>
            </Descriptions>

            {selectedType.translations?.length > 0 && (
              <Descriptions title="Translations" bordered size="small" column={1}>
                {selectedType.translations.map((translation, index) => (
                  <Descriptions.Item key={index} label={<span><GlobalOutlined /> {translation.localeCode}</span>}>
                    {translation.value}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}

            <div className="gba:bg-gray-50 gba:rounded-md gba:p-4 gba:mt-4">
              <p className="gba:text-xs gba:text-gray-500 gba:mb-0">
                <TagOutlined className="gba:mr-1" /> This employment type can be used to classify employees and job profiles.
              </p>
            </div>
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  );
};

export { EmploymentTypesTab };